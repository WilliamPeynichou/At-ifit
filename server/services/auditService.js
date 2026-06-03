const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { sanitizeMetadata } = require('../utils/sensitiveData');

function requestMeta(req) {
  if (!req) return {};
  return {
    ip: req.ip || req.headers?.['x-forwarded-for'] || null,
    userAgent: req.get?.('user-agent') || req.headers?.['user-agent'] || null,
  };
}

async function logAuditEvent({ req, userId = null, actorUserId = null, eventType, status = 'success', riskLevel = 'low', category = null, message = null, metadata = {} }) {
  try {
    const meta = requestMeta(req);
    return await AuditLog.create({
      userId,
      actorUserId,
      eventType,
      status,
      riskLevel,
      category,
      message: message ? String(message).slice(0, 500) : null,
      ip: meta.ip,
      userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 500) : null,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    logger.warn('[Audit] log failed', { eventType, error: error.message });
    return null;
  }
}

module.exports = { logAuditEvent };
