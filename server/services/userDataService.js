const sequelize = require('../database');
const { Op } = require('sequelize');
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const Weight = require('../models/Weight');
const Goal = require('../models/Goal');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');
const StravaApiLog = require('../models/StravaApiLog');
const AiUsageLog = require('../models/AiUsageLog');

const ALL_CATEGORIES = ['weights', 'goals', 'activities', 'refreshTokens'];

/** Champs de profil restitués à l'utilisateur (jamais mot de passe ni jetons Strava). */
const EXPORT_USER_FIELDS = [
  'id', 'email', 'pseudo', 'role', 'country', 'age', 'gender', 'height', 'targetWeight',
  'consoKcal', 'weeksToGoal', 'imc', 'maxHeartrate', 'restHeartrate', 'bikeType', 'cyclingGoal',
  'stravaAthleteId', 'lastSyncAt', 'fullSyncCompletedAt', 'lastLoginAt', 'createdAt', 'updatedAt',
];

async function deleteUserData(userId, categories, transaction) {
  const selected = categories && categories.length ? categories : ALL_CATEGORIES;
  const counts = {};

  if (selected.includes('activities')) {
    const activities = await Activity.findAll({ where: { userId }, attributes: ['id'], transaction });
    const activityIds = activities.map(a => a.id);
    counts.activityStreams = activityIds.length ? await ActivityStream.destroy({ where: { activityId: activityIds }, transaction }) : 0;
    counts.activities = await Activity.destroy({ where: { userId }, transaction });
  }
  if (selected.includes('weights')) counts.weights = await Weight.destroy({ where: { userId }, transaction });
  if (selected.includes('goals')) counts.goals = await Goal.destroy({ where: { userId }, transaction });
  if (selected.includes('refreshTokens')) counts.refreshTokens = await RefreshToken.destroy({ where: { userId }, transaction });

  return { categories: selected, counts };
}

/**
 * Suppression définitive d'un compte (droit à l'effacement, art. 17 RGPD).
 * Les journaux techniques contenant potentiellement des identifiants ou IP sont
 * supprimés en même temps que le compte (userId et actorUserId).
 */
async function deleteAccount(userId) {
  return sequelize.transaction(async transaction => {
    const dataDeletion = await deleteUserData(userId, [], transaction);
    // Ces journaux peuvent contenir IP, ID Strava, contexte d’usage ou métadonnées : les supprimer, pas seulement détacher userId.
    await AuditLog.destroy({ where: { [Op.or]: [{ userId }, { actorUserId: userId }] }, transaction });
    await StravaApiLog.destroy({ where: { userId }, transaction });
    await AiUsageLog.destroy({ where: { userId }, transaction });
    await User.destroy({ where: { id: userId }, transaction });
    return dataDeletion;
  });
}

/** Export portable (art. 15 et 20 RGPD) au format JSON lisible par machine. */
async function exportUserData(userId) {
  const user = await User.findByPk(userId, { attributes: EXPORT_USER_FIELDS });
  if (!user) return null;
  const [weights, goals, activities] = await Promise.all([
    Weight.findAll({ where: { userId }, order: [['date', 'ASC']] }),
    Goal.findAll({ where: { userId } }),
    Activity.findAll({ where: { userId }, order: [['id', 'ASC']] }),
  ]);
  const streams = activities.length
    ? await ActivityStream.findAll({ where: { activityId: activities.map(a => a.id) }, order: [['activityId', 'ASC']] })
    : [];
  return {
    exportedAt: new Date().toISOString(),
    format: 'atifit-export-v1',
    profile: user.toJSON(),
    weights: weights.map(w => w.toJSON()),
    goals: goals.map(g => g.toJSON()),
    activities: activities.map(a => a.toJSON()),
    activityStreams: streams.map(s => s.toJSON()),
  };
}

module.exports = { ALL_CATEGORIES, EXPORT_USER_FIELDS, deleteUserData, deleteAccount, exportUserData };
