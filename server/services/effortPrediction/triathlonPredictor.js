const { predictCyclingEffort } = require('./cyclingPredictor');
const { predictRunningEffort } = require('./runningPredictor');
const { predictSwimmingEffort } = require('./swimmingPredictor');

const HEAT_STRESS_ORDER = ['low', 'moderate', 'high', 'extreme'];

function sumRanges(ranges, extra = 0) {
  return ['low', 'target', 'high'].reduce((result, key) => {
    result[key] = Math.round(ranges.reduce((sum, range) => sum + Number(range?.[key] || 0), extra));
    return result;
  }, {});
}

function weightedRange(efforts, property) {
  return ['low', 'target', 'high'].reduce((result, key) => {
    const weighted = efforts.reduce((acc, effort) => {
      const duration = Number(effort.estimatedDurationMinutes?.target || 0);
      return {
        total: acc.total + Number(effort[property]?.[key] || 0) * duration,
        duration: acc.duration + duration,
      };
    }, { total: 0, duration: 0 });
    result[key] = weighted.duration > 0 ? Math.round(weighted.total / weighted.duration) : 0;
    return result;
  }, {});
}

function highestHeatStress(efforts) {
  return efforts.reduce((highest, effort) => (
    HEAT_STRESS_ORDER.indexOf(effort.heatStress) > HEAT_STRESS_ORDER.indexOf(highest)
      ? effort.heatStress
      : highest
  ), 'low');
}

function combineTriathlonEfforts({ swimming, cycling, running, transitionMinutes = 0 }) {
  const legs = [swimming, cycling, running];
  const safeTransitionMinutes = Math.max(0, Number(transitionMinutes) || 0);
  const totalLegMinutes = legs.reduce((sum, leg) => sum + Number(leg.estimatedDurationMinutes?.target || 0), 0);
  const confidence = totalLegMinutes > 0
    ? legs.reduce((sum, leg) => sum + Number(leg.confidence || 0) * leg.estimatedDurationMinutes.target, 0) / totalLegMinutes
    : 0;

  return {
    sport: 'triathlon',
    estimatedDurationMinutes: sumRanges(legs.map(leg => leg.estimatedDurationMinutes), safeTransitionMinutes),
    intensityClass: 'moderate',
    estimatedEnergyKcal: sumRanges(legs.map(leg => leg.estimatedEnergyKcal)),
    heatStress: highestHeatStress(legs),
    estimatedSweatRateMlPerHour: weightedRange(legs, 'estimatedSweatRateMlPerHour'),
    confidence: Math.round(confidence * 100) / 100,
    modelType: 'triathlon_composite',
    comparableActivitiesCount: legs.reduce((sum, leg) => sum + Number(leg.comparableActivitiesCount || 0), 0),
    comparableActivities: legs.flatMap(leg => leg.comparableActivities || []),
    transitionMinutes: safeTransitionMinutes,
    legs: {
      swimming,
      cycling,
      running,
    },
    assumptions: [
      ...legs.flatMap(leg => leg.assumptions || []),
      `Les transitions T1 et T2 ajoutent ${safeTransitionMinutes} min à la durée totale.`,
      'La durée et la dépense du triathlon sont la somme des trois disciplines ; la sudation est pondérée par leur durée.',
    ],
  };
}

async function predictTriathlonEffort({
  userId,
  swimmingDistanceKm,
  cyclingDistanceKm,
  cyclingElevationGainM = 0,
  runningDistanceKm,
  runningElevationGainM = 0,
  transitionMinutes = 0,
  weather = null,
  athlete = {},
}) {
  const [swimming, cycling, running] = await Promise.all([
    predictSwimmingEffort({ userId, distanceKm: swimmingDistanceKm, weather, athlete }),
    predictCyclingEffort({
      userId,
      distanceKm: cyclingDistanceKm,
      elevationGainM: cyclingElevationGainM,
      weather,
      athlete,
    }),
    predictRunningEffort({
      userId,
      distanceKm: runningDistanceKm,
      elevationGainM: runningElevationGainM,
      weather,
      athlete,
    }),
  ]);

  return combineTriathlonEfforts({ swimming, cycling, running, transitionMinutes });
}

module.exports = {
  predictTriathlonEffort,
  combineTriathlonEfforts,
  sumRanges,
  weightedRange,
  highestHeatStress,
};
