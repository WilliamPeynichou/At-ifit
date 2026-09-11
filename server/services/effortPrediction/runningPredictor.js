const { Op } = require('sequelize');
const Activity = require('../../models/Activity');
const { heatStressFrom, estimateSweatRate, weightedQuantile, computeConfidence } = require('./cyclingPredictor');

const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];
const LOOKBACK_DAYS = 540;

function runSimilarity(activity, { distanceKm, elevationPerKm }) {
  const actDistanceKm = (activity.distance || 0) / 1000;
  if (actDistanceKm < 1) return 0;
  const distanceRatio = Math.min(actDistanceKm, distanceKm) / Math.max(actDistanceKm, distanceKm);
  const actElevationPerKm = (activity.totalElevationGain || 0) / actDistanceKm;
  const elevationScore = 1 / (1 + Math.abs(actElevationPerKm - elevationPerKm) / 15);
  return distanceRatio * 0.7 + elevationScore * 0.3;
}

function genericPaceMinPerKm(elevationPerKm) {
  return Math.min(12, 6 + elevationPerKm * 0.025);
}

async function predictRunningEffort({ userId, distanceKm, elevationGainM = 0, weather = null, athlete = {} }) {
  const elevationPerKm = elevationGainM / distanceKm;
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  const activities = await Activity.findAll({
    where: {
      userId,
      type: { [Op.in]: RUN_TYPES },
      startDate: { [Op.gte]: since },
      distance: { [Op.gt]: 1000 },
      movingTime: { [Op.gt]: 300 },
    },
    attributes: ['id', 'name', 'startDate', 'distance', 'movingTime', 'totalElevationGain'],
    order: [['startDate', 'DESC']],
    limit: 300,
  });

  const scored = activities.map(activity => {
    const actDistanceKm = activity.distance / 1000;
    const pace = activity.movingTime / 60 / actDistanceKm;
    const score = runSimilarity(activity, { distanceKm, elevationPerKm });
    const ageDays = Math.max(0, (Date.now() - new Date(activity.startDate).getTime()) / 86400000);
    return { activity, pace, score, weight: score * Math.pow(0.5, ageDays / 180) };
  }).filter(e => e.score >= 0.5 && e.pace >= 2.5 && e.pace <= 20);

  let paceTarget;
  let modelType;
  const assumptions = [];
  if (scored.length >= 3) {
    const samples = scored.map(e => ({ value: e.pace, weight: e.weight }));
    paceTarget = weightedQuantile(samples, 0.5);
    modelType = 'personal_weighted_baseline';
    assumptions.push(`Durée estimée depuis ${scored.length} courses comparables de ton historique Strava.`);
  } else {
    paceTarget = genericPaceMinPerKm(elevationPerKm);
    modelType = 'generic_formula';
    assumptions.push('Historique course comparable insuffisant : allure générique prudente utilisée.');
  }

  const target = Math.round(distanceKm * paceTarget);
  const duration = { low: Math.round(target * 0.88), target, high: Math.round(target * 1.18) };
  const intensityClass = target >= 180 ? 'moderate' : target <= 60 ? 'moderate_high' : 'moderate';
  const heatStress = heatStressFrom(weather);
  const sweat = estimateSweatRate({ intensityClass, heatStress, weightKg: athlete.weightKg });
  const weightKg = athlete.weightKg || 70;
  // Coût énergétique de la course ≈ 1 kcal/kg/km, intervalle large pour terrain/D+.
  const energyTarget = weightKg * distanceKm;

  if (!weather) assumptions.push('Météo indisponible : conditions tempérées supposées.');

  return {
    sport: 'running',
    estimatedDurationMinutes: duration,
    intensityClass,
    estimatedEnergyKcal: {
      low: Math.round(energyTarget * 0.85), target: Math.round(energyTarget), high: Math.round(energyTarget * 1.2),
    },
    heatStress,
    estimatedSweatRateMlPerHour: sweat,
    confidence: computeConfidence({
      modelType, comparableCount: scored.length,
      coverage: Math.min(1, scored.reduce((s, e) => s + e.score, 0) / 8), hasWeather: Boolean(weather),
    }),
    modelType,
    comparableActivitiesCount: scored.length,
    comparableActivities: scored.sort((a, b) => b.weight - a.weight).slice(0, 5).map(e => ({
      id: e.activity.id, name: e.activity.name, date: e.activity.startDate,
      distanceKm: Math.round((e.activity.distance / 1000) * 10) / 10,
      elevationM: Math.round(e.activity.totalElevationGain || 0),
      paceMinPerKm: Math.round(e.pace * 100) / 100,
      similarity: Math.round(e.score * 100) / 100,
    })),
    assumptions,
  };
}

module.exports = { predictRunningEffort, runSimilarity, genericPaceMinPerKm, RUN_TYPES };
