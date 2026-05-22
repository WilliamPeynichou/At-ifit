const Activity = require('../models/Activity');
const User = require('../models/User');
const { syncUserActivities, syncSince } = require('./stravaSync');
const { resolveMaxHeartrate } = require('./userMetricsService');
const { getCyclingProfile } = require('./cyclingProfileService');
const logger = require('../utils/logger');
const {
  filterCyclingActivities,
  filterActivitiesByPeriod,
  getPreviousPeriod,
  calculateCyclingGlobalStats,
  calculateCyclingComparisonStats,
  calculateWeeklyCyclingStats,
  calculateCyclingTrainingLoad,
  calculateCyclingTrainingLoadRatio,
  calculateCyclingRegularityScore,
  detectLongRides,
  detectCyclingPersonalBests,
  calculateCyclingCorrelations,
  normalizePeriod,
} = require('../utils/cyclingMetrics');
const { generateCyclingInsights } = require('../utils/cyclingInsights');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return value === true || value === 'true' || value === '1';
}

function parsePeriodQuery(query = {}) {
  return {
    preset: query.period || query.preset || '30D',
    from: query.from || null,
    to: query.to || null,
  };
}

function parseCyclingOptions(query = {}) {
  return {
    includeGravel: parseBoolean(query.includeGravel, true),
    includeVirtual: parseBoolean(query.includeVirtual, false),
    includeEbike: parseBoolean(query.includeEbike, false),
  };
}

async function ensureStravaState(userId, { triggerSync = false } = {}) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError('User not found', 404);
  if (!user.stravaAccessToken) throw createHttpError('Strava not connected. Please connect your Strava account first.', 400);

  if (triggerSync) {
    if (!user.fullSyncCompletedAt) {
      syncUserActivities(userId, { enrich: true }).catch(err =>
        logger.error('[CyclingDashboard] Full sync auto failed', { userId, error: err.message })
      );
    } else {
      const lastSync = user.lastSyncAt ? new Date(user.lastSyncAt) : null;
      if (!lastSync || Date.now() - lastSync.getTime() > 10 * 60 * 1000) {
        const since = lastSync ? Math.floor(lastSync.getTime() / 1000) : Math.floor((Date.now() - 7 * 86400 * 1000) / 1000);
        syncSince(userId, since).catch(err =>
          logger.error('[CyclingDashboard] Incremental sync auto failed', { userId, error: err.message })
        );
      }
    }
  }
  return user;
}

function calculateSpeedHeartRateTrend(activities) {
  const withHr = activities.filter(a => a.averageHeartRate && a.averageSpeedKmh);
  if (withHr.length < 4) return { available: false };
  const midpoint = Math.floor(withHr.length / 2);
  const first = withHr.slice(0, midpoint);
  const second = withHr.slice(midpoint);
  const avg = (list, key) => list.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / list.length;
  return {
    available: true,
    speedDelta: Math.round((avg(second, 'averageSpeedKmh') - avg(first, 'averageSpeedKmh')) * 10) / 10,
    heartRateDelta: Math.round(avg(second, 'averageHeartRate') - avg(first, 'averageHeartRate')),
  };
}

async function getCyclingUserProfile(userId) {
  const [profile, hrMaxResolved] = await Promise.all([
    getCyclingProfile(userId),
    resolveMaxHeartrate(userId),
  ]);
  return {
    weightKg: profile.weight || null,
    ftp: profile.ftp || null,
    ftpSource: profile.ftpSource || null,
    ftpConfidence: profile.ftpConfidence || null,
    ftpNote: profile.ftpNote || null,
    powerZones: profile.powerZones || [],
    estimatedMaxHeartRate: hrMaxResolved.value || profile.maxHeartrate || 190,
    maxHeartRateSource: hrMaxResolved.source,
    maxHeartRateConfidence: hrMaxResolved.confidence,
    restHeartrate: profile.restHeartrate || null,
    rawProfile: profile,
  };
}

async function getAllCyclingActivities(userId, query = {}, { triggerSync = false } = {}) {
  const [user, userProfile, rows] = await Promise.all([
    ensureStravaState(userId, { triggerSync }),
    getCyclingUserProfile(userId),
    Activity.findAll({ where: { userId }, order: [['startDate', 'ASC']], limit: 5000 }),
  ]);
  const options = parseCyclingOptions(query);
  const activities = filterCyclingActivities(rows, options, userProfile);
  activities.forEach(activity => {
    activity.trainingLoad = calculateCyclingTrainingLoad(activity, userProfile);
  });
  return { user, userProfile, activities, options };
}

function buildAnalysis(activities, periodInput, user, userProfile, options) {
  const period = normalizePeriod(periodInput);
  const previousPeriod = getPreviousPeriod(period);
  const currentActivities = filterActivitiesByPeriod(activities, period);
  const previousActivities = previousPeriod ? filterActivitiesByPeriod(activities, previousPeriod) : [];
  const globalStats = calculateCyclingGlobalStats(currentActivities, userProfile);
  const comparisonStats = calculateCyclingComparisonStats(currentActivities, previousActivities, userProfile);
  const weeklyStats = calculateWeeklyCyclingStats(currentActivities);
  const trainingLoadRatios = calculateCyclingTrainingLoadRatio(weeklyStats);
  const regularity = calculateCyclingRegularityScore(currentActivities);
  const longRides = detectLongRides(currentActivities, weeklyStats);
  const personalBests = detectCyclingPersonalBests(currentActivities, weeklyStats);
  const correlations = calculateCyclingCorrelations(currentActivities, weeklyStats);
  const speedHeartRateTrend = calculateSpeedHeartRateTrend(currentActivities);
  const insights = generateCyclingInsights(currentActivities, weeklyStats, globalStats, comparisonStats, {
    trainingLoadRatios,
    regularity,
    longRides,
    personalBests,
    correlations,
    speedHeartRateTrend,
  });

  return {
    status: {
      stravaConnected: true,
      dataSynced: Boolean(user.fullSyncCompletedAt || user.lastSyncAt),
      lastSyncAt: user.lastSyncAt || user.fullSyncCompletedAt || null,
      totalCyclingActivities: activities.length,
      analyzedActivities: currentActivities.length,
      partialAnalysis: currentActivities.some(a => !a.averageHeartRate || (!a.averageWatts && !a.weightedAverageWatts)),
      heartRateAvailable: globalStats.heartRateCoverage > 0,
      heartRatePartial: globalStats.heartRateCoverage > 0 && globalStats.heartRateCoverage < 0.7,
      powerAvailable: globalStats.powerStats.coverage > 0,
      powerPartial: globalStats.powerStats.coverage > 0 && globalStats.powerStats.coverage < 0.7,
      cadenceAvailable: globalStats.cadenceCoverage > 0,
      ftpAvailable: Boolean(userProfile.ftp),
      weightAvailable: Boolean(userProfile.weightKg),
      trainingLoadPrecision: userProfile.ftp && globalStats.powerStats.coverage > 0 ? 'power_ftp_based' : globalStats.heartRateCoverage >= 0.7 ? 'heart_rate_based' : 'estimated_or_partial',
      userProfile,
      options,
    },
    period,
    previousPeriod,
    activities: currentActivities,
    allCyclingActivityCount: activities.length,
    stats: globalStats,
    comparison: comparisonStats,
    weeklyStats,
    trainingLoadRatios,
    regularity,
    longRides,
    personalBests,
    correlations,
    speedHeartRateTrend,
    insights,
  };
}

async function getCyclingAnalysis(userId, query = {}) {
  const { user, userProfile, activities, options } = await getAllCyclingActivities(userId, query, { triggerSync: true });
  return buildAnalysis(activities, parsePeriodQuery(query), user, userProfile, options);
}

async function getCyclingActivities(userId, query = {}) {
  const { activities } = await getAllCyclingActivities(userId, query, { triggerSync: true });
  return filterActivitiesByPeriod(activities, parsePeriodQuery(query));
}

async function getCyclingWeeklyStats(userId, query = {}) {
  const { activities } = await getAllCyclingActivities(userId, query);
  return calculateWeeklyCyclingStats(filterActivitiesByPeriod(activities, parsePeriodQuery(query)));
}

async function getCyclingDashboardInsights(userId, query = {}) {
  return (await getCyclingAnalysis(userId, query)).insights;
}

async function syncCyclingData(userId) {
  await ensureStravaState(userId);
  syncUserActivities(userId, { enrich: true }).catch(err =>
    logger.error('[CyclingDashboard] Manual sync failed', { userId, error: err.message })
  );
  return { status: 'started' };
}

module.exports = {
  getCyclingAnalysis,
  getCyclingActivities,
  getCyclingWeeklyStats,
  getCyclingDashboardInsights,
  syncCyclingData,
  parseCyclingOptions,
  parsePeriodQuery,
  buildAnalysis,
};
