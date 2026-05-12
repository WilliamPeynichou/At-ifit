const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const User = require('../models/User');
const { Op } = require('sequelize');
const { resolveHrLimits } = require('./userMetricsService');

const SEC_PER_DAY = 86400;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isoDate = (d) => startOfDay(d).toISOString().slice(0, 10);

/**
 * Calcule le TRIMP (équivalent suffer_score) si manquant, sinon retourne suffer_score
 * Méthode Banister : TRIMP = duration * avgHR_ratio * 0.64 * e^(1.92 * avgHR_ratio)
 */
function activityLoad(act, hrMax = 190, hrRest = 60) {
  if (act.sufferScore) return act.sufferScore;
  if (!act.averageHeartrate || !act.movingTime) return null;

  const hrRatio = (act.averageHeartrate - hrRest) / (hrMax - hrRest);
  if (hrRatio <= 0) return 0;

  const durMin = act.movingTime / 60;
  const trimp = durMin * hrRatio * 0.64 * Math.exp(1.92 * hrRatio);
  return Math.round(trimp);
}

/**
 * CTL/ATL/TSB sur 90 jours : moyenne mobile exponentielle 42j / 7j
 */
function computeFormCurve(activities, days = 90, hrMax = 190, hrRest = 60) {
  const today = startOfDay(new Date());
  const startDate = new Date(today.getTime() - days * SEC_PER_DAY * 1000);

  // Charge par jour
  const dailyLoad = new Map();
  for (const a of activities) {
    if (!a.startDate) continue;
    const d = isoDate(a.startDate);
    const load = activityLoad(a, hrMax, hrRest) || 0;
    dailyLoad.set(d, (dailyLoad.get(d) || 0) + load);
  }

  const ctlDecay = Math.exp(-1 / 42);
  const atlDecay = Math.exp(-1 / 7);
  let ctl = 0;
  let atl = 0;
  const curve = [];

  // Itère du début à aujourd'hui pour bootstraper avec les 30j précédents
  const bootstrapStart = new Date(today.getTime() - (days + 42) * SEC_PER_DAY * 1000);
  for (let d = new Date(bootstrapStart); d <= today; d.setDate(d.getDate() + 1)) {
    const key = isoDate(d);
    const load = dailyLoad.get(key) || 0;
    ctl = ctl * ctlDecay + load * (1 - ctlDecay);
    atl = atl * atlDecay + load * (1 - atlDecay);

    if (d >= startDate) {
      curve.push({
        date: key,
        ctl: Math.round(ctl * 10) / 10,
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round((ctl - atl) * 10) / 10,
        load,
      });
    }
  }

  return curve;
}

/**
 * Time in zones HR (Z1-Z5) à partir des streams cachés
 * Zones par défaut Karvonen : Z1 50-60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 90-100%
 */
function timeInHrZones(streamRow, hrMax = 190, hrRest = 60) {
  if (!streamRow?.heartrate || !streamRow?.time) return null;
  const hr = streamRow.heartrate;
  const t = streamRow.time;
  if (hr.length !== t.length || hr.length < 2) return null;

  const reserve = hrMax - hrRest;
  const zoneBounds = [0.5, 0.6, 0.7, 0.8, 0.9, 1.01].map(p => hrRest + p * reserve);
  const zones = [0, 0, 0, 0, 0];

  for (let i = 1; i < hr.length; i++) {
    const dt = t[i] - t[i - 1];
    const v = hr[i];
    if (!v || dt <= 0) continue;
    for (let z = 0; z < 5; z++) {
      if (v >= zoneBounds[z] && v < zoneBounds[z + 1]) {
        zones[z] += dt;
        break;
      }
    }
  }
  return zones; // [Z1s, Z2s, Z3s, Z4s, Z5s]
}

/**
 * Mean-Max Power : meilleure puissance soutenue pour chaque durée (1s, 5s, 30s, 1min, 5min, 20min, 60min)
 * À partir de tous les streams watts d'un user.
 */
function computeMeanMaxPower(streamRows) {
  const durations = [1, 5, 15, 30, 60, 300, 600, 1200, 1800, 3600];
  const bests = new Map(durations.map(d => [d, 0]));

  for (const row of streamRows) {
    const watts = row.watts;
    const time = row.time;
    if (!watts || !time || watts.length < 5) continue;

    // Pour chaque durée cible, glissement
    for (const dur of durations) {
      let bestForRow = 0;
      let sum = 0;
      let windowStart = 0;

      for (let i = 0; i < watts.length; i++) {
        sum += watts[i] || 0;
        while (windowStart < i && time[i] - time[windowStart] > dur) {
          sum -= watts[windowStart] || 0;
          windowStart++;
        }
        const windowDur = time[i] - time[windowStart];
        if (windowDur >= dur * 0.95) {
          const avg = sum / (i - windowStart + 1);
          if (avg > bestForRow) bestForRow = avg;
        }
      }
      if (bestForRow > bests.get(dur)) bests.set(dur, bestForRow);
    }
  }

  return Array.from(bests.entries()).map(([duration, power]) => ({
    duration,
    power: Math.round(power),
  }));
}

/**
 * Mean-Max Pace : meilleure allure soutenue pour les distances 1k, 5k, 10k, 21k, 42k
 * À partir des best_efforts détaillés OU des streams (distance/time)
 */
function computeBestEfforts(activities) {
  const targets = [
    { name: '400m', meters: 400 },
    { name: '1k', meters: 1000 },
    { name: '5k', meters: 5000 },
    { name: '10k', meters: 10000 },
    { name: '15k', meters: 15000 },
    { name: '21k', meters: 21097.5 },
    { name: '42k', meters: 42195 },
  ];

  const results = targets.map(t => ({ ...t, time: null, date: null, activityId: null }));

  for (const a of activities) {
    if (!a.bestEfforts) continue;
    for (const eff of a.bestEfforts) {
      const target = results.find(r => r.name === eff.name);
      if (!target) continue;
      if (!target.time || eff.elapsed_time < target.time) {
        target.time = eff.elapsed_time;
        target.date = a.startDate;
        target.activityId = a.stravaId;
      }
    }
  }
  return results.filter(r => r.time);
}

/**
 * Records globaux : plus longue sortie, plus gros D+, plus rapide, top kudos, etc.
 */
function computeRecords(activities) {
  if (!activities.length) return {};

  const safeMax = (key) => {
    const valid = activities.filter(a => a[key] != null && a[key] > 0);
    if (!valid.length) return null;
    return valid.reduce((best, a) => (a[key] > best[key] ? a : best), valid[0]);
  };

  return {
    longestDistance: safeMax('distance'),
    longestDuration: safeMax('movingTime'),
    biggestClimb: safeMax('totalElevationGain'),
    fastestSpeed: safeMax('maxSpeed'),
    highestSuffer: safeMax('sufferScore'),
    mostKudos: safeMax('kudosCount'),
    highestPower: safeMax('maxWatts'),
  };
}

/**
 * Heatmap calendrier : 365 jours, chaque jour = somme charge ou minutes
 */
function buildCalendarHeatmap(activities, days = 365, hrMax = 190, hrRest = 60) {
  const today = startOfDay(new Date());
  const start = new Date(today.getTime() - days * SEC_PER_DAY * 1000);

  const map = new Map();
  for (const a of activities) {
    if (!a.startDate) continue;
    const d = new Date(a.startDate);
    if (d < start) continue;
    const key = isoDate(d);
    const existing = map.get(key) || { date: key, count: 0, distance: 0, duration: 0, load: 0 };
    existing.count += 1;
    existing.distance += a.distance || 0;
    existing.duration += a.movingTime || 0;
    existing.load += activityLoad(a, hrMax, hrRest) || 0;
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Streak (jours consécutifs avec activité) — courant et record
 */
function computeStreaks(activities) {
  const days = new Set(
    activities
      .filter(a => a.startDate)
      .map(a => isoDate(a.startDate))
  );

  if (!days.size) return { current: 0, longest: 0 };

  const sorted = Array.from(days).sort();
  let longest = 1;
  let cur = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const next = new Date(sorted[i]);
    const diff = Math.round((next - prev) / (SEC_PER_DAY * 1000));
    if (diff === 1) {
      cur++;
      if (cur > longest) longest = cur;
    } else {
      cur = 1;
    }
  }

  // Streak courant : compte rétrograde depuis aujourd'hui
  const today = isoDate(new Date());
  let current = 0;
  const cursor = new Date();
  while (days.has(isoDate(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}

/**
 * Construit le clause `where.startDate` à partir d'un range { from, to }
 */
function buildDateWhere(from, to) {
  if (!from && !to) return null;
  const clause = {};
  if (from) clause[Op.gte] = new Date(from);
  if (to) clause[Op.lte] = new Date(to);
  return clause;
}

/**
 * Summary global pour la modale Year in Sport / KPIs
 */
async function getAnalyticsSummary(userId, { from = null, to = null } = {}) {
  const where = { userId };
  const dateClause = buildDateWhere(from, to);
  if (dateClause) where.startDate = dateClause;

  const [activities, hrLimits] = await Promise.all([
    Activity.findAll({
      where,
      attributes: { exclude: ['raw'] },
      order: [['startDate', 'ASC']],
    }),
    resolveHrLimits(userId),
  ]);

  if (!activities.length) {
    return {
      from, to,
      totals: null,
      bySport: [],
      records: {},
      streaks: { current: 0, longest: 0 },
      calendar: [],
      formCurve: [],
      bestEfforts: [],
      hrLimits,
    };
  }

  // Totaux
  const totals = activities.reduce((acc, a) => {
    acc.count += 1;
    acc.distance += a.distance || 0;
    acc.movingTime += a.movingTime || 0;
    acc.elevation += a.totalElevationGain || 0;
    acc.calories += (a.calories || 0);
    acc.kudos += (a.kudosCount || 0);
    acc.pr += (a.prCount || 0);
    return acc;
  }, { count: 0, distance: 0, movingTime: 0, elevation: 0, calories: 0, kudos: 0, pr: 0 });

  // Par sport
  const sportMap = new Map();
  for (const a of activities) {
    const type = a.type || 'Other';
    const s = sportMap.get(type) || {
      type, count: 0, distance: 0, movingTime: 0, elevation: 0,
      avgHr: 0, avgHrCount: 0, avgPace: 0, avgPaceCount: 0
    };
    s.count += 1;
    s.distance += a.distance || 0;
    s.movingTime += a.movingTime || 0;
    s.elevation += a.totalElevationGain || 0;
    if (a.averageHeartrate) {
      s.avgHr += a.averageHeartrate;
      s.avgHrCount += 1;
    }
    if (a.averageSpeed) {
      s.avgPace += a.averageSpeed;
      s.avgPaceCount += 1;
    }
    sportMap.set(type, s);
  }
  const bySport = Array.from(sportMap.values()).map(s => ({
    type: s.type,
    count: s.count,
    distance: s.distance,
    movingTime: s.movingTime,
    elevation: s.elevation,
    avgHr: s.avgHrCount ? s.avgHr / s.avgHrCount : null,
    avgSpeed: s.avgPaceCount ? s.avgPace / s.avgPaceCount : null,
  }));

  const records = computeRecords(activities);
  const streaks = computeStreaks(activities);

  // Calendar/FormCurve : si une plage temporelle est définie, on adapte la fenêtre
  let calendarDays = 365;
  let formDays = 90;
  if (from && to) {
    const diffDays = Math.round((new Date(to) - new Date(from)) / (86400 * 1000));
    calendarDays = Math.max(30, diffDays);
    formDays = Math.max(30, Math.min(diffDays, 180));
  }

  const calendar = buildCalendarHeatmap(activities, calendarDays, hrLimits.hrMax, hrLimits.hrRest);
  const formCurve = computeFormCurve(activities, formDays, hrLimits.hrMax, hrLimits.hrRest);
  const bestEfforts = computeBestEfforts(activities);

  return {
    from, to,
    totals,
    bySport,
    records,
    streaks,
    calendar,
    formCurve,
    bestEfforts,
    hrLimits,
  };
}

/**
 * Time in zones cumulé (semaine ou mois) à partir de tous les streams
 */
async function getTimeInZones(userId, { hrMax = null, hrRest = null, from = null, to = null } = {}) {
  const where = { userId };
  const dateClause = buildDateWhere(from, to);
  if (dateClause) where.startDate = dateClause;

  const [activities, hrLimits] = await Promise.all([
    Activity.findAll({
      where,
      attributes: ['id', 'stravaId', 'startDate', 'type'],
      include: [{ model: ActivityStream, required: true }],
    }),
    resolveHrLimits(userId, { hrMax, hrRest }),
  ]);

  const effectiveHrMax = hrLimits.hrMax;
  const effectiveHrRest = hrLimits.hrRest;

  const byWeek = new Map();
  const byActivity = [];

  for (const a of activities) {
    const stream = a.ActivityStream;
    const zones = timeInHrZones(stream, effectiveHrMax, effectiveHrRest);
    if (!zones) continue;

    byActivity.push({
      activityId: a.stravaId,
      date: a.startDate,
      type: a.type,
      zones,
    });

    const weekKey = isoWeek(a.startDate);
    const acc = byWeek.get(weekKey) || [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) acc[i] += zones[i];
    byWeek.set(weekKey, acc);
  }

  return {
    byActivity,
    byWeek: Array.from(byWeek.entries()).map(([week, zones]) => ({ week, zones })),
    hrLimits,
  };
}

function isoWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Mean-max power curve à partir des streams (vélo seulement)
 */
async function getPowerCurve(userId, { from = null, to = null } = {}) {
  const activityWhere = { userId, type: { [Op.in]: ['Ride', 'VirtualRide', 'EBikeRide'] } };
  const dateClause = buildDateWhere(from, to);
  if (dateClause) activityWhere.startDate = dateClause;

  const streams = await ActivityStream.findAll({
    include: [{
      model: Activity,
      where: activityWhere,
      attributes: ['type', 'startDate'],
    }],
    attributes: ['watts', 'time'],
  });

  return computeMeanMaxPower(streams);
}

/**
 * Heatmap GPS : retourne toutes les polylines (encodées) du user
 */
async function getGpsHeatmap(userId, { from = null, to = null } = {}) {
  const where = {
    userId,
    summaryPolyline: { [Op.ne]: null }
  };
  const dateClause = buildDateWhere(from, to);
  if (dateClause) where.startDate = dateClause;

  const activities = await Activity.findAll({
    where,
    attributes: ['stravaId', 'type', 'startDate', 'summaryPolyline', 'distance', 'totalElevationGain'],
    order: [['startDate', 'DESC']],
  });

  return activities.map(a => ({
    id: a.stravaId,
    type: a.type,
    date: a.startDate,
    polyline: a.summaryPolyline,
    distance: a.distance,
    elevation: a.totalElevationGain,
  }));
}

module.exports = {
  getAnalyticsSummary,
  getTimeInZones,
  getPowerCurve,
  getGpsHeatmap,
  // exposés pour tests
  computeFormCurve,
  computeRecords,
  computeStreaks,
  buildCalendarHeatmap,
  computeBestEfforts,
  computeMeanMaxPower,
  timeInHrZones,
  activityLoad,
};
