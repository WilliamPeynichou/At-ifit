const Activity = require('../models/Activity');
const User = require('../models/User');
const { syncSince, upsertActivities } = require('./stravaSync');
const { getValidStravaToken, getActivity } = require('../utils/stravaHelpers');
const logger = require('../utils/logger');

/**
 * Traite un événement Strava webhook
 * @param {Object} event - Payload Strava { object_type, aspect_type, object_id, owner_id }
 */
async function handleStravaEvent(event) {
  const { object_type, aspect_type, object_id, owner_id } = event;

  if (object_type !== 'activity') {
    logger.info('[Webhook] Événement ignoré (non-activité)', { object_type, aspect_type });
    return;
  }

  // Trouver l'utilisateur via son stravaId (stocké dans le profil athlète)
  // On cherche l'user ayant un token Strava valide — owner_id = ID athlète Strava
  const users = await User.findAll({
    where: { stravaAccessToken: { [require('sequelize').Op.not]: null } },
    attributes: ['id', 'stravaAccessToken', 'stravaRefreshToken', 'stravaExpiresAt'],
  });

  // Identifie l'user propriétaire via owner_id Strava
  let targetUser = null;
  for (const u of users) {
    // On utilise l'heuristique : si l'user a un token valide et que son owner_id correspond
    // (Pour la V2, stocker stravaAthleteId dans User serait mieux)
    // Ici on tente un fetch de l'activité avec chaque token jusqu'à succès
    try {
      const token = await getValidStravaToken(u);
      if (!token) continue;
      const act = await getActivity(token, object_id);
      if (act && act.athlete?.id === owner_id) {
        targetUser = u;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!targetUser) {
    logger.warn('[Webhook] Propriétaire Strava introuvable en DB', { owner_id, object_id });
    return;
  }

  const userId = targetUser.id;

  if (aspect_type === 'create' || aspect_type === 'update') {
    try {
      const token = await getValidStravaToken(targetUser);
      if (!token) return;
      const raw = await getActivity(token, object_id);
      if (raw) {
        await upsertActivities([raw], userId);
        logger.info('[Webhook] Activité upsertée', { userId, activityId: object_id, aspect_type });
      }
    } catch (err) {
      logger.error('[Webhook] Erreur sync activité', { userId, object_id, error: err.message });
    }
  }

  if (aspect_type === 'delete') {
    const deleted = await Activity.destroy({ where: { stravaId: object_id, userId } });
    logger.info('[Webhook] Activité supprimée', { userId, object_id, deleted });
  }
}

module.exports = { handleStravaEvent };
