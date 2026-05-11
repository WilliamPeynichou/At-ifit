const { Op } = require('sequelize');
const Activity = require('../models/Activity');

/**
 * Calcule ATL (7j), CTL (42j) et TSB (forme) par semaine
 * ATL = charge aiguë (fatigue court terme)
 * CTL = charge chronique (forme long terme)
 * TSB = CTL - ATL (positif = frais, négatif = fatigué)
 *
 * Retourne les 10 dernières semaines avec ces métriques
 */
async function getTrainingLoad(userId, weeks = 10, { from = null, to = null } = {}) {
  let since;
  let until = new Date();
  if (from) {
    since = new Date(from);
    // 6 semaines avant pour bootstrap CTL
    since = new Date(since.getTime() - 6 * 7 * 86400 * 1000);
  } else {
    since = new Date();
    since.setDate(since.getDate() - (weeks + 6) * 7);
  }
  if (to) until = new Date(to);

  const activities = await Activity.findAll({
    where: {
      userId,
      startDate: { [Op.gte]: since, [Op.lte]: until },
    },
    attributes: ['startDate', 'sufferScore', 'movingTime', 'distance', 'type'],
    order: [['startDate', 'ASC']],
  });

  if (activities.length === 0) return [];

  // Groupe par jour (timestamp → sufferScore du jour)
  const dayMap = {};
  activities.forEach(a => {
    const day = new Date(a.startDate).toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { sufferScore: 0, distance: 0, count: 0 };
    dayMap[day].sufferScore += a.sufferScore || 0;
    dayMap[day].distance += (a.distance || 0) / 1000;
    dayMap[day].count += 1;
  });

  // Calcul ATL (EWMA 7j) et CTL (EWMA 42j) jour par jour
  const kATL = 2 / (7 + 1);
  const kCTL = 2 / (42 + 1);

  let atl = 0;
  let ctl = 0;

  // Parcourt tous les jours depuis `since` jusqu'à `until`
  const allDays = [];
  const cursor = new Date(since);
  const today = new Date(until);
  today.setHours(23, 59, 59);

  while (cursor <= today) {
    const dayKey = cursor.toISOString().slice(0, 10);
    const load = dayMap[dayKey]?.sufferScore || 0;

    atl = atl + kATL * (load - atl);
    ctl = ctl + kCTL * (load - ctl);

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

  // Agrège par semaine (lundi → dimanche) pour l'affichage
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
        // On prend ATL/CTL/TSB du dernier jour de la semaine (dimanche)
        atl: d.atl,
        ctl: d.ctl,
        tsb: d.tsb,
      };
    }
    weekMap[weekKey].totalLoad += d.load;
    weekMap[weekKey].activityCount += d.count;
    weekMap[weekKey].totalDistance += d.distance;
    // Mettre à jour avec la dernière valeur du jour de la semaine
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

module.exports = { getTrainingLoad };
