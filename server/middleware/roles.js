const { sendError } = require('./errorHandler');
const { logAuditEvent } = require('../services/auditService');

const ROLE_ORDER = { user: 1, admin: 2, super_admin: 3 };
const VALID_ROLES = Object.keys(ROLE_ORDER);

function hasRole(user, requiredRole) {
  return (ROLE_ORDER[user?.role || 'user'] || 0) >= (ROLE_ORDER[requiredRole] || Infinity);
}

function requireRole(requiredRole) {
  return async (req, res, next) => {
    if (!hasRole(req.user, requiredRole)) {
      await logAuditEvent({
        req,
        userId: req.userId,
        actorUserId: req.userId,
        eventType: 'sensitive_route_denied',
        status: 'failure',
        riskLevel: 'medium',
        category: 'authorization',
        message: `Access denied: ${requiredRole} required`,
        metadata: { path: req.originalUrl, method: req.method, requiredRole, actualRole: req.user?.role || 'user' },
      });
      return sendError(res, 'Forbidden', 403);
    }
    return next();
  };
}

const requireSuperAdmin = requireRole('super_admin');

module.exports = { ROLE_ORDER, VALID_ROLES, hasRole, requireRole, requireSuperAdmin };
