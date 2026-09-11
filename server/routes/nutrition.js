const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const User = require('../models/User');
const Weight = require('../models/Weight');
const { predictCyclingEffort } = require('../services/effortPrediction/cyclingPredictor');
const { predictRunningEffort } = require('../services/effortPrediction/runningPredictor');
const { predictSwimmingEffort } = require('../services/effortPrediction/swimmingPredictor');
const { generateNutritionAnalysis } = require('../services/nutrition/nutritionEngine');
const { getWeatherContext } = require('../services/providers/weatherProvider');

const router = express.Router();

const SUPPORTED_SPORTS = ['cycling', 'running', 'swimming'];
const SPORT_LIMITS = {
  cycling: { minDistanceKm: 1, maxDistanceKm: 1000, maxElevationM: 20000 },
  running: { minDistanceKm: 1, maxDistanceKm: 250, maxElevationM: 10000 },
  swimming: { minDistanceKm: 0.1, maxDistanceKm: 50, maxElevationM: 0 },
};
const SPORT_PREDICTORS = {
  cycling: predictCyclingEffort,
  running: predictRunningEffort,
  swimming: predictSwimmingEffort,
};

function validatePreviewInput(body) {
  const errors = [];
  const sport = String(body.sport || '').trim();

  if (!SUPPORTED_SPORTS.includes(sport)) {
    errors.push(`sport must be one of: ${SUPPORTED_SPORTS.join(', ')}`);
  }

  const limits = SPORT_LIMITS[sport] || SPORT_LIMITS.cycling;
  const distanceKm = Number(body.distanceKm);
  if (!Number.isFinite(distanceKm) || distanceKm < limits.minDistanceKm || distanceKm > limits.maxDistanceKm) {
    errors.push(`distanceKm must be between ${limits.minDistanceKm} and ${limits.maxDistanceKm}`);
  }

  // Le D+ n'a pas de sens en natation : toujours ramené à 0 plutôt que rejeté.
  const elevationRaw = body.elevationGainM === undefined || body.elevationGainM === '' ? 0 : Number(body.elevationGainM);
  const elevationGainM = sport === 'swimming' ? 0 : elevationRaw;
  if (sport !== 'swimming' && (!Number.isFinite(elevationGainM) || elevationGainM < 0 || elevationGainM > limits.maxElevationM)) {
    errors.push(`elevationGainM must be between 0 and ${limits.maxElevationM}`);
  }

  let plannedStartAt = null;
  if (body.plannedStartAt) {
    const parsed = new Date(body.plannedStartAt);
    if (Number.isNaN(parsed.getTime())) errors.push('plannedStartAt must be a valid date');
    else plannedStartAt = parsed;
  }

  // Le texte libre n'est pas interprété en V1 : il est conservé mais borné
  // pour éviter toute injection de prompt lors des phases IA ultérieures.
  const objectiveText = typeof body.objectiveText === 'string' ? body.objectiveText.slice(0, 1000) : null;
  const locationLabel = typeof body.locationLabel === 'string' ? body.locationLabel.trim().slice(0, 120) : null;

  if (body.locationLabel && !locationLabel) errors.push('locationLabel must not be empty');

  return { errors, sport, distanceKm, elevationGainM, plannedStartAt, objectiveText, locationLabel };
}

function sanitizeNutritionProfile(input = {}) {
  const gutTolerance = ['low', 'medium', 'high', 'trained'].includes(input.gutTolerance)
    ? input.gutTolerance
    : undefined;
  const sweatSodiumProfile = ['low', 'normal', 'salty'].includes(input.sweatSodiumProfile)
    ? input.sweatSodiumProfile
    : undefined;
  const measured = Number(input.measuredSweatRateMlPerHour);

  return {
    gutTolerance,
    sweatSodiumProfile,
    measuredSweatRateMlPerHour: Number.isFinite(measured) && measured >= 200 && measured <= 3000
      ? measured
      : undefined,
  };
}

async function loadAthlete(userId) {
  const [user, latestWeight] = await Promise.all([
    User.findByPk(userId, { attributes: ['id', 'age', 'gender'] }),
    Weight.findOne({ where: { userId }, order: [['date', 'DESC']] }),
  ]);

  return {
    age: user?.age ?? null,
    gender: user?.gender ?? null,
    weightKg: latestWeight?.weight ? Number(latestWeight.weight) : null,
  };
}

/**
 * Calcule un plan nutritionnel depuis un formulaire structuré.
 * Ne persiste rien : la confirmation explicite reste requise pour enregistrer.
 */
router.post('/effort/preview', auth, asyncHandler(async (req, res) => {
  const input = validatePreviewInput(req.body || {});
  if (input.errors.length > 0) {
    return sendError(res, input.errors[0], 400, input.errors);
  }

  const [athlete, weather] = await Promise.all([
    loadAthlete(req.userId),
    input.locationLabel
      ? getWeatherContext({ locationLabel: input.locationLabel, plannedStartAt: input.plannedStartAt })
      : Promise.resolve(null),
  ]);

  const predict = SPORT_PREDICTORS[input.sport];
  const predictedEffort = await predict({
    userId: req.userId,
    distanceKm: input.distanceKm,
    elevationGainM: input.elevationGainM,
    weather,
    athlete,
  });

  const hoursBeforeStart = input.plannedStartAt
    ? Math.max(0, (input.plannedStartAt.getTime() - Date.now()) / 3600000)
    : null;

  const analysis = generateNutritionAnalysis({
    athlete,
    healthPrecautions: [],
    predictedEffort,
    weather,
    nutritionProfile: sanitizeNutritionProfile(req.body?.nutritionProfile),
    objective: {
      text: input.objectiveText,
      hoursBeforeStart: hoursBeforeStart !== null && hoursBeforeStart <= 24 ? hoursBeforeStart : null,
    },
  });

  if (!analysis.available) {
    return sendError(res, analysis.blockers[0]?.message || 'Plan indisponible', 422, analysis.blockers);
  }

  sendSuccess(res, {
    input: {
      sport: input.sport,
      distanceKm: input.distanceKm,
      elevationGainM: input.elevationGainM,
      plannedStartAt: input.plannedStartAt,
      locationLabel: input.locationLabel,
      objectiveText: input.objectiveText,
    },
    ...analysis,
  });
}));

module.exports = router;
