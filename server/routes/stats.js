const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { getWeightPerformanceCorrelation } = require('../services/statsService');
const { getTrainingLoad } = require('../services/trainingLoadService');
const { Op, fn, col, literal } = require('sequelize');
const Activity = require('../models/Activity');
const { getValidStravaToken, getAthleteGear } = require('../utils/stravaHelpers');
const User = require('../models/User');

router.get('/weight-performance', auth, asyncHandler(async (req, res) => {
  const weeks = Math.min(parseInt(req.query.weeks || '12'), 52);
  const data = await getWeightPerformanceCorrelation(req.userId, weeks);
  sendSuccess(res, data);
}));

router.get('/training-load', auth, asyncHandler(async (req, res) => {
  const weeks = Math.min(parseInt(req.query.weeks || '10'), 20);
  const data = await getTrainingLoad(req.userId, weeks, {
    from: req.query.from || null,
    to: req.query.to || null,
  });
  sendSuccess(res, data);
}));

router.get('/gear-usage', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user?.stravaAccessToken) {
    return sendSuccess(res, []);
  }

  // Agrège km par gearId depuis Activity table (filtré par période si fournie)
  const whereGear = { userId: req.userId, gearId: { [Op.not]: null } };
  if (req.query.from || req.query.to) {
    whereGear.startDate = {};
    if (req.query.from) whereGear.startDate[Op.gte] = new Date(req.query.from);
    if (req.query.to) whereGear.startDate[Op.lte] = new Date(req.query.to);
  }
  const usageRows = await Activity.findAll({
    where: whereGear,
    attributes: [
      'gearId',
      [fn('SUM', col('distance')), 'totalDistance'],
      [fn('COUNT', col('id')), 'activityCount'],
    ],
    group: ['gearId'],
    raw: true,
  });

  if (usageRows.length === 0) return sendSuccess(res, []);

  // Récupère les noms d'équipement depuis Strava
  let gearDetails = {};
  try {
    const accessToken = await getValidStravaToken(user);
    if (accessToken) {
      const gear = await getAthleteGear(accessToken);
      [...(gear.bikes || []), ...(gear.shoes || [])].forEach(g => {
        gearDetails[g.id] = { name: g.name, brand: g.brand_name, category: g.bikes ? 'bike' : 'shoe' };
      });
      // Détermine la catégorie selon le préfixe de l'ID Strava (b = bike, g = shoe)
      [...(gear.bikes || [])].forEach(g => { if (gearDetails[g.id]) gearDetails[g.id].category = 'bike'; });
      [...(gear.shoes || [])].forEach(g => { if (gearDetails[g.id]) gearDetails[g.id].category = 'shoe'; });
    }
  } catch (e) { /* on retourne les données sans noms si Strava fail */ }

  const LIMITS = { shoe: 700, bike: 3000 };

  const result = usageRows.map(row => {
    const km = parseFloat((row.totalDistance / 1000).toFixed(1));
    const info = gearDetails[row.gearId] || { name: row.gearId, category: row.gearId?.startsWith('b') ? 'bike' : 'shoe' };
    const limit = LIMITS[info.category] || 700;
    return {
      gearId: row.gearId,
      name: info.name || row.gearId,
      category: info.category,
      km,
      activityCount: parseInt(row.activityCount),
      limit,
      progressPct: Math.min(Math.round((km / limit) * 100), 100),
      needsReplacement: km >= limit * 0.8,
    };
  }).sort((a, b) => b.progressPct - a.progressPct);

  sendSuccess(res, result);
}));

module.exports = router;
