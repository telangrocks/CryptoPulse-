/**
 * Authentication Service
 * Handles JWT, OAuth, MFA management
 */

class AuthenticationService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.tokenExpiry = process.env.TOKEN_EXPIRY || '24h';
  }

  async generateToken(user) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId: user.id, role: user.role }, this.jwtSecret, { expiresIn: this.tokenExpiry });
  }

  async verifyToken(token) {
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, this.jwtSecret);
  }

  async refreshToken(token) {
    const decoded = await this.verifyToken(token);
    return this.generateToken({ id: decoded.userId, role: decoded.role });
  }
}

module.exports = new AuthenticationService();
