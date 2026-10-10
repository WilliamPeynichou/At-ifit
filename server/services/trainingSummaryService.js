const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const { addParisDays, getParisDateISO, startOfParisWeekUtc } = require('../utils/dateFrance');

const WEEKS_ANALYZED = 12;
const RECENT_WEEKS = 4;
const LONGEST_LIMIT = 5;

const SPORT_TYPES = {
  running: ['Run', 'TrailRun', 'VirtualRun', 'TrackRun'],
  cycling: ['Ride', 'VirtualRide', 'GravelRide', 'EBikeRide'],
  swimming: ['Swim'],
};

const ALL_TYPES = Object.values(SPORT_TYPES).flat();

const round = (value, digits = 1) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const sportOf = (type) => Object.keys(SPORT_TYPES).find((sport) => SPORT_TYPES[sport].includes(type)) || null;

const emptySportStats = () => ({ sessions: 0, km: 0, seconds: 0, elevationM: 0, longestKm: 0 });

function finalizeSport(sport, stats) {
  const hours = stats.seconds / 3600;
  const km = stats.km;
  const paceApplies = sport === 'running' || sport === 'swimming';
  const speedApplies = sport === 'cycling';
  return {
    sessions: stats.sessions,
    weeklyKm: round(km / WEEKS_ANALYZED, 1),
    weeklyHours: round(hours / WEEKS_ANALYZED, 1),
    longestKm: round(stats.longestKm, 1),
    avgPaceMinKm: paceApplies && km > 0 ? round(stats.seconds / 60 / km, 2) : null,
    avgSpeedKmh: speedApplies && hours > 0 ? round(km / hours, 1) : null,
    weeklyElevationM: round(stats.elevationM / WEEKS_ANALYZED, 0),
  };
}

function computeTrend(recentAvgKm, previousAvgKm) {
  if (previousAvgKm <= 0) return recentAvgKm > 0 ? 'up' : 'stable';
  const ratio = recentAvgKm / previousAvgKm;
  if (ratio > 1.1) return 'up';
  if (ratio < 0.9) return 'down';
  return 'stable';
}

/**
 * Synthèse pure des activités (12 dernières semaines) : aucune donnée brute ni identifiant Strava.
 * @param {Array<object>} activities activités avec type, name, startDate, distance (m), movingTime (s), totalElevationGain (m)
 * @param {Date} [now]
 */
function buildTrainingSummary(activities, now = new Date()) {
  const weekStart = startOfParisWeekUtc(now);
  const windowStart = addParisDays(weekStart, -7 * (WEEKS_ANALYZED - 1));
  const recentStart = addParisDays(weekStart, -7 * (RECENT_WEEKS - 1));

  const bySport = { running: emptySportStats(), cycling: emptySportStats(), swimming: emptySportStats() };
  let recentKm = 0;
  let previousKm = 0;
  const candidates = [];

  for (const activity of activities || []) {
    const sport = sportOf(activity.type);
    const start = new Date(activity.startDate);
    if (!sport || Number.isNaN(start.getTime()) || start < windowStart) continue;

    const km = (Number(activity.distance) || 0) / 1000;
    const seconds = Number(activity.movingTime) || 0;
    const elevationM = Number(activity.totalElevationGain) || 0;
    const stats = bySport[sport];

    stats.sessions += 1;
    stats.km += km;
    stats.seconds += seconds;
    stats.elevationM += elevationM;
    stats.longestKm = Math.max(stats.longestKm, km);

    if (start >= recentStart) recentKm += km;
    else previousKm += km;

    candidates.push({
      date: getParisDateISO(start),
      type: activity.type,
      name: activity.name || null,
      distanceKm: round(km, 1),
      movingMinutes: round(seconds / 60, 0),
      elevationM: round(elevationM, 0),
      _km: km,
    });
  }

  const previousWeeks = WEEKS_ANALYZED - RECENT_WEEKS;
  const recentAvgKm = recentKm / RECENT_WEEKS;
  const previousAvgKm = previousKm / previousWeeks;

  const recentLongest = candidates
    .sort((a, b) => b._km - a._km)
    .slice(0, LONGEST_LIMIT)
    .map(({ _km, ...rest }) => rest);

  return {
    generatedAt: new Date(now).toISOString(),
    weeksAnalyzed: WEEKS_ANALYZED,
    bySport: {
      running: finalizeSport('running', bySport.running),
      cycling: finalizeSport('cycling', bySport.cycling),
      swimming: finalizeSport('swimming', bySport.swimming),
    },
    last4WeeksKm: round(recentKm, 1),
    trend: computeTrend(recentAvgKm, previousAvgKm),
    recentLongest,
  };
}

async function getTrainingSummary(userId, now = new Date()) {
  const windowStart = addParisDays(startOfParisWeekUtc(now), -7 * (WEEKS_ANALYZED - 1));
  const activities = await Activity.findAll({
    where: {
      userId,
      type: { [Op.in]: ALL_TYPES },
      startDate: { [Op.gte]: windowStart },
    },
    attributes: ['type', 'name', 'startDate', 'distance', 'movingTime', 'totalElevationGain'],
    raw: true,
  });
  return buildTrainingSummary(activities, now);
}

module.exports = { SPORT_TYPES, WEEKS_ANALYZED, buildTrainingSummary, getTrainingSummary };
