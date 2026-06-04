const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../database');
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const Weight = require('../models/Weight');
const Goal = require('../models/Goal');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');
const StravaApiLog = require('../models/StravaApiLog');
const AiUsageLog = require('../models/AiUsageLog');
const auth = require('../middleware/auth');
const { requireSuperAdmin, VALID_ROLES } = require('../middleware/roles');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { logAuditEvent } = require('../services/auditService');
const { sanitizeForSuperAdmin } = require('../utils/sensitiveData');
const { syncUserActivities, syncSince, enrichUserActivities, getSyncStatus } = require('../services/stravaSync');
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
  return ['id', 'email', 'pseudo', 'role', 'country', 'age', 'gender', 'height', 'targetWeight', 'consoKcal', 'weeksToGoal', 'imc', 'restHeartrate', 'bikeType', 'cyclingGoal', 'lastSyncAt', 'fullSyncCompletedAt', 'stravaAthleteId', 'stravaExpiresAt', 'failedLoginAttempts', 'lockedUntil', 'lastLoginAt', 'createdAt', 'updatedAt'];
}

const RESOURCE_CONFIG = {
  users: {
    model: User,
    attributes: userPublicFields,
    order: [['createdAt', 'DESC']],
    listWhere: query => {
      const where = {};
      if (query.role) where.role = query.role;
      if (query.strava === 'connected') where.stravaAthleteId = { [Op.ne]: null };
      if (query.strava === 'disconnected') where.stravaAthleteId = null;
      if (query.search) {
        const term = `%${query.search}%`;
        where[Op.or] = [
          { email: { [Op.like]: term } },
          { pseudo: { [Op.like]: term } },
          /^\d+$/.test(query.search) ? { id: parseInt(query.search, 10) } : null,
          /^\d+$/.test(query.search) ? { stravaAthleteId: query.search } : null,
        ].filter(Boolean);
      }
      return where;
    },
    writable: ['email', 'password', 'pseudo', 'role', 'country', 'age', 'gender', 'height', 'targetWeight', 'restHeartrate', 'bikeType', 'cyclingGoal'],
    requiredOnCreate: ['email', 'password'],
  },
  weights: {
    model: Weight,
    order: [['date', 'DESC']],
    listWhere: query => ({ ...(query.userId ? { userId: parseInt(query.userId, 10) } : {}), ...dateFilter({ from: query.from, to: query.to }) }),
    writable: ['userId', 'weight', 'date'],
    requiredOnCreate: ['userId', 'weight'],
  },
  goals: {
    model: Goal,
    order: [['createdAt', 'DESC']],
    listWhere: query => ({
      ...(query.userId ? { userId: parseInt(query.userId, 10) } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.sportType ? { sportType: query.sportType } : {}),
      ...(query.active !== undefined ? { active: query.active === 'true' } : {}),
    }),
    writable: ['userId', 'type', 'sportType', 'targetValue', 'period', 'active'],
    requiredOnCreate: ['userId', 'type', 'targetValue', 'period'],
  },
  activities: {
    model: Activity,
    attributes: { exclude: ['raw'] },
    order: [['startDate', 'DESC']],
    listWhere: query => {
      const where = {};
      if (query.userId) where.userId = parseInt(query.userId, 10);
      if (query.sport) where.type = query.sport;
      if (query.stravaId) where.stravaId = query.stravaId;
      if (query.enriched === 'true') where.detailFetchedAt = { [Op.ne]: null };
      if (query.enriched === 'false') where.detailFetchedAt = null;
      if (query.streams === 'true') where.streamFetchedAt = { [Op.ne]: null };
      if (query.streams === 'false') where.streamFetchedAt = null;
      Object.assign(where, dateFilter({ from: query.from, to: query.to }));
      return where;
    },
    writable: ['userId', 'stravaId', 'type', 'name', 'distance', 'movingTime', 'elapsedTime', 'totalElevationGain', 'averageSpeed', 'maxSpeed', 'averageHeartrate', 'maxHeartrate', 'hasHeartrate', 'calories', 'kilojoules', 'sufferScore', 'averageWatts', 'maxWatts', 'weightedAverageWatts', 'deviceWatts', 'averageCadence', 'averageTemp', 'startDate', 'commute', 'trainer', 'gearId', 'workoutType', 'athleteCount', 'kudosCount', 'prCount', 'achievementCount', 'summaryPolyline', 'startLatlng', 'endLatlng', 'locationCity', 'locationCountry', 'deviceName', 'bestEfforts', 'splitsMetric', 'laps', 'detailFetchedAt', 'streamFetchedAt'],
    requiredOnCreate: ['userId', 'stravaId', 'type', 'startDate'],
  },
  'activity-streams': {
    model: ActivityStream,
    order: [['createdAt', 'DESC']],
    listWhere: query => ({
      ...(query.activityId ? { activityId: parseInt(query.activityId, 10) } : {}),
      ...(query.stravaId ? { stravaId: query.stravaId } : {}),
    }),
    include: query => query.userId ? [{ model: Activity, attributes: ['id', 'userId', 'stravaId', 'name', 'type', 'startDate'], where: { userId: parseInt(query.userId, 10) }, required: true }] : undefined,
    writable: ['activityId', 'stravaId', 'time', 'distance', 'heartrate', 'watts', 'cadence', 'velocitySmooth', 'altitude', 'latlng', 'gradeSmooth', 'temp', 'moving', 'resolution', 'fetchedAt'],
    requiredOnCreate: ['activityId', 'stravaId'],
  },
};

function pickAllowed(source = {}, allowed = []) {
  return allowed.reduce((payload, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) payload[key] = source[key];
    return payload;
  }, {});
}

function requireFields(payload, required = []) {
  return required.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === '');
}

async function assertCanChangeRole(targetUser, targetRole, actorId) {
  const oldRole = targetUser.role || 'user';
  if (targetUser.id === actorId && oldRole === 'super_admin' && targetRole !== 'super_admin') {
    const superAdminCount = await User.count({ where: { role: 'super_admin' } });
    if (superAdminCount <= 1) {
      const error = new Error('Cannot demote the last super admin');
      error.statusCode = 400;
      throw error;
    }
  }
}

async function auditSuperAdmin(req, { userId = null, eventType, riskLevel = 'high', category = 'super_admin', message, metadata = {}, status = 'success' }) {
  return logAuditEvent({ req, userId, actorUserId: req.userId, eventType, riskLevel, category, message, metadata, status });
}

async function paginate(model, where, query, options = {}) {
  const limit = clampLimit(query.limit);
  const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
  const result = await model.findAndCountAll({
    where,
    limit,
    offset: pageOffset(page, limit),
    order: options.order || [['createdAt', 'DESC']],
    attributes: typeof options.attributes === 'function' ? options.attributes() : options.attributes,
    include: typeof options.include === 'function' ? options.include(query) : options.include,
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

router.get('/resources/:resource', asyncHandler(async (req, res) => {
  const config = RESOURCE_CONFIG[req.params.resource];
  if (!config) return sendError(res, 'Unsupported resource', 404);
  const data = await paginate(config.model, config.listWhere ? config.listWhere(req.query) : {}, req.query, config);
  sendSuccess(res, sanitizeForSuperAdmin({ resource: req.params.resource, ...data }));
}));

router.get('/resources/:resource/:id', asyncHandler(async (req, res) => {
  const config = RESOURCE_CONFIG[req.params.resource];
  if (!config) return sendError(res, 'Unsupported resource', 404);
  const item = await config.model.findByPk(req.params.id, {
    attributes: typeof config.attributes === 'function' ? config.attributes() : config.attributes,
    include: typeof config.include === 'function' ? config.include(req.query) : config.include,
  });
  if (!item) return sendError(res, 'Resource not found', 404);
  await auditSuperAdmin(req, {
    userId: item.userId || (req.params.resource === 'users' ? item.id : null),
    eventType: 'super_admin_resource_detail',
    riskLevel: 'medium',
    message: 'Resource detail accessed',
    metadata: { resource: req.params.resource, resourceId: item.id },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ resource: req.params.resource, item }));
}));

router.post('/resources/:resource', asyncHandler(async (req, res) => {
  const config = RESOURCE_CONFIG[req.params.resource];
  if (!config) return sendError(res, 'Unsupported resource', 404);
  const payload = pickAllowed(req.body, config.writable);
  const missing = requireFields(payload, config.requiredOnCreate);
  if (missing.length) return sendError(res, `Missing required fields: ${missing.join(', ')}`, 400);

  if (req.params.resource === 'users' && payload.role) {
    if (!VALID_ROLES.includes(payload.role)) return sendError(res, 'Invalid role', 400);
  }

  const item = await config.model.create(payload);
  await auditSuperAdmin(req, {
    userId: item.userId || (req.params.resource === 'users' ? item.id : null),
    eventType: 'super_admin_resource_create',
    riskLevel: req.params.resource === 'users' ? 'high' : 'medium',
    message: 'Resource created by super admin',
    metadata: { resource: req.params.resource, resourceId: item.id, fields: Object.keys(payload) },
  });

  const created = await config.model.findByPk(item.id, { attributes: typeof config.attributes === 'function' ? config.attributes() : config.attributes });
  sendSuccess(res, sanitizeForSuperAdmin({ resource: req.params.resource, item: created }), 'Created', 201);
}));

router.patch('/resources/:resource/:id', asyncHandler(async (req, res) => {
  const config = RESOURCE_CONFIG[req.params.resource];
  if (!config) return sendError(res, 'Unsupported resource', 404);
  const item = await config.model.findByPk(req.params.id);
  if (!item) return sendError(res, 'Resource not found', 404);

  const payload = pickAllowed(req.body, config.writable);
  if (Object.keys(payload).length === 0) return sendError(res, 'No writable fields provided', 400);

  if (req.params.resource === 'users' && payload.role) {
    if (!VALID_ROLES.includes(payload.role)) return sendError(res, 'Invalid role', 400);
    await assertCanChangeRole(item, payload.role, req.userId);
  }

  const before = sanitizeForSuperAdmin(item);
  await item.update(payload);
  await auditSuperAdmin(req, {
    userId: item.userId || (req.params.resource === 'users' ? item.id : null),
    eventType: req.params.resource === 'users' && payload.role ? 'role_change' : 'super_admin_resource_update',
    riskLevel: req.params.resource === 'users' || payload.role ? 'high' : 'medium',
    category: payload.role ? 'authorization' : 'super_admin',
    message: 'Resource updated by super admin',
    metadata: { resource: req.params.resource, resourceId: item.id, fields: Object.keys(payload), before },
  });

  const updated = await config.model.findByPk(item.id, { attributes: typeof config.attributes === 'function' ? config.attributes() : config.attributes });
  sendSuccess(res, sanitizeForSuperAdmin({ resource: req.params.resource, item: updated }));
}));

router.delete('/resources/:resource/:id', asyncHandler(async (req, res) => {
  const config = RESOURCE_CONFIG[req.params.resource];
  if (!config) return sendError(res, 'Unsupported resource', 404);
  if (req.params.resource === 'users') return sendError(res, 'Use /users/:id for destructive user deletion', 400);
  const item = await config.model.findByPk(req.params.id);
  if (!item) return sendError(res, 'Resource not found', 404);
  const metadata = sanitizeForSuperAdmin({ resource: req.params.resource, resourceId: item.id, snapshot: item });
  await item.destroy();
  await auditSuperAdmin(req, {
    userId: item.userId || null,
    eventType: 'super_admin_resource_delete',
    riskLevel: 'critical',
    message: 'Resource permanently deleted by super admin',
    metadata,
  });
  sendSuccess(res, { success: true, deleted: true, resource: req.params.resource, id: parseInt(req.params.id, 10) });
}));

async function deleteUserData(userId, categories, transaction) {
  const allCategories = ['weights', 'goals', 'activities', 'refreshTokens'];
  const selected = categories && categories.length ? categories : allCategories;
  const counts = {};

  if (selected.includes('activities')) {
    const activities = await Activity.findAll({ where: { userId }, attributes: ['id'], transaction });
    const activityIds = activities.map(a => a.id);
    counts.activityStreams = activityIds.length ? await ActivityStream.destroy({ where: { activityId: activityIds }, transaction }) : 0;
    counts.activities = await Activity.destroy({ where: { userId }, transaction });
  }
  if (selected.includes('weights')) counts.weights = await Weight.destroy({ where: { userId }, transaction });
  if (selected.includes('goals')) counts.goals = await Goal.destroy({ where: { userId }, transaction });
  if (selected.includes('refreshTokens')) counts.refreshTokens = await RefreshToken.destroy({ where: { userId }, transaction });

  return { categories: selected, counts };
}

router.delete('/users/:id/data', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId, { attributes: userPublicFields() });
  if (!user) return sendError(res, 'User not found', 404);
  const allowedCategories = ['weights', 'goals', 'activities', 'refreshTokens'];
  const categories = Array.isArray(req.body?.categories) ? req.body.categories.filter(c => allowedCategories.includes(c)) : [];
  if (Array.isArray(req.body?.categories) && categories.length !== req.body.categories.length) return sendError(res, 'Invalid data category', 400);

  const result = await sequelize.transaction(transaction => deleteUserData(userId, categories, transaction));
  await auditSuperAdmin(req, {
    userId,
    eventType: 'user_data_delete',
    riskLevel: 'critical',
    message: 'User associated data deleted by super admin',
    metadata: result,
  });
  sendSuccess(res, sanitizeForSuperAdmin({ success: true, userId, ...result }));
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (user.id === req.userId) return sendError(res, 'Super admin cannot delete their own account', 400);
  if (user.role === 'super_admin') {
    const superAdminCount = await User.count({ where: { role: 'super_admin' } });
    if (superAdminCount <= 1) return sendError(res, 'Cannot delete the last super admin', 400);
  }

  const snapshot = sanitizeForSuperAdmin(user);
  const result = await sequelize.transaction(async transaction => {
    const dataDeletion = await deleteUserData(userId, [], transaction);
    await AuditLog.update({ userId: null }, { where: { userId }, transaction });
    await AuditLog.update({ actorUserId: null }, { where: { actorUserId: userId }, transaction });
    await User.destroy({ where: { id: userId }, transaction });
    return dataDeletion;
  });

  await auditSuperAdmin(req, {
    userId: null,
    eventType: 'user_delete',
    riskLevel: 'critical',
    message: 'User permanently deleted by super admin',
    metadata: { targetUserId: userId, deletedUser: snapshot, dataDeletion: result },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ success: true, deleted: true, userId, dataDeletion: result }));
}));

router.patch('/users/:id/lock', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  if (user.id === req.userId) return sendError(res, 'Super admin cannot lock their own account', 400);
  const locked = req.body.locked !== false;
  const lockedUntil = locked ? new Date(req.body.lockedUntil || Date.now() + 365 * 86400 * 1000) : null;
  await user.update({ lockedUntil, failedLoginAttempts: locked ? user.failedLoginAttempts : 0 });
  await auditSuperAdmin(req, {
    userId: user.id,
    eventType: locked ? 'user_lock' : 'user_unlock',
    riskLevel: 'high',
    category: 'authorization',
    message: locked ? 'User account locked by super admin' : 'User account unlocked by super admin',
    metadata: { lockedUntil },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ user: await User.findByPk(user.id, { attributes: userPublicFields() }) }));
}));

router.post('/users/:id/strava/disconnect', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  await user.update({ stravaAccessToken: null, stravaRefreshToken: null, stravaExpiresAt: null, stravaAthleteId: null });
  await auditSuperAdmin(req, {
    userId: user.id,
    eventType: 'strava_disconnect_for_user',
    riskLevel: 'high',
    category: 'strava',
    message: 'Strava disconnected for user by super admin',
    metadata: { targetUserId: user.id },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ user: await User.findByPk(user.id, { attributes: userPublicFields() }), stravaConnected: false }));
}));

router.post('/users/:id/strava/reset', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId);
  if (!user) return sendError(res, 'User not found', 404);
  const result = await sequelize.transaction(async transaction => {
    const activities = await Activity.findAll({ where: { userId }, attributes: ['id'], transaction });
    const activityIds = activities.map(a => a.id);
    const activityStreams = activityIds.length ? await ActivityStream.destroy({ where: { activityId: activityIds }, transaction }) : 0;
    const activitiesDeleted = await Activity.destroy({ where: { userId }, transaction });
    await User.update({ lastSyncAt: null, fullSyncCompletedAt: null }, { where: { id: userId }, transaction });
    return { activityStreams, activities: activitiesDeleted };
  });
  await auditSuperAdmin(req, {
    userId,
    eventType: 'strava_local_reset',
    riskLevel: 'critical',
    category: 'strava',
    message: 'Local Strava data reset by super admin',
    metadata: result,
  });
  sendSuccess(res, sanitizeForSuperAdmin({ success: true, userId, ...result }));
}));

router.post('/users/:id/strava/reconnect-required', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  await user.update({ stravaAccessToken: null, stravaRefreshToken: null, stravaExpiresAt: null });
  await auditSuperAdmin(req, {
    userId: user.id,
    eventType: 'strava_reconnect_required',
    riskLevel: 'high',
    category: 'strava',
    message: 'User marked as requiring Strava reconnection',
    metadata: { reason: req.body?.reason || 'super_admin_request' },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ success: true, user: await User.findByPk(user.id, { attributes: userPublicFields() }), recommendation: 'reconnect_strava' }));
}));

router.get('/users/:id/strava/diagnostic', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId, { attributes: [...userPublicFields(), 'stravaAccessToken', 'stravaRefreshToken'] });
  if (!user) return sendError(res, 'User not found', 404);

  const [totalActivities, withDetail, withStreams, lastCalls, lastErrors] = await Promise.all([
    Activity.count({ where: { userId } }),
    Activity.count({ where: { userId, detailFetchedAt: { [Op.ne]: null } } }),
    Activity.count({ where: { userId, streamFetchedAt: { [Op.ne]: null } } }),
    StravaApiLog.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 10 }),
    StravaApiLog.findAll({ where: { userId, status: { [Op.ne]: 'success' } }, order: [['createdAt', 'DESC']], limit: 10 }),
  ]);

  const sync = getSyncStatus(userId);
  const hasAthlete = !!user.stravaAthleteId;
  const hasTokens = !!(user.stravaAccessToken && user.stravaRefreshToken);
  const tokenStatus = !hasAthlete
    ? 'not_connected'
    : (!hasTokens || sync.authRequired || lastErrors.some(e => e.errorMessage === 'STRAVA_TOKEN_REVOKED' || e.httpStatus === 401) ? 'reconnect_required' : 'present');
  const recommendation = tokenStatus === 'reconnect_required'
    ? 'reconnect_strava'
    : (sync.inProgress ? 'wait' : (totalActivities === 0 ? 'sync_full' : (withDetail < totalActivities || withStreams < totalActivities ? 'enrich' : 'ok')));

  await auditSuperAdmin(req, {
    userId,
    eventType: 'strava_diagnostic_access',
    riskLevel: 'medium',
    category: 'strava',
    message: 'Strava diagnostic accessed',
    metadata: { targetUserId: userId, recommendation },
  });

  sendSuccess(res, sanitizeForSuperAdmin({
    user,
    connection: { connected: hasAthlete && hasTokens, athleteId: user.stravaAthleteId || null, tokenStatus, hasAccessToken: hasTokens ? 'present' : 'missing', hasRefreshToken: hasTokens ? 'present' : 'missing' },
    sync: { lastSyncAt: user.lastSyncAt, fullSyncCompletedAt: user.fullSyncCompletedAt, current: { ...sync, authRequired: Boolean(sync.authRequired || tokenStatus === 'reconnect_required') } },
    counts: { totalActivities, withDetail, withStreams },
    recentCalls: lastCalls,
    recentErrors: lastErrors,
    recommendation,
  }));
}));

router.get('/users/:id/strava/status', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId, { attributes: ['id'] });
  if (!user) return sendError(res, 'User not found', 404);
  sendSuccess(res, sanitizeForSuperAdmin({ userId, sync: getSyncStatus(userId) }));
}));

router.post('/users/:id/strava/actions/:action', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId, { attributes: userPublicFields() });
  if (!user) return sendError(res, 'User not found', 404);
  const maxCount = Math.min(Math.max(parseInt(req.body?.limit || '100', 10) || 100, 1), 500);
  let result;
  switch (req.params.action) {
    case 'sync-recent':
      result = await syncSince(userId, user.lastSyncAt ? Math.floor(new Date(user.lastSyncAt).getTime() / 1000) : undefined, { enrich: req.body?.enrich !== false });
      break;
    case 'sync-full':
      result = await syncUserActivities(userId, { enrich: req.body?.enrich !== false, mode: 'super_admin_full' });
      break;
    case 'enrich-details':
    case 'enrich-streams':
    case 'repair-incomplete':
      result = await enrichUserActivities(userId, { maxCount, force: req.body?.force === true || req.params.action === 'repair-incomplete' });
      break;
    default:
      return sendError(res, 'Unsupported Strava action', 400);
  }
  await auditSuperAdmin(req, {
    userId,
    eventType: 'strava_super_admin_action',
    riskLevel: 'high',
    category: 'strava',
    message: `Super admin Strava action: ${req.params.action}`,
    metadata: { action: req.params.action, result },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ action: req.params.action, userId, result }));
}));

router.post('/strava/actions/:action', asyncHandler(async (req, res) => {
  const action = req.params.action;
  const limit = Math.min(Math.max(parseInt(req.body?.limit || '10', 10) || 10, 1), 50);
  const userWhere = { stravaAthleteId: { [Op.ne]: null } };
  if (action === 'sync-stale') {
    userWhere[Op.or] = [{ lastSyncAt: null }, { lastSyncAt: { [Op.lt]: sinceDate(req.body?.staleDays || 7) } }];
  }
  if (action === 'sync-errors') {
    const errorRows = await StravaApiLog.findAll({ attributes: ['userId'], where: { status: { [Op.ne]: 'success' }, userId: { [Op.ne]: null } }, group: ['userId'], limit, raw: true });
    userWhere.id = errorRows.map(row => row.userId);
  }

  const users = await User.findAll({ where: userWhere, attributes: userPublicFields(), limit, order: [['lastSyncAt', 'ASC']] });
  const results = [];
  for (const user of users) {
    if (action === 'enrich-incomplete') {
      results.push({ userId: user.id, result: await enrichUserActivities(user.id, { maxCount: Math.min(limit * 10, 500), force: false }) });
    } else if (['sync-all', 'sync-stale', 'sync-errors'].includes(action)) {
      results.push({ userId: user.id, result: await syncSince(user.id, user.lastSyncAt ? Math.floor(new Date(user.lastSyncAt).getTime() / 1000) : undefined, { enrich: req.body?.enrich !== false }) });
    } else {
      return sendError(res, 'Unsupported global Strava action', 400);
    }
  }
  await auditSuperAdmin(req, {
    eventType: 'strava_global_action',
    riskLevel: 'high',
    category: 'strava',
    message: `Global Strava action: ${action}`,
    metadata: { action, limit, processedUsers: results.length, results },
  });
  sendSuccess(res, sanitizeForSuperAdmin({ action, limit, processedUsers: results.length, results }));
}));

module.exports = router;
