const Activity = require('../models/Activity');
const User = require('../models/User');
const { syncUserActivities, syncSince } = require('./stravaSync');
const { resolveMaxHeartrate } = require('./userMetricsService');
const {
  filterRunningActivities,
  filterActivitiesByPeriod,
  getPreviousPeriod,
  calculateGlobalStats,
  calculateComparisonStats,
  calculateWeeklyStats,
  calculateHeartRateStats,
  calculatePaceHeartRateTrend,
  calculateTrainingLoad,
  calculateTrainingLoadRatio,
  calculateRegularityScore,
  detectLongRuns,
  detectPersonalBests,
  calculateElevationStats,
  calculateCorrelations,
  normalizePeriod,
} = require('../utils/runningMetrics');
const { generateRunningInsights } = require('../utils/runningInsights');
const logger = require('../utils/logger');

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
        logger.error('[Running] Full sync auto failed', { userId, error: err.message })
      );
    } else {
      const lastSync = user.lastSyncAt ? new Date(user.lastSyncAt) : null;
      const staleMs = 10 * 60 * 1000;
      if (!lastSync || Date.now() - lastSync.getTime() > staleMs) {
        const since = lastSync
          ? Math.floor(lastSync.getTime() / 1000)
          : Math.floor((Date.now() - 7 * 86400 * 1000) / 1000);
        syncSince(userId, since).catch(err =>
          logger.error('[Running] Incremental sync auto failed', { userId, error: err.message })
        );
      }
    }
  }

  return user;
}

async function getAllRunningActivities(userId, { triggerSync = false } = {}) {
  const [user, hrMaxResolved, activities] = await Promise.all([
    ensureStravaState(userId, { triggerSync }),
    resolveMaxHeartrate(userId),
    Activity.findAll({
      where: { userId },
      order: [['startDate', 'ASC']],
      limit: 5000,
    }),
  ]);

  const normalized = filterRunningActivities(activities);
  normalized.forEach(activity => {
    activity.trainingLoad = calculateTrainingLoad(activity, hrMaxResolved.value || 190);
    activity.trainingLoadSource = activity.averageHeartRate ? 'heart_rate' : 'estimated_without_hr';
  });

  return {
    user,
    hrMax: {
      value: hrMaxResolved.value || 190,
      source: hrMaxResolved.source || 'default',
      confidence: hrMaxResolved.confidence || 'low',
    },
    activities: normalized,
  };
}

function buildAnalysis(activities, periodInput, user, hrMax) {
  const period = normalizePeriod(periodInput);
  const previousPeriod = getPreviousPeriod(period);
  const currentActivities = filterActivitiesByPeriod(activities, period);
  const previousActivities = previousPeriod ? filterActivitiesByPeriod(activities, previousPeriod) : [];
  const globalStats = calculateGlobalStats(currentActivities);
  const comparisonStats = calculateComparisonStats(currentActivities, previousActivities);
  const weeklyStats = calculateWeeklyStats(currentActivities);
  const heartRateStats = calculateHeartRateStats(currentActivities);
  const paceHeartRateTrend = calculatePaceHeartRateTrend(currentActivities);
  const trainingLoadRatios = calculateTrainingLoadRatio(weeklyStats);
  const regularity = calculateRegularityScore(currentActivities);
  const longRuns = detectLongRuns(currentActivities, weeklyStats);
  const personalBests = detectPersonalBests(currentActivities, weeklyStats);
  const elevationStats = calculateElevationStats(currentActivities);
  const correlations = calculateCorrelations(currentActivities, weeklyStats);
  const insights = generateRunningInsights(currentActivities, weeklyStats, comparisonStats, {
    heartRateStats,
    paceHeartRateTrend,
    trainingLoadRatios,
    regularity,
    longRuns,
    personalBests,
    elevationStats,
    correlations,
  });

  return {
    status: {
      stravaConnected: true,
      dataSynced: Boolean(user.fullSyncCompletedAt || user.lastSyncAt),
      lastSyncAt: user.lastSyncAt || user.fullSyncCompletedAt || null,
      totalRunningActivities: activities.length,
      analyzedActivities: currentActivities.length,
      partialAnalysis: currentActivities.some(a => !a.averageHeartRate) || heartRateStats.coverage < 1,
      heartRateAvailable: heartRateStats.count > 0,
      heartRatePartial: heartRateStats.count > 0 && heartRateStats.coverage < 0.7,
      trainingLoadPrecision: heartRateStats.coverage >= 0.7 ? 'heart_rate_based' : 'estimated_or_partial',
      hrMax,
    },
    period,
    previousPeriod,
    activities: currentActivities,
    allRunningActivityCount: activities.length,
    stats: globalStats,
    comparison: comparisonStats,
    weeklyStats,
    heartRateStats,
    paceHeartRateTrend,
    trainingLoadRatios,
    regularity,
    longRuns,
    elevationStats,
    personalBests,
    correlations,
    insights,
  };
}

async function getRunningAnalysis(userId, query = {}) {
  const period = parsePeriodQuery(query);
  const { user, hrMax, activities } = await getAllRunningActivities(userId, { triggerSync: true });
  return buildAnalysis(activities, period, user, hrMax);
}

async function getRunningActivities(userId, query = {}) {
  const period = parsePeriodQuery(query);
  const { activities } = await getAllRunningActivities(userId, { triggerSync: true });
  return filterActivitiesByPeriod(activities, period);
}

async function getRunningWeeklyStats(userId, query = {}) {
  const period = parsePeriodQuery(query);
  const { activities } = await getAllRunningActivities(userId);
  return calculateWeeklyStats(filterActivitiesByPeriod(activities, period));
}

async function getRunningInsights(userId, query = {}) {
  const analysis = await getRunningAnalysis(userId, query);
  return analysis.insights;
}

async function syncRunningData(userId) {
  await ensureStravaState(userId);
  syncUserActivities(userId, { enrich: true }).catch(err =>
    logger.error('[Running] Manual sync failed', { userId, error: err.message })
  );
  return { status: 'started' };
}

module.exports = {
  getRunningAnalysis,
  getRunningActivities,
  getRunningWeeklyStats,
  getRunningInsights,
  syncRunningData,
  buildAnalysis,
  parsePeriodQuery,
};
