/**
 * Authorization Service
 * Handles RBAC, permissions, access control
 */

class AuthorizationService {
  constructor() {
    this.roles = {
      admin: ['read', 'write', 'delete', 'admin'],
      user: ['read', 'write'],
      guest: ['read']
    };
  }

  hasPermission(userRole, permission) {
    return this.roles[userRole]?.includes(permission) || false;
  }

  canAccess(userRole, resource) {
    const permissions = this.roles[userRole] || [];
    return permissions.includes('admin') || permissions.includes('read');
  }

  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!this.hasPermission(req.user.role, requiredRole)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      next();
    };
  }
}

module.exports = new AuthorizationService();
