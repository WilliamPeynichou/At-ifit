const { Op } = require('sequelize');
const Activity = require('../../models/Activity');
const { heatStressFrom, weightedQuantile, computeConfidence } = require('./cyclingPredictor');

const SWIM_TYPES = ['Swim'];
const LOOKBACK_DAYS = 540;

function swimSimilarity(activity, distanceKm) {
  const actDistanceKm = (activity.distance || 0) / 1000;
  if (actDistanceKm < 0.1) return 0;
  return Math.min(actDistanceKm, distanceKm) / Math.max(actDistanceKm, distanceKm);
}

async function predictSwimmingEffort({ userId, distanceKm, weather = null, athlete = {} }) {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  const activities = await Activity.findAll({
    where: {
      userId,
      type: { [Op.in]: SWIM_TYPES },
      startDate: { [Op.gte]: since },
      distance: { [Op.gt]: 100 },
      movingTime: { [Op.gt]: 120 },
    },
    attributes: ['id', 'name', 'startDate', 'distance', 'movingTime'],
    order: [['startDate', 'DESC']],
    limit: 300,
  });

  const scored = activities.map(activity => {
    const paceSecondsPer100m = activity.movingTime / (activity.distance / 100);
    const score = swimSimilarity(activity, distanceKm);
    const ageDays = Math.max(0, (Date.now() - new Date(activity.startDate).getTime()) / 86400000);
    return { activity, paceSecondsPer100m, score, weight: score * Math.pow(0.5, ageDays / 180) };
  }).filter(e => e.score >= 0.4 && e.paceSecondsPer100m >= 40 && e.paceSecondsPer100m <= 600);

  let paceTarget;
  let modelType;
  const assumptions = [];
  if (scored.length >= 3) {
    paceTarget = weightedQuantile(scored.map(e => ({ value: e.paceSecondsPer100m, weight: e.weight })), 0.5);
    modelType = 'personal_weighted_baseline';
    assumptions.push(`Durée estimée depuis ${scored.length} nages comparables de ton historique Strava.`);
  } else {
    paceTarget = 150; // 2 min 30 / 100 m, repli loisir prudent
    modelType = 'generic_formula';
    assumptions.push('Historique natation comparable insuffisant : allure générique prudente de 2 min 30/100 m utilisée.');
  }

  const target = Math.round((distanceKm * 1000 / 100) * paceTarget / 60);
  const duration = { low: Math.round(target * 0.85), target, high: Math.round(target * 1.25) };
  const intensityClass = target >= 120 ? 'moderate' : 'moderate_high';
  // En natation, l'air extérieur n'est qu'un proxy ; la température de l'eau manque généralement.
  const heatStress = weather ? heatStressFrom(weather) : 'low';
  const weightKg = athlete.weightKg || 70;
  const kcalPerHour = intensityClass === 'moderate_high' ? 650 : 500;
  const energyTarget = kcalPerHour * (target / 60) * (weightKg / 70);
  const sweatTarget = Math.round((intensityClass === 'moderate_high' ? 500 : 350) * (weightKg / 70));

  assumptions.push('Température de l’eau indisponible : sudation natation estimée avec forte incertitude.');

  return {
    sport: 'swimming',
    estimatedDurationMinutes: duration,
    intensityClass,
    estimatedEnergyKcal: {
      low: Math.round(energyTarget * 0.75), target: Math.round(energyTarget), high: Math.round(energyTarget * 1.3),
    },
    heatStress,
    estimatedSweatRateMlPerHour: {
      low: Math.round(sweatTarget * 0.6), target: sweatTarget, high: Math.round(sweatTarget * 1.5),
    },
    confidence: computeConfidence({
      modelType, comparableCount: scored.length,
      coverage: Math.min(1, scored.reduce((s, e) => s + e.score, 0) / 8), hasWeather: Boolean(weather),
    }),
    modelType,
    comparableActivitiesCount: scored.length,
    comparableActivities: scored.sort((a, b) => b.weight - a.weight).slice(0, 5).map(e => ({
      id: e.activity.id, name: e.activity.name, date: e.activity.startDate,
      distanceKm: Math.round((e.activity.distance / 1000) * 100) / 100,
      paceSecondsPer100m: Math.round(e.paceSecondsPer100m),
      similarity: Math.round(e.score * 100) / 100,
    })),
    assumptions,
  };
}

module.exports = { predictSwimmingEffort, swimSimilarity, SWIM_TYPES };
