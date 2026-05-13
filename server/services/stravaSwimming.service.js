const Activity = require('../models/Activity');
const User = require('../models/User');
const { syncUserActivities, syncSince } = require('./stravaSync');
const { resolveMaxHeartrate } = require('./userMetricsService');
const logger = require('../utils/logger');
const {
  filterSwimmingActivities,
  filterActivitiesByPeriod,
  getPreviousPeriod,
  calculateSwimmingGlobalStats,
  calculateSwimmingComparisonStats,
  calculateWeeklySwimStats,
  calculateSwimTrainingLoad,
  calculateSwimTrainingLoadRatio,
  calculateSwimmingRegularityScore,
  detectLongSwims,
  detectSwimmingPersonalBests,
  calculatePoolVsOpenWaterStats,
  calculateSwimEfficiencyStats,
  calculateSwimmingCorrelations,
  calculateAverageSwimPace,
  normalizePeriod,
} = require('../utils/swimmingMetrics');
const { generateSwimmingInsights } = require('../utils/swimmingInsights');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePeriodQuery(query = {}) {
  return {
    preset: query.period || query.preset || '30D',
    from: query.from || null,
    to: query.to || null,
  };
}

async function ensureStravaState(userId, { triggerSync = false } = {}) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError('User not found', 404);
  if (!user.stravaAccessToken) {
    throw createHttpError('Strava not connected. Please connect your Strava account first.', 400);
  }

  if (triggerSync) {
    if (!user.fullSyncCompletedAt) {
      syncUserActivities(userId, { enrich: true }).catch(err =>
        logger.error('[Swimming] Full sync auto failed', { userId, error: err.message })
      );
    } else {
      const lastSync = user.lastSyncAt ? new Date(user.lastSyncAt) : null;
      if (!lastSync || Date.now() - lastSync.getTime() > 10 * 60 * 1000) {
        const since = lastSync ? Math.floor(lastSync.getTime() / 1000) : Math.floor((Date.now() - 7 * 86400 * 1000) / 1000);
        syncSince(userId, since).catch(err =>
          logger.error('[Swimming] Incremental sync auto failed', { userId, error: err.message })
        );
      }
    }
  }

  return user;
}

function calculatePaceHeartRateTrend(activities) {
  const withHr = activities.filter(a => a.averageHeartRate && a.averagePaceMinPer100m);
  if (withHr.length < 4) return { available: false };
  const midpoint = Math.floor(withHr.length / 2);
  const first = withHr.slice(0, midpoint);
  const second = withHr.slice(midpoint);
  const firstPace = calculateAverageSwimPace(first);
  const secondPace = calculateAverageSwimPace(second);
  const firstHr = first.reduce((s, a) => s + a.averageHeartRate, 0) / first.length;
  const secondHr = second.reduce((s, a) => s + a.averageHeartRate, 0) / second.length;
  return {
    available: true,
    paceDeltaSeconds: Math.round((secondPace - firstPace) * 60),
    heartRateDelta: Math.round(secondHr - firstHr),
  };
}

async function getAllSwimmingActivities(userId, { triggerSync = false } = {}) {
  const [user, hrMaxResolved, rows] = await Promise.all([
    ensureStravaState(userId, { triggerSync }),
    resolveMaxHeartrate(userId),
    Activity.findAll({ where: { userId }, order: [['startDate', 'ASC']], limit: 5000 }),
  ]);

  const activities = filterSwimmingActivities(rows);
  activities.forEach(activity => {
    activity.trainingLoad = calculateSwimTrainingLoad(activity, { estimatedMaxHeartRate: hrMaxResolved.value || 190 });
    activity.trainingLoadSource = activity.averageHeartRate ? 'heart_rate' : 'estimated_without_hr';
  });

  return {
    user,
    hrMax: {
      value: hrMaxResolved.value || 190,
      source: hrMaxResolved.source || 'default',
      confidence: hrMaxResolved.confidence || 'low',
    },
    activities,
  };
}

function buildAnalysis(activities, periodInput, user, hrMax) {
  const period = normalizePeriod(periodInput);
  const previousPeriod = getPreviousPeriod(period);
  const currentActivities = filterActivitiesByPeriod(activities, period);
  const previousActivities = previousPeriod ? filterActivitiesByPeriod(activities, previousPeriod) : [];
  const globalStats = calculateSwimmingGlobalStats(currentActivities);
  const comparisonStats = calculateSwimmingComparisonStats(currentActivities, previousActivities);
  const weeklyStats = calculateWeeklySwimStats(currentActivities);
  const trainingLoadRatios = calculateSwimTrainingLoadRatio(weeklyStats);
  const regularity = calculateSwimmingRegularityScore(currentActivities);
  const longSwims = detectLongSwims(currentActivities, weeklyStats);
  const personalBests = detectSwimmingPersonalBests(currentActivities, weeklyStats);
  const poolVsOpenWaterStats = calculatePoolVsOpenWaterStats(currentActivities);
  const efficiencyStats = calculateSwimEfficiencyStats(currentActivities);
  const correlations = calculateSwimmingCorrelations(currentActivities, weeklyStats);
  const paceHeartRateTrend = calculatePaceHeartRateTrend(currentActivities);
  const insights = generateSwimmingInsights(currentActivities, weeklyStats, globalStats, comparisonStats, {
    trainingLoadRatios,
    regularity,
    longSwims,
    personalBests,
    poolVsOpenWaterStats,
    efficiencyStats,
    correlations,
    paceHeartRateTrend,
  });

  return {
    status: {
      stravaConnected: true,
      dataSynced: Boolean(user.fullSyncCompletedAt || user.lastSyncAt),
      lastSyncAt: user.lastSyncAt || user.fullSyncCompletedAt || null,
      totalSwimmingActivities: activities.length,
      analyzedActivities: currentActivities.length,
      partialAnalysis: currentActivities.some(a => !a.averageHeartRate || (!a.swolf && !a.strokeRate)),
      heartRateAvailable: globalStats.heartRateCoverage > 0,
      heartRatePartial: globalStats.heartRateCoverage > 0 && globalStats.heartRateCoverage < 0.7,
      technicalDataAvailable: efficiencyStats.available,
      trainingLoadPrecision: globalStats.heartRateCoverage >= 0.7 ? 'heart_rate_based' : 'estimated_or_partial',
      hrMax,
    },
    period,
    previousPeriod,
    activities: currentActivities,
    allSwimmingActivityCount: activities.length,
    stats: globalStats,
    comparison: comparisonStats,
    weeklyStats,
    trainingLoadRatios,
    regularity,
    longSwims,
    personalBests,
    poolVsOpenWaterStats,
    efficiencyStats,
    correlations,
    paceHeartRateTrend,
    insights,
  };
}

async function getSwimmingAnalysis(userId, query = {}) {
  const { user, hrMax, activities } = await getAllSwimmingActivities(userId, { triggerSync: true });
  return buildAnalysis(activities, parsePeriodQuery(query), user, hrMax);
}

async function getSwimmingActivities(userId, query = {}) {
  const { activities } = await getAllSwimmingActivities(userId, { triggerSync: true });
  return filterActivitiesByPeriod(activities, parsePeriodQuery(query));
}

async function getSwimmingWeeklyStats(userId, query = {}) {
  const { activities } = await getAllSwimmingActivities(userId);
  return calculateWeeklySwimStats(filterActivitiesByPeriod(activities, parsePeriodQuery(query)));
}

async function getSwimmingInsights(userId, query = {}) {
  return (await getSwimmingAnalysis(userId, query)).insights;
}

async function syncSwimmingData(userId) {
  await ensureStravaState(userId);
  syncUserActivities(userId, { enrich: true }).catch(err =>
    logger.error('[Swimming] Manual sync failed', { userId, error: err.message })
  );
  return { status: 'started' };
}

module.exports = {
  getSwimmingAnalysis,
  getSwimmingActivities,
  getSwimmingWeeklyStats,
  getSwimmingInsights,
  syncSwimmingData,
  buildAnalysis,
  parsePeriodQuery,
};
