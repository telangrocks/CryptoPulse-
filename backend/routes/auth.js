const express = require('express');
const router = express.Router();
const { structuredLogger } = require('../structuredLogger');
const { monitoring } = require('../monitoring');
const { errorHandler } = require('../errorHandler');
const { secureSessionManager } = require('../secureSessionManager');
const { auditLogger } = require('../auditLogger');
const { complianceManager } = require('../complianceManager');

/**
 * User Registration
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username, firstName, lastName, country, phone } = req.body;
    
    // Validate input
    if (!email || !password || !username) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email, password, and username are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid email format'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await checkUserExists(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User Exists',
        message: 'User with this email already exists'
      });
    }
    
    // Create user
    const user = await createUser({
      email,
      password,
      username,
      firstName,
      lastName,
      country,
      phone
    });
    
    // Record audit log
    await auditLogger.logUserRegistration({
      userId: user.id,
      email: user.email,
      username: user.username,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Record metrics
    monitoring.recordAuthAttempt('register', true);
    
    structuredLogger.info('User registered successfully', { userId: user.id, email: user.email });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * User Login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }
    
    // Authenticate user
    const user = await authenticateUser(email, password);
    if (!user) {
      // Record failed login attempt
      await auditLogger.logUserLogin({
        email,
        success: false,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Invalid credentials'
      });
      
      monitoring.recordAuthAttempt('login', false);
      
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }
    
    // Create session
    const session = await secureSessionManager.createSession({
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      rememberMe: rememberMe || false
    });
    
    // Set session cookie
    secureSessionManager.setSessionCookie(res, session.sessionId, {
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Record successful login
    await auditLogger.logUserLogin({
      userId: user.id,
      email: user.email,
      success: true,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    monitoring.recordAuthAttempt('login', true);
    
    structuredLogger.info('User logged in successfully', { userId: user.id, email: user.email });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLogin: user.lastLogin
      },
      sessionId: session.sessionId
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * User Logout
 */
router.post('/logout', async (req, res, next) => {
  try {
    const sessionId = req.session?.sessionId;
    
    if (sessionId) {
      await secureSessionManager.destroySession(sessionId);
      
      // Record logout
      await auditLogger.logUserLogout({
        sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Clear session cookie
    secureSessionManager.clearSessionCookie(res);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get Current User
 */
router.get('/me', async (req, res, next) => {
  try {
    const sessionId = req.session?.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No active session'
      });
    }
    
    const session = await secureSessionManager.validateSession(sessionId);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session'
      });
    }
    
    const user = await getUserById(session.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        phone: user.phone,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Change Password
 */
router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const sessionId = req.session?.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No active session'
      });
    }
    
    const session = await secureSessionManager.validateSession(sessionId);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session'
      });
    }
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 8 characters long'
      });
    }
    
    // Verify current password
    const user = await getUserById(session.userId);
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    const hashedNewPassword = await hashPassword(newPassword);
    await updateUserPassword(session.userId, hashedNewPassword);
    
    // Record audit log
    await auditLogger.logSecurityEvent({
      userId: session.userId,
      event: 'password_changed',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    structuredLogger.info('User password changed', { userId: session.userId });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Request Password Reset
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email is required'
      });
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = await generatePasswordResetToken(user.id);
    
    // Send reset email (implement email service)
    await sendPasswordResetEmail(user.email, resetToken);
    
    // Record audit log
    await auditLogger.logSecurityEvent({
      userId: user.id,
      event: 'password_reset_requested',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    structuredLogger.info('Password reset requested', { userId: user.id, email: user.email });
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Reset Password
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Token and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 8 characters long'
      });
    }
    
    // Validate reset token
    const userId = await validatePasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({
        error: 'Invalid Token',
        message: 'Invalid or expired reset token'
      });
    }
    
    // Update password
    const hashedPassword = await hashPassword(newPassword);
    await updateUserPassword(userId, hashedPassword);
    
    // Invalidate reset token
    await invalidatePasswordResetToken(token);
    
    // Record audit log
    await auditLogger.logSecurityEvent({
      userId,
      event: 'password_reset_completed',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    structuredLogger.info('Password reset completed', { userId });
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Helper functions (implement these based on your database/ORM)
async function checkUserExists(email) {
  // Implement user existence check
  return false;
}

async function createUser(userData) {
  // Implement user creation
  return {
    id: 'user_' + Date.now(),
    ...userData,
    createdAt: new Date(),
    isVerified: false,
    kycStatus: 'pending'
  };
}

async function authenticateUser(email, password) {
  // Implement user authentication
  return null;
}

async function getUserById(userId) {
  // Implement get user by ID
  return null;
}

async function getUserByEmail(email) {
  // Implement get user by email
  return null;
}

async function verifyPassword(password, hashedPassword) {
  // Implement password verification
  return false;
}

async function hashPassword(password) {
  // Implement password hashing
  return password;
}

async function updateUserPassword(userId, hashedPassword) {
  // Implement password update
  return true;
}

async function generatePasswordResetToken(userId) {
  // Implement reset token generation
  return 'reset_token_' + Date.now();
}

async function validatePasswordResetToken(token) {
  // Implement token validation
  return null;
}

async function invalidatePasswordResetToken(token) {
  // Implement token invalidation
  return true;
}

async function sendPasswordResetEmail(email, token) {
  // Implement email sending
  return true;
}

module.exports = router;
