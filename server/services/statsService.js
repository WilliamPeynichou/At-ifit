const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../database');
const Weight = require('../models/Weight');
const Activity = require('../models/Activity');

/**
 * Retourne poids moyen + volume d'entraînement par semaine (12 semaines)
 * Format : [{ week, weekLabel, avgWeight, totalDistance, activityCount, avgCalories }]
 */
async function getWeightPerformanceCorrelation(userId, weeks = 12) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  // Récupère tous les poids des N semaines
  const weights = await Weight.findAll({
    where: { userId, date: { [Op.gte]: since } },
    order: [['date', 'ASC']],
  });

  // Récupère toutes les activités des N semaines
  const activities = await Activity.findAll({
    where: { userId, startDate: { [Op.gte]: since } },
    attributes: ['distance', 'calories', 'movingTime', 'startDate', 'type'],
    order: [['startDate', 'ASC']],
  });

  // Groupe par numéro de semaine ISO
  const weekMap = {};

  const getWeekKey = (date) => {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    const year = d.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const weekNum = Math.ceil(((d - startOfYear) / 86400000 + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  };

  const getWeekLabel = (date) => {
    const d = new Date(date);
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    return monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  weights.forEach(w => {
    const key = getWeekKey(w.date);
    if (!weekMap[key]) weekMap[key] = { key, label: getWeekLabel(w.date), weights: [], activities: [] };
    weekMap[key].weights.push(parseFloat(w.weight));
  });

  activities.forEach(a => {
    const key = getWeekKey(a.startDate);
    if (!weekMap[key]) weekMap[key] = { key, label: getWeekLabel(a.startDate), weights: [], activities: [] };
    weekMap[key].activities.push(a);
  });

  return Object.values(weekMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, label, weights: wList, activities: aList }) => {
      const avgWeight = wList.length > 0
        ? parseFloat((wList.reduce((s, v) => s + v, 0) / wList.length).toFixed(1))
        : null;

      const totalDistance = parseFloat(
        (aList.reduce((s, a) => s + (a.distance || 0), 0) / 1000).toFixed(1)
      );

      const totalCalories = Math.round(
        aList.reduce((s, a) => s + (a.calories || 0), 0)
      );

      return {
        week: key,
        weekLabel: label,
        avgWeight,
        totalDistance,
        activityCount: aList.length,
        avgCalories: aList.length > 0 ? Math.round(totalCalories / aList.length) : 0,
        totalCalories,
      };
    });
}

module.exports = { getWeightPerformanceCorrelation };
