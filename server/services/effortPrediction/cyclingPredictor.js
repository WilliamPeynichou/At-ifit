const { Op } = require('sequelize');
const Activity = require('../../models/Activity');

const RIDE_TYPES = ['Ride', 'VirtualRide', 'GravelRide'];
const LOOKBACK_DAYS = 540;
const MIN_COMPARABLES = 3;
const MIN_DISTANCE_KM = 5;

/** Pondération de récence : demi-vie de 180 jours. */
function recencyWeight(startDate) {
  const ageDays = (Date.now() - new Date(startDate).getTime()) / 86400000;
  return Math.pow(0.5, Math.max(0, ageDays) / 180);
}

/**
 * Similarité sur distance et D+/km. Une sortie deux fois plus longue ou
 * nettement plus vallonnée ne doit pas peser autant qu'une sortie proche.
 */
function similarity(activity, { distanceKm, elevationPerKm }) {
  const actDistanceKm = (activity.distance || 0) / 1000;
  if (actDistanceKm < MIN_DISTANCE_KM) return 0;

  const distanceRatio = Math.min(actDistanceKm, distanceKm) / Math.max(actDistanceKm, distanceKm);
  const actElevationPerKm = actDistanceKm > 0 ? (activity.totalElevationGain || 0) / actDistanceKm : 0;
  const elevationDelta = Math.abs(actElevationPerKm - elevationPerKm);
  const elevationScore = 1 / (1 + elevationDelta / 10);

  return distanceRatio * 0.65 + elevationScore * 0.35;
}

function weightedQuantile(samples, quantile) {
  const sorted = [...samples].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return null;

  let cumulative = 0;
  for (const sample of sorted) {
    cumulative += sample.weight;
    if (cumulative >= totalWeight * quantile) return sample.value;
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Vitesse générique de repli, ajustée au D+/km, lorsque l'historique est
 * insuffisant. Explicitement signalée comme non personnalisée.
 */
function genericSpeedKmh(elevationPerKm) {
  const base = 25;
  const penalty = Math.min(10, (elevationPerKm / 10) * 1.5);
  return Math.max(12, base - penalty);
}

function classifyIntensity({ distanceKm, elevationPerKm, durationMinutes }) {
  const speedKmh = distanceKm / (durationMinutes / 60);
  if (durationMinutes >= 240) return 'moderate';
  if (elevationPerKm >= 15 || speedKmh >= 30) return 'moderate_high';
  if (speedKmh <= 20) return 'low';
  return 'moderate';
}

function heatStressFrom(weather) {
  if (!weather || !Number.isFinite(Number(weather.temperatureC))) return 'moderate';
  const temp = Number(weather.temperatureC);
  const humidity = Number.isFinite(Number(weather.humidityPercent)) ? Number(weather.humidityPercent) : 55;

  if (temp >= 30 && humidity >= 60) return 'extreme';
  if (temp >= 27) return 'high';
  if (temp <= 10) return 'low';
  return 'moderate';
}

const SWEAT_BASE_ML_PER_HOUR = { low: 400, moderate: 600, moderate_high: 750, high: 900 };
const HEAT_SWEAT_FACTOR = { low: 0.8, moderate: 1, high: 1.25, extreme: 1.45 };

function estimateSweatRate({ intensityClass, heatStress, weightKg }) {
  const base = SWEAT_BASE_ML_PER_HOUR[intensityClass] ?? SWEAT_BASE_ML_PER_HOUR.moderate;
  const factor = HEAT_SWEAT_FACTOR[heatStress] ?? 1;
  // La sudation croît avec la masse corporelle ; 70 kg sert de référence.
  const weightFactor = weightKg ? Math.min(1.3, Math.max(0.8, weightKg / 70)) : 1;
  const target = base * factor * weightFactor;
  return {
    low: Math.round(target * 0.75),
    target: Math.round(target),
    high: Math.round(target * 1.3),
  };
}

/**
 * Prédiction de durée vélo — niveau 0 (heuristique explicable).
 * Utilise la vitesse des sorties comparables pondérée par similarité et récence.
 */
async function predictCyclingEffort({ userId, distanceKm, elevationGainM = 0, weather = null, athlete = {} }) {
  const elevationPerKm = distanceKm > 0 ? elevationGainM / distanceKm : 0;
  const assumptions = [];

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  const activities = await Activity.findAll({
    where: {
      userId,
      type: { [Op.in]: RIDE_TYPES },
      startDate: { [Op.gte]: since },
      distance: { [Op.gt]: MIN_DISTANCE_KM * 1000 },
      movingTime: { [Op.gt]: 600 },
    },
    attributes: ['id', 'name', 'startDate', 'distance', 'movingTime', 'totalElevationGain', 'averageSpeed'],
    order: [['startDate', 'DESC']],
    limit: 300,
  });

  const scored = activities
    .map(activity => {
      const score = similarity(activity, { distanceKm, elevationPerKm });
      const actDistanceKm = (activity.distance || 0) / 1000;
      const speedKmh = actDistanceKm / (activity.movingTime / 3600);
      return { activity, score, weight: score * recencyWeight(activity.startDate), speedKmh };
    })
    .filter(entry => entry.score >= 0.5 && Number.isFinite(entry.speedKmh) && entry.speedKmh > 5);

  let durationMinutes;
  let modelType;
  let comparableCount = scored.length;
  let coverage = 0;

  if (scored.length >= MIN_COMPARABLES) {
    const samples = scored.map(entry => ({ value: entry.speedKmh, weight: entry.weight }));
    const speedTarget = weightedQuantile(samples, 0.5);
    const speedFast = weightedQuantile(samples, 0.75);
    const speedSlow = weightedQuantile(samples, 0.25);

    durationMinutes = {
      low: Math.round((distanceKm / speedFast) * 60),
      target: Math.round((distanceKm / speedTarget) * 60),
      high: Math.round((distanceKm / speedSlow) * 60),
    };
    modelType = 'personal_weighted_baseline';
    coverage = Math.min(1, scored.reduce((sum, e) => sum + e.score, 0) / 8);
    assumptions.push(`Durée estimée depuis ${scored.length} sorties comparables de ton historique Strava.`);
  } else {
    const speed = genericSpeedKmh(elevationPerKm);
    const target = Math.round((distanceKm / speed) * 60);
    durationMinutes = {
      low: Math.round(target * 0.85),
      target,
      high: Math.round(target * 1.2),
    };
    modelType = 'generic_formula';
    assumptions.push(
      'Historique comparable insuffisant : vitesse générique utilisée. '
      + 'La précision augmentera avec tes prochaines sorties synchronisées.'
    );
  }

  const intensityClass = classifyIntensity({ distanceKm, elevationPerKm, durationMinutes: durationMinutes.target });
  const heatStress = heatStressFrom(weather);
  const estimatedSweatRateMlPerHour = estimateSweatRate({
    intensityClass,
    heatStress,
    weightKg: athlete.weightKg,
  });

  if (!weather) {
    assumptions.push('Météo indisponible : conditions tempérées supposées, stress thermique modéré.');
  }

  // Dépense énergétique : approximation par le coût moyen du cyclisme, volontairement
  // large car sans capteur de puissance elle reste indicative.
  const kcalPerHour = { low: 450, moderate: 600, moderate_high: 750, high: 900 }[intensityClass] ?? 600;
  const weightFactor = athlete.weightKg ? athlete.weightKg / 70 : 1;
  const hours = durationMinutes.target / 60;
  const estimatedEnergyKcal = {
    low: Math.round(kcalPerHour * 0.8 * weightFactor * hours),
    target: Math.round(kcalPerHour * weightFactor * hours),
    high: Math.round(kcalPerHour * 1.2 * weightFactor * hours),
  };

  const confidence = computeConfidence({ modelType, comparableCount, coverage, hasWeather: Boolean(weather) });

  return {
    sport: 'cycling',
    estimatedDurationMinutes: durationMinutes,
    intensityClass,
    estimatedEnergyKcal,
    heatStress,
    estimatedSweatRateMlPerHour,
    confidence,
    modelType,
    comparableActivitiesCount: comparableCount,
    comparableActivities: scored
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(entry => ({
        id: entry.activity.id,
        name: entry.activity.name,
        date: entry.activity.startDate,
        distanceKm: Math.round((entry.activity.distance / 1000) * 10) / 10,
        elevationM: Math.round(entry.activity.totalElevationGain || 0),
        speedKmh: Math.round(entry.speedKmh * 10) / 10,
        similarity: Math.round(entry.score * 100) / 100,
      })),
    assumptions,
  };
}

/** Score de confiance V1, pondérations issues de plan.md §4.6. */
function computeConfidence({ modelType, comparableCount, coverage, hasWeather }) {
  if (modelType === 'generic_formula') return hasWeather ? 0.3 : 0.25;

  const coverageScore = Math.min(1, coverage) * 0.35;
  const countScore = Math.min(1, comparableCount / 12) * 0.25;
  const recencyScore = 0.2 * 0.8; // approximation V1, affinée en phase de calibration
  const sensorScore = 0.1 * 0.7;
  const weatherScore = hasWeather ? 0.1 : 0.02;

  return Math.round((coverageScore + countScore + recencyScore + sensorScore + weatherScore) * 100) / 100;
}

module.exports = {
  predictCyclingEffort,
  similarity,
  classifyIntensity,
  heatStressFrom,
  estimateSweatRate,
  weightedQuantile,
  computeConfidence,
  RIDE_TYPES,
};
