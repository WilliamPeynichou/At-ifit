const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { syncUserActivities, syncSince } = require('./stravaSync');
const { resolveMaxHeartrate } = require('./userMetricsService');
const { getOrCompute, dashKey, DASHBOARD_TTL_SECONDS } = require('./dashboardCache');
const {
  RUNNING_TYPES,
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

const STALE_SYNC_MS = (parseInt(process.env.STRAVA_STALE_MINUTES, 10) || 60) * 60 * 1000;

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
      if (!lastSync || Date.now() - lastSync.getTime() > STALE_SYNC_MS) {
        const since = lastSync
          ? Math.floor(lastSync.getTime() / 1000)
          : Math.floor((Date.now() - 14 * 86400 * 1000) / 1000);
        syncSince(userId, since).catch(err =>
          logger.error('[Running] Incremental sync auto failed', { userId, error: err.message })
        );
      }
    }
  }

  return user;
}

// Pré-filtre SQL : sur-ensemble du filtre JS isRunningActivity (qui reste en place).
// Transition documentée : une ligne sans sportType (sync entre migration et Lot B4) dont seul
// raw.sport_type matche n'est pas remontée ; le backfill Lot C couvre toutes les lignes avec raw.
const RUNNING_SQL_TYPES = [...RUNNING_TYPES];

function runningWhere(userId) {
  return {
    userId,
    [Op.or]: [
      { type: { [Op.in]: RUNNING_SQL_TYPES } },
      { sportType: { [Op.in]: RUNNING_SQL_TYPES } },
    ],
  };
}

// Données non mises en cache : FC max + activités normalisées (raw / summaryPolyline non lus ici).
async function loadRunningDataset(userId) {
  const [hrMaxResolved, rows] = await Promise.all([
    resolveMaxHeartrate(userId),
    Activity.findAll({
      where: runningWhere(userId),
      attributes: { exclude: ['raw', 'summaryPolyline'] },
      order: [['startDate', 'ASC']],
      limit: 5000,
    }),
  ]);

  const activities = filterRunningActivities(rows);
  activities.forEach(activity => {
    activity.trainingLoad = calculateTrainingLoad(activity, hrMaxResolved.value);
    activity.trainingLoadSource = activity.averageHeartRate ? 'heart_rate' : 'estimated_without_hr';
  });

  return {
    hrMax: {
      value: hrMaxResolved.value,
      source: hrMaxResolved.source || 'default',
      confidence: hrMaxResolved.confidence || 'low',
    },
    activities,
  };
}

// Champs de statut dépendant de l'user : recomposés à chaque appel, hors cache.
function withFreshSyncStatus(analysis, user) {
  return {
    ...analysis,
    status: {
      ...analysis.status,
      dataSynced: Boolean(user.fullSyncCompletedAt || user.lastSyncAt),
      lastSyncAt: user.lastSyncAt || user.fullSyncCompletedAt || null,
    },
  };
}

function buildAnalysis(activities, periodInput, user, hrMax) {
  const period = normalizePeriod(periodInput);
  const previousPeriod = getPreviousPeriod(period);
  const currentActivities = filterActivitiesByPeriod(activities, period);
  const previousActivities = previousPeriod ? filterActivitiesByPeriod(activities, previousPeriod) : [];
  const globalStats = calculateGlobalStats(currentActivities);
  const comparisonStats = calculateComparisonStats(currentActivities, previousActivities);
  const weeklyStats = calculateWeeklyStats(currentActivities, period);
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
  const user = await ensureStravaState(userId, { triggerSync: true });
  const analysis = await getOrCompute(
    dashKey(userId, 'running', { view: 'analysis', preset: period.preset, from: period.from, to: period.to }),
    DASHBOARD_TTL_SECONDS,
    async () => {
      const { hrMax, activities } = await loadRunningDataset(userId);
      return buildAnalysis(activities, period, user, hrMax);
    }
  );
  return withFreshSyncStatus(analysis, user);
}

async function getRunningActivities(userId, query = {}) {
  const period = parsePeriodQuery(query);
  await ensureStravaState(userId, { triggerSync: true });
  return getOrCompute(
    dashKey(userId, 'running', { view: 'activities', preset: period.preset, from: period.from, to: period.to }),
    DASHBOARD_TTL_SECONDS,
    async () => {
      const { activities } = await loadRunningDataset(userId);
      return filterActivitiesByPeriod(activities, period);
    }
  );
}

async function getRunningWeeklyStats(userId, query = {}) {
  const period = parsePeriodQuery(query);
  await ensureStravaState(userId);
  return getOrCompute(
    dashKey(userId, 'running', { view: 'weekly', preset: period.preset, from: period.from, to: period.to }),
    DASHBOARD_TTL_SECONDS,
    async () => {
      const { activities } = await loadRunningDataset(userId);
      return calculateWeeklyStats(filterActivitiesByPeriod(activities, period), period);
    }
  );
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
