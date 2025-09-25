/**
 * User Management Service
 * Handles User CRUD, profile management
 */

class UserManagementService {
  constructor() {
    this.db = require('../database/connection');
  }

  async createUser(userData) {
    const { email, password, username, firstName, lastName } = userData;
    const hashedPassword = await this.hashPassword(password);
    
    return await this.db.collection('users').insertOne({
      email,
      password: hashedPassword,
      username,
      firstName,
      lastName,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getUserById(id) {
    return await this.db.collection('users').findOne({ _id: id });
  }

  async updateUser(id, updateData) {
    return await this.db.collection('users').updateOne(
      { _id: id },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  }

  async deleteUser(id) {
    return await this.db.collection('users').deleteOne({ _id: id });
  }

  async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(password, 12);
  }
}

module.exports = new UserManagementService();
