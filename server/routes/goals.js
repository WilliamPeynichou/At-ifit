const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { Op, fn, col, literal } = require('sequelize');
const Goal = require('../models/Goal');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

const VALID_TYPES = ['distance_monthly', 'sessions_weekly', 'calories_weekly', 'elevation_monthly'];
const VALID_PERIODS = ['week', 'month'];

// ── Calcule la valeur actuelle d'un objectif ────────────────────────────────
async function computeCurrentValue(goal, userId) {
  const now = new Date();
  let after;

  if (goal.period === 'week') {
    const day = now.getDay(); // 0=dim
    const daysFromMonday = (day + 6) % 7;
    after = new Date(now);
    after.setDate(now.getDate() - daysFromMonday);
    after.setHours(0, 0, 0, 0);
  } else {
    after = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const where = {
    userId,
    startDate: { [Op.gte]: after },
  };
  if (goal.sportType) where.type = goal.sportType;

  if (goal.type === 'distance_monthly') {
    const [row] = await Activity.findAll({
      where,
      attributes: [[fn('SUM', col('distance')), 'total']],
      raw: true,
    });
    return parseFloat(((row?.total || 0) / 1000).toFixed(1)); // km
  }

  if (goal.type === 'sessions_weekly') {
    return await Activity.count({ where });
  }

  if (goal.type === 'calories_weekly') {
    const [row] = await Activity.findAll({
      where,
      attributes: [[fn('SUM', col('calories')), 'total']],
      raw: true,
    });
    return parseFloat((row?.total || 0).toFixed(0));
  }

  if (goal.type === 'elevation_monthly') {
    const [row] = await Activity.findAll({
      where,
      attributes: [[fn('SUM', col('totalElevationGain')), 'total']],
      raw: true,
    });
    return parseFloat((row?.total || 0).toFixed(0));
  }

  return 0;
}

// ── GET /api/goals — liste tous les objectifs actifs + progression ──────────
router.get('/', auth, asyncHandler(async (req, res) => {
  const goals = await Goal.findAll({
    where: { userId: req.userId, active: true },
    order: [['createdAt', 'DESC']],
  });

  const withProgress = await Promise.all(goals.map(async g => {
    const current = await computeCurrentValue(g, req.userId);
    const pct = g.targetValue > 0 ? Math.min(Math.round((current / g.targetValue) * 100), 100) : 0;
    return {
      id: g.id,
      type: g.type,
      sportType: g.sportType,
      targetValue: g.targetValue,
      period: g.period,
      currentValue: current,
      progressPct: pct,
      achieved: pct >= 100,
    };
  }));

  sendSuccess(res, withProgress);
}));

// ── POST /api/goals — créer un objectif ─────────────────────────────────────
router.post('/', auth, asyncHandler(async (req, res) => {
  const { type, sportType, targetValue, period } = req.body;

  if (!VALID_TYPES.includes(type)) {
    return sendError(res, `type invalide. Valeurs acceptées : ${VALID_TYPES.join(', ')}`, 400);
  }
  if (!VALID_PERIODS.includes(period)) {
    return sendError(res, `period invalide. Valeurs acceptées : ${VALID_PERIODS.join(', ')}`, 400);
  }
  if (!targetValue || isNaN(parseFloat(targetValue)) || parseFloat(targetValue) <= 0) {
    return sendError(res, 'targetValue doit être un nombre positif', 400);
  }

  const goal = await Goal.create({
    userId: req.userId,
    type,
    sportType: sportType || null,
    targetValue: parseFloat(targetValue),
    period,
    active: true,
  });

  logger.info('[Goals] Objectif créé', { userId: req.userId, type, period, targetValue });
  sendSuccess(res, goal, 'Objectif créé', 201);
}));

// ── PUT /api/goals/:id — modifier un objectif ────────────────────────────────
router.put('/:id', auth, asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!goal) return sendError(res, 'Objectif introuvable', 404);

  const { targetValue, sportType, active } = req.body;
  if (targetValue !== undefined) goal.targetValue = parseFloat(targetValue);
  if (sportType !== undefined) goal.sportType = sportType || null;
  if (active !== undefined) goal.active = active;
  await goal.save();

  sendSuccess(res, goal);
}));

// ── DELETE /api/goals/:id — désactiver (soft delete) ────────────────────────
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!goal) return sendError(res, 'Objectif introuvable', 404);

  await goal.destroy();
  logger.info('[Goals] Objectif supprimé', { userId: req.userId, goalId: goal.id });
  sendSuccess(res, null, 'Objectif supprimé');
}));

module.exports = router;
