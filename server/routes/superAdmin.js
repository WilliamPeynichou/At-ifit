const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const Weight = require('../models/Weight');
const Goal = require('../models/Goal');
const AuditLog = require('../models/AuditLog');
const StravaApiLog = require('../models/StravaApiLog');
const AiUsageLog = require('../models/AiUsageLog');
const auth = require('../middleware/auth');
const { requireSuperAdmin, VALID_ROLES } = require('../middleware/roles');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { logAuditEvent } = require('../services/auditService');
const { sanitizeForSuperAdmin } = require('../utils/sensitiveData');

const router = express.Router();
router.use(auth, requireSuperAdmin);

const clampLimit = value => Math.min(Math.max(parseInt(value || '25', 10) || 25, 1), 100);
const pageOffset = (page, limit) => (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * limit;
const sinceDate = days => new Date(Date.now() - (parseInt(days || '30', 10) || 30) * 86400 * 1000);

function dateFilter(query) {
  const where = {};
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt[Op.gte] = new Date(query.from);
    if (query.to) where.createdAt[Op.lte] = new Date(query.to);
  }
  return where;
}

function userPublicFields() {
  return ['id', 'email', 'pseudo', 'role', 'country', 'age', 'gender', 'height', 'targetWeight', 'consoKcal', 'weeksToGoal', 'imc', 'lastSyncAt', 'fullSyncCompletedAt', 'stravaAthleteId', 'failedLoginAttempts', 'lockedUntil', 'lastLoginAt', 'createdAt', 'updatedAt'];
}

async function paginate(model, where, query, options = {}) {
  const limit = clampLimit(query.limit);
  const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
  const result = await model.findAndCountAll({
    where,
    limit,
    offset: pageOffset(page, limit),
    order: options.order || [['createdAt', 'DESC']],
    attributes: options.attributes,
    include: options.include,
    distinct: true,
  });
  return sanitizeForSuperAdmin({ rows: result.rows, count: result.count, page, limit, totalPages: Math.ceil(result.count / limit) });
}

router.get('/overview', asyncHandler(async (req, res) => {
  await logAuditEvent({ req, userId: req.userId, actorUserId: req.userId, eventType: 'super_admin_access', category: 'super_admin', message: 'Overview accessed' });

  const recentSince = sinceDate(req.query.days || 30);
  const [
    totalUsers,
    stravaConnectedUsers,
    recentlyActiveUsers,
    totalActivities,
    recentStravaCalls,
    recentAiCalls,
    recentErrors,
    latestUsers,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { stravaAthleteId: { [Op.ne]: null } } }),
    User.count({ where: { lastLoginAt: { [Op.gte]: recentSince } } }),
    Activity.count(),
    StravaApiLog.count({ where: { createdAt: { [Op.gte]: recentSince } } }),
    AiUsageLog.count({ where: { createdAt: { [Op.gte]: recentSince } } }),
    AuditLog.findAll({ where: { status: { [Op.in]: ['failure', 'error'] } }, limit: 10, order: [['createdAt', 'DESC']] }),
    User.findAll({ attributes: userPublicFields(), order: [['lastLoginAt', 'DESC']], limit: 10 }),
  ]);

  const [stravaByDay, aiByDay] = await Promise.all([
    StravaApiLog.findAll({ attributes: [[fn('DATE', col('createdAt')), 'day'], [fn('COUNT', col('id')), 'count']], where: { createdAt: { [Op.gte]: recentSince } }, group: [literal('day')], order: [[literal('day'), 'DESC']], limit: 30, raw: true }),
    AiUsageLog.findAll({ attributes: [[fn('DATE', col('createdAt')), 'day'], [fn('COUNT', col('id')), 'count']], where: { createdAt: { [Op.gte]: recentSince } }, group: [literal('day')], order: [[literal('day'), 'DESC']], limit: 30, raw: true }),
  ]);

  sendSuccess(res, sanitizeForSuperAdmin({
    totalUsers,
    stravaConnectedUsers,
    recentlyActiveUsers,
    totalActivities,
    recentStravaCalls,
    recentAiCalls,
    recentErrors,
    latestUsers,
    usage: { stravaByDay, aiByDay },
  }));
}));

router.get('/users', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.strava === 'connected') where.stravaAthleteId = { [Op.ne]: null };
  if (req.query.strava === 'disconnected') where.stravaAthleteId = null;
  if (req.query.search) {
    const term = `%${req.query.search}%`;
    where[Op.or] = [
      { email: { [Op.like]: term } },
      { pseudo: { [Op.like]: term } },
      /^\d+$/.test(req.query.search) ? { id: parseInt(req.query.search, 10) } : null,
      /^\d+$/.test(req.query.search) ? { stravaAthleteId: req.query.search } : null,
    ].filter(Boolean);
  }

  const data = await paginate(User, where, req.query, {
    attributes: userPublicFields(),
    order: [['createdAt', 'DESC']],
  });

  const ids = data.rows.map(u => u.id);
  if (ids.length) {
    const [activityCounts, aiCounts, stravaCounts] = await Promise.all([
      Activity.findAll({ attributes: ['userId', [fn('COUNT', col('id')), 'count']], where: { userId: ids }, group: ['userId'], raw: true }),
      AiUsageLog.findAll({ attributes: ['userId', [fn('COUNT', col('id')), 'count']], where: { userId: ids }, group: ['userId'], raw: true }),
      StravaApiLog.findAll({ attributes: ['userId', [fn('COUNT', col('id')), 'count']], where: { userId: ids }, group: ['userId'], raw: true }),
    ]);
    const mapCount = rows => Object.fromEntries(rows.map(r => [r.userId, parseInt(r.count, 10)]));
    const a = mapCount(activityCounts); const ai = mapCount(aiCounts); const s = mapCount(stravaCounts);
    data.rows = data.rows.map(u => ({ ...u, stravaConnected: !!u.stravaAthleteId, totalActivities: a[u.id] || 0, aiCallCount: ai[u.id] || 0, stravaCallCount: s[u.id] || 0, accountStatus: u.lockedUntil && new Date(u.lockedUntil) > new Date() ? 'locked' : 'active' }));
  }

  sendSuccess(res, sanitizeForSuperAdmin(data));
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, { attributes: userPublicFields() });
  if (!user) return sendError(res, 'User not found', 404);
  const userId = parseInt(req.params.id, 10);
  const [weights, goals, latestActivities, auditLogs, stravaLogs, aiLogs, summary] = await Promise.all([
    Weight.findAll({ where: { userId }, order: [['date', 'DESC']], limit: 20 }),
    Goal.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 20 }),
    Activity.findAll({ where: { userId }, attributes: { exclude: ['raw'] }, order: [['startDate', 'DESC']], limit: 10 }),
    AuditLog.findAll({ where: { [Op.or]: [{ userId }, { actorUserId: userId }] }, order: [['createdAt', 'DESC']], limit: 20 }),
    StravaApiLog.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 20 }),
    AiUsageLog.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 20 }),
    Promise.all([Activity.count({ where: { userId } }), StravaApiLog.count({ where: { userId } }), AiUsageLog.count({ where: { userId } })]),
  ]);
  await logAuditEvent({ req, userId, actorUserId: req.userId, eventType: 'super_admin_user_detail', category: 'super_admin', message: 'User detail accessed' });
  sendSuccess(res, sanitizeForSuperAdmin({ user, weights, goals, latestActivities, auditLogs, stravaLogs, aiLogs, summary: { activities: summary[0], stravaCalls: summary[1], aiCalls: summary[2] } }));
}));

router.get('/users/:id/activities', asyncHandler(async (req, res) => {
  const where = { userId: parseInt(req.params.id, 10) };
  if (req.query.sport) where.type = req.query.sport;
  if (req.query.enriched === 'true') where.detailFetchedAt = { [Op.ne]: null };
  if (req.query.enriched === 'false') where.detailFetchedAt = null;
  if (req.query.search) where.stravaId = req.query.search;
  const data = await paginate(Activity, where, req.query, { attributes: { exclude: ['raw'] }, include: [{ model: ActivityStream, attributes: ['id', 'fetchedAt', 'resolution'], required: false }], order: [['startDate', 'DESC']] });
  sendSuccess(res, sanitizeForSuperAdmin(data));
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const where = dateFilter(req.query);
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.eventType) where.eventType = req.query.eventType;
  if (req.query.status) where.status = req.query.status;
  sendSuccess(res, await paginate(AuditLog, where, req.query));
}));

router.get('/strava-logs', asyncHandler(async (req, res) => {
  const where = dateFilter(req.query);
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.callType) where.callType = req.query.callType;
  if (req.query.status) where.status = req.query.status;
  sendSuccess(res, await paginate(StravaApiLog, where, req.query));
}));

router.get('/ai-logs', asyncHandler(async (req, res) => {
  const where = dateFilter(req.query);
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.usageType) where.usageType = req.query.usageType;
  if (req.query.status) where.status = req.query.status;
  sendSuccess(res, await paginate(AiUsageLog, where, req.query));
}));

router.get('/usage', asyncHandler(async (req, res) => {
  const recentSince = sinceDate(req.query.days || 30);
  const [stravaByType, aiByType, aiByModel, errors] = await Promise.all([
    StravaApiLog.findAll({ attributes: ['callType', [fn('COUNT', col('id')), 'count']], where: { createdAt: { [Op.gte]: recentSince } }, group: ['callType'], raw: true }),
    AiUsageLog.findAll({ attributes: ['usageType', [fn('COUNT', col('id')), 'count']], where: { createdAt: { [Op.gte]: recentSince } }, group: ['usageType'], raw: true }),
    AiUsageLog.findAll({ attributes: ['model', [fn('COUNT', col('id')), 'count']], where: { createdAt: { [Op.gte]: recentSince } }, group: ['model'], raw: true }),
    AuditLog.findAll({ where: { status: { [Op.in]: ['failure', 'error'] }, createdAt: { [Op.gte]: recentSince } }, order: [['createdAt', 'DESC']], limit: 50 }),
  ]);
  sendSuccess(res, sanitizeForSuperAdmin({ stravaByType, aiByType, aiByModel, errors }));
}));

router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const targetRole = req.body.role;
  if (!VALID_ROLES.includes(targetRole)) return sendError(res, 'Invalid role', 400);
  const user = await User.findByPk(req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  const oldRole = user.role || 'user';

  if (user.id === req.userId && oldRole === 'super_admin' && targetRole !== 'super_admin') {
    const superAdminCount = await User.count({ where: { role: 'super_admin' } });
    if (superAdminCount <= 1) return sendError(res, 'Cannot demote the last super admin', 400);
  }

  await user.update({ role: targetRole });
  await logAuditEvent({ req, userId: user.id, actorUserId: req.userId, eventType: 'role_change', riskLevel: 'high', category: 'authorization', message: `Role changed from ${oldRole} to ${targetRole}`, metadata: { targetUserId: user.id, oldRole, newRole: targetRole } });
  sendSuccess(res, sanitizeForSuperAdmin({ user: await User.findByPk(user.id, { attributes: userPublicFields() }) }));
}));

router.post('/diagnostics/:id', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, { attributes: userPublicFields() });
  if (!user) return sendError(res, 'User not found', 404);
  const userId = parseInt(req.params.id, 10);
  const [activityCount, stravaErrors, aiErrors, auditFailures] = await Promise.all([
    Activity.count({ where: { userId } }),
    StravaApiLog.count({ where: { userId, status: { [Op.ne]: 'success' } } }),
    AiUsageLog.count({ where: { userId, status: { [Op.ne]: 'success' } } }),
    AuditLog.count({ where: { userId, status: { [Op.ne]: 'success' } } }),
  ]);
  await logAuditEvent({ req, userId, actorUserId: req.userId, eventType: 'diagnostic_run', category: 'super_admin', message: 'Controlled diagnostic run' });
  sendSuccess(res, sanitizeForSuperAdmin({ user, checks: { stravaConnected: !!user.stravaAthleteId, activityCount, stravaErrors, aiErrors, auditFailures } }));
}));

module.exports = router;
