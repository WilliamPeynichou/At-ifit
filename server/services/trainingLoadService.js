const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const { activityLoad } = require('./stravaAnalytics');
const { resolveHrLimits } = require('./userMetricsService');

const ATL_DECAY = Math.exp(-1 / 7);
const CTL_DECAY = Math.exp(-1 / 42);

async function getTrainingLoad(userId, weeks = 10, { from = null, to = null } = {}) {
  let since;
  let until = new Date();
  if (from) {
    since = new Date(from);
    since = new Date(since.getTime() - 6 * 7 * 86400 * 1000);
  } else {
    since = new Date();
    since.setDate(since.getDate() - (weeks + 6) * 7);
  }
  if (to) until = new Date(to);

  const { hrMax, hrRest } = await resolveHrLimits(userId);

  const activities = await Activity.findAll({
    where: {
      userId,
      startDate: { [Op.gte]: since, [Op.lte]: until },
    },
    attributes: ['startDate', 'sufferScore', 'movingTime', 'distance', 'type', 'averageHeartrate'],
    order: [['startDate', 'ASC']],
  });

  if (activities.length === 0) return [];

  const dayMap = {};
  activities.forEach(a => {
    const day = new Date(a.startDate).toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { sufferScore: 0, distance: 0, count: 0 };
    const load = activityLoad(a, hrMax, hrRest) ?? 0;
    dayMap[day].sufferScore += load;
    dayMap[day].distance += (a.distance || 0) / 1000;
    dayMap[day].count += 1;
  });

  let atl = 0;
  let ctl = 0;

  const allDays = [];
  const cursor = new Date(since);
  const today = new Date(until);
  today.setHours(23, 59, 59);

  while (cursor <= today) {
    const dayKey = cursor.toISOString().slice(0, 10);
    const load = dayMap[dayKey]?.sufferScore || 0;

    atl = atl * ATL_DECAY + load * (1 - ATL_DECAY);
    ctl = ctl * CTL_DECAY + load * (1 - CTL_DECAY);

    allDays.push({
      date: dayKey,
      load,
      atl: parseFloat(atl.toFixed(1)),
      ctl: parseFloat(ctl.toFixed(1)),
      tsb: parseFloat((ctl - atl).toFixed(1)),
      distance: dayMap[dayKey]?.distance || 0,
      count: dayMap[dayKey]?.count || 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const weekMap = {};
  allDays.forEach(d => {
    const date = new Date(d.date);
    const day = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + 1);
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = {
        week: weekKey,
        weekLabel: monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        totalLoad: 0,
        activityCount: 0,
        totalDistance: 0,
        atl: d.atl,
        ctl: d.ctl,
        tsb: d.tsb,
      };
    }
    weekMap[weekKey].totalLoad += d.load;
    weekMap[weekKey].activityCount += d.count;
    weekMap[weekKey].totalDistance += d.distance;
    weekMap[weekKey].atl = d.atl;
    weekMap[weekKey].ctl = d.ctl;
    weekMap[weekKey].tsb = d.tsb;
  });

  return Object.values(weekMap)
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-weeks)
    .map(w => ({
      ...w,
      totalLoad: Math.round(w.totalLoad),
      totalDistance: parseFloat(w.totalDistance.toFixed(1)),
      status: w.tsb > 5 ? 'fresh' : w.tsb < -10 ? 'overload' : 'optimal',
    }));
}

module.exports = { getTrainingLoad, ATL_DECAY, CTL_DECAY };
