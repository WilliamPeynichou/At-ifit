const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const { resolveHrLimits } = require('./userMetricsService');
const {
  ATL_DECAY,
  CTL_DECAY,
  PMC_BOOTSTRAP_DAYS,
  computePerformanceManagementChart,
} = require('./trainingMetricsService');

const DEFAULT_FORM_WINDOW_DAYS = 90;

async function getTrainingLoad(userId, weeks = 10, { from = null, to = null } = {}) {
  let since;
  let until = new Date();
  if (from) {
    since = new Date(from);
    since = new Date(since.getTime() - PMC_BOOTSTRAP_DAYS * 86400 * 1000);
  } else {
    since = new Date();
    const formWindowDays = Math.max(weeks * 7, DEFAULT_FORM_WINDOW_DAYS);
    since.setDate(since.getDate() - formWindowDays - PMC_BOOTSTRAP_DAYS);
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
    if (!dayMap[day]) dayMap[day] = { distance: 0, count: 0 };
    dayMap[day].distance += (a.distance || 0) / 1000;
    dayMap[day].count += 1;
  });

  const allDays = computePerformanceManagementChart(activities, {
    startDate: since,
    endDate: until,
    hrMax,
    hrRest,
  }).map(day => ({
    ...day,
    distance: dayMap[day.date]?.distance || 0,
    count: dayMap[day.date]?.count || 0,
  }));

  const weekMap = {};
  allDays.forEach(d => {
    const date = new Date(`${d.date}T00:00:00.000Z`);
    const day = date.getUTCDay() || 7;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - day + 1);
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
