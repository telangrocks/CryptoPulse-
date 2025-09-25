/**
 * Email Service
 * Handles email sending, templates
 */

class EmailService {
  constructor() {
    this.nodemailer = require('nodemailer');
    this.transporter = this.nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendEmail(to, subject, html, text) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
      text
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(user) {
    const html = `
      <h1>Welcome to CryptoPulse!</h1>
      <p>Hello ${user.firstName},</p>
      <p>Your account has been created successfully.</p>
    `;
    
    return await this.sendEmail(user.email, 'Welcome to CryptoPulse', html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const html = `
      <h1>Password Reset</h1>
      <p>Click the link to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
    `;
    
    return await this.sendEmail(user.email, 'Password Reset', html);
  }
}

module.exports = new EmailService();
