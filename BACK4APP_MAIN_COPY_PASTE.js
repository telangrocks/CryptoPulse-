// Back4App Cloud Code - Main.js File
// Copy and paste this entire content into your Back4App main.js file

const crypto = require('crypto');
const Parse = require('parse/node');

// Import services
const {
  AuthenticationService,
  AuthorizationService,
  UserManagementService,
  PortfolioService,
  OrderManagementService,
  PositionService,
  HealthCheckService,
  AlertingService,
  ConfigurationService,
  EmailService,
  NotificationService,
  WorkflowService,
  TestDataService,
  MachineLearningService,
  AuditTrailService
} = require('./services');

// Initialize services
const authService = new AuthenticationService();
const userService = new UserManagementService();
const portfolioService = new PortfolioService();
const orderService = new OrderManagementService();
const positionService = new PositionService();
const healthService = new HealthCheckService();
const alertService = new AlertingService();
const configService = new ConfigurationService();
const emailService = new EmailService();
const notificationService = new NotificationService();
const workflowService = new WorkflowService();
const testService = new TestDataService();
const mlService = new MachineLearningService();
const auditService = new AuditTrailService();

// Utility Functions
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendPasswordResetEmail(email, resetToken) {
  // In production, integrate with your email service
  const resetUrl = `https://cryptopulse.app/reset-password?token=${resetToken}`;
  console.log(`Password reset email sent to: ${email}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log(`Reset Token: ${resetToken}`);
  
  // For now, return success (integrate with actual email service)
  return { success: true };
}

// Parse Cloud Functions

// User Registration
Parse.Cloud.define("registerUser", async ({ params, request }) => {
  try {
    const { email, password, username, firstName, lastName } = params;
    
    if (!email || !password || !username) {
      throw new Error("Email, password, and username are required");
    }

    const user = await userService.createUser({
      email,
      password,
      username,
      firstName,
      lastName,
      role: 'user'
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(user);

    // Log registration
    await auditService.logAction(user.id, 'USER_REGISTRATION', 'user', {
      email,
      username,
      ip: request.headers['x-forwarded-for'] || request.ip
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.get('email'),
        username: user.get('username'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        role: user.get('role')
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(`Registration failed: ${error.message}`);
  }
});

// User Login
Parse.Cloud.define("loginUser", async ({ params, request }) => {
  try {
    const { email, password } = params;
    
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await Parse.User.logIn(email, password);
    
    // Generate JWT token
    const token = await authService.generateToken({
      id: user.id,
      role: user.get('role') || 'user'
    });

    // Log login
    await auditService.logAction(user.id, 'USER_LOGIN', 'authentication', {
      email,
      ip: request.headers['x-forwarded-for'] || request.ip,
      userAgent: request.headers['user-agent']
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.get('email'),
        username: user.get('username'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        role: user.get('role')
      },
      token
    };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
});

// Password Reset
Parse.Cloud.define("requestPasswordReset", async ({ params, request }) => {
  try {
    const { email } = params;
    
    if (!email) {
      throw new Error("Email is required");
    }

    const query = new Parse.Query(Parse.User);
    query.equalTo('email', email);
    const user = await query.first();

    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = generateResetToken();
    
    // Store reset token in user object
    user.set('resetToken', resetToken);
    user.set('resetTokenExpiry', new Date(Date.now() + 3600000)); // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    // Log password reset request
    await auditService.logAction(user.id, 'PASSWORD_RESET_REQUEST', 'authentication', {
      email,
      ip: request.headers['x-forwarded-for'] || request.ip
    });

    return { success: true, message: "Password reset email sent" };
  } catch (error) {
    console.error('Password reset error:', error);
    throw new Error(`Password reset failed: ${error.message}`);
  }
});

// API Keys Setup
Parse.Cloud.define("setupApiKeys", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { 
      marketDataKey, 
      marketDataSecret, 
      tradeExecutionKey, 
      tradeExecutionSecret, 
      exchange, 
      masterPassword 
    } = params;

    if (!marketDataKey || !marketDataSecret || !masterPassword) {
      throw new Error("Market data key, secret, and master password are required");
    }

    // Verify master password (implement your verification logic)
    // For now, we'll skip this verification

    const ApiKeys = Parse.Object.extend("ApiKeys");
    const apiKeys = new ApiKeys();
    
    apiKeys.set("userId", user.id);
    apiKeys.set("marketDataKey", marketDataKey);
    apiKeys.set("marketDataSecret", marketDataSecret);
    apiKeys.set("tradeExecutionKey", tradeExecutionKey);
    apiKeys.set("tradeExecutionSecret", tradeExecutionSecret);
    apiKeys.set("exchange", exchange);
    apiKeys.set("isActive", true);
    apiKeys.set("createdAt", new Date());

    await apiKeys.save();

    // Log API key setup
    await auditService.logAction(user.id, 'API_KEYS_SETUP', 'configuration', {
      exchange,
      ip: request.headers['x-forwarded-for'] || request.ip
    });

    return { success: true, message: "API keys configured successfully" };
  } catch (error) {
    console.error('API keys setup error:', error);
    throw new Error(`API keys setup failed: ${error.message}`);
  }
});

// Get Portfolio
Parse.Cloud.define("getPortfolio", async ({ user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const portfolio = await portfolioService.getPortfolio(user.id);
    
    if (!portfolio) {
      return {
        success: true,
        portfolio: {
          assets: [],
          totalValue: 0,
          totalReturn: 0
        }
      };
    }

    return {
      success: true,
      portfolio: {
        assets: portfolio.get('assets') || [],
        totalValue: portfolio.get('totalValue') || 0,
        totalReturn: portfolio.get('totalReturn') || 0
      }
    };
  } catch (error) {
    console.error('Get portfolio error:', error);
    throw new Error(`Failed to get portfolio: ${error.message}`);
  }
});

// Create Order
Parse.Cloud.define("createOrder", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { symbol, side, amount, price, orderType } = params;
    
    if (!symbol || !side || !amount || !price) {
      throw new Error("Symbol, side, amount, and price are required");
    }

    const order = await orderService.createOrder({
      userId: user.id,
      symbol,
      side,
      amount: parseFloat(amount),
      price: parseFloat(price),
      orderType: orderType || 'LIMIT'
    });

    // Log order creation
    await auditService.logAction(user.id, 'ORDER_CREATED', 'trading', {
      symbol,
      side,
      amount,
      price,
      orderId: order.id
    });

    return {
      success: true,
      order: {
        id: order.id,
        symbol,
        side,
        amount,
        price,
        status: 'pending',
        createdAt: order.createdAt
      }
    };
  } catch (error) {
    console.error('Create order error:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
});

// Get Orders
Parse.Cloud.define("getOrders", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { status, limit = 50, skip = 0 } = params;
    
    const orders = await orderService.getOrdersByUser(user.id, { status });
    
    return {
      success: true,
      orders: orders.slice(skip, skip + limit).map(order => ({
        id: order.id,
        symbol: order.get('symbol'),
        side: order.get('side'),
        amount: order.get('amount'),
        price: order.get('price'),
        status: order.get('status'),
        createdAt: order.createdAt
      })),
      total: orders.length
    };
  } catch (error) {
    console.error('Get orders error:', error);
    throw new Error(`Failed to get orders: ${error.message}`);
  }
});

// Health Check
Parse.Cloud.define("healthCheck", async ({ request }) => {
  try {
    const health = await healthService.getOverallHealth();
    
    return {
      success: true,
      health,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// Get Market Data
Parse.Cloud.define("getMarketData", async ({ params, request }) => {
  try {
    const { symbol, interval = '1h', limit = 100 } = params;
    
    if (!symbol) {
      throw new Error("Symbol is required");
    }

    // Mock market data (replace with actual API integration)
    const mockData = Array.from({ length: limit }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      open: 50000 + Math.random() * 1000,
      high: 51000 + Math.random() * 1000,
      low: 49000 + Math.random() * 1000,
      close: 50000 + Math.random() * 1000,
      volume: Math.random() * 1000000
    }));

    return {
      success: true,
      symbol,
      interval,
      data: mockData
    };
  } catch (error) {
    console.error('Get market data error:', error);
    throw new Error(`Failed to get market data: ${error.message}`);
  }
});

// Trading Signals
Parse.Cloud.define("getTradingSignals", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { symbol } = params;
    
    if (!symbol) {
      throw new Error("Symbol is required");
    }

    // Mock trading signals (replace with actual ML prediction)
    const signals = await mlService.predict('trading_model', { symbol });
    
    return {
      success: true,
      symbol,
      signals: [{
        type: signals.prediction,
        confidence: signals.confidence,
        timestamp: signals.timestamp,
        price: 50000 + Math.random() * 1000
      }]
    };
  } catch (error) {
    console.error('Get trading signals error:', error);
    throw new Error(`Failed to get trading signals: ${error.message}`);
  }
});

// Send Notification
Parse.Cloud.define("sendNotification", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { type, message, metadata } = params;
    
    if (!type || !message) {
      throw new Error("Type and message are required");
    }

    const notification = await notificationService.sendNotification(
      user.id,
      type,
      message,
      metadata
    );

    return {
      success: true,
      notification: {
        id: notification.id,
        type,
        message,
        status: 'sent'
      }
    };
  } catch (error) {
    console.error('Send notification error:', error);
    throw new Error(`Failed to send notification: ${error.message}`);
  }
});

// Create Alert
Parse.Cloud.define("createAlert", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { type, severity, message, metadata } = params;
    
    if (!type || !severity || !message) {
      throw new Error("Type, severity, and message are required");
    }

    const alert = await alertService.createAlert(type, severity, message, metadata);

    return {
      success: true,
      alert: {
        id: alert.id,
        type,
        severity,
        message,
        status: 'active'
      }
    };
  } catch (error) {
    console.error('Create alert error:', error);
    throw new Error(`Failed to create alert: ${error.message}`);
  }
});

// Get User Profile
Parse.Cloud.define("getUserProfile", async ({ user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.get('email'),
        username: user.get('username'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        role: user.get('role'),
        createdAt: user.createdAt
      }
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
});

// Update User Profile
Parse.Cloud.define("updateUserProfile", async ({ params, user, request }) => {
  try {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { firstName, lastName, username } = params;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (username) updateData.username = username;

    const updatedUser = await userService.updateUser(user.id, updateData);

    // Log profile update
    await auditService.logAction(user.id, 'PROFILE_UPDATE', 'user', {
      updatedFields: Object.keys(updateData),
      ip: request.headers['x-forwarded-for'] || request.ip
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.get('email'),
        username: updatedUser.get('username'),
        firstName: updatedUser.get('firstName'),
        lastName: updatedUser.get('lastName'),
        role: updatedUser.get('role')
      }
    };
  } catch (error) {
    console.error('Update user profile error:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
});

// Error handling middleware
Parse.Cloud.beforeSave(Parse.User, async (request) => {
  const user = request.object;
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (user.get('email') && !emailRegex.test(user.get('email'))) {
    throw new Error('Invalid email format');
  }
  
  // Validate password strength
  if (user.get('password') && user.get('password').length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
});

// After save hooks
Parse.Cloud.afterSave(Parse.User, async (request) => {
  const user = request.object;
  
  // Log user creation
  await auditService.logAction(user.id, 'USER_CREATED', 'user', {
    email: user.get('email'),
    username: user.get('username')
  });
});

// Global error handler
Parse.Cloud.onError((error, request) => {
  console.error('Parse Cloud Error:', error);
  
  // Log error
  if (request.user) {
    auditService.logAction(request.user.id, 'ERROR', 'system', {
      error: error.message,
      stack: error.stack,
      function: request.function
    });
  }
});

console.log('CryptoPulse Cloud Functions loaded successfully!');
