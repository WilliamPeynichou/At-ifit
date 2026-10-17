const Activity = require('../models/Activity');
const User = require('../models/User');
const { upsertActivities, enrichActivityByStravaId, applyActivityDetail } = require('./stravaSync');
const { getValidStravaToken, getActivity } = require('../utils/stravaHelpers');
const logger = require('../utils/logger');
const cache = require('../utils/memoryCache');
const { invalidateUserDashboards } = require('./dashboardCache');

/**
 * Traite un événement Strava webhook
 * @param {Object} event - Payload Strava validé { object_type, aspect_type, object_id, owner_id }
 */
async function handleStravaEvent(event) {
  const { object_type, aspect_type, object_id, owner_id } = event;

  if (object_type !== 'activity') {
    logger.info('[Webhook] Événement ignoré (non-activité)', { object_type, aspect_type });
    return;
  }

  // Lookup direct par stravaAthleteId — O(1) au lieu de scanner tous les users
  const targetUser = await User.findOne({
    where: { stravaAthleteId: owner_id },
    attributes: ['id', 'stravaAccessToken', 'stravaRefreshToken', 'stravaExpiresAt', 'stravaAthleteId'],
  });

  if (!targetUser) {
    logger.warn('[Webhook] Propriétaire Strava introuvable en DB', { owner_id });
    return;
  }

  const userId = targetUser.id;

  if (aspect_type === 'create' || aspect_type === 'update') {
    try {
      const token = await getValidStravaToken(targetUser);
      if (!token) return;
      const raw = await getActivity(token, object_id, { userId });
      if (raw) {
        await upsertActivities([raw], userId);
        // Le détail vient d'être reçu : on l'applique et on pose detailFetchedAt,
        // pour que l'enrichissement ci-dessous ne refasse pas l'appel détail (seuls les streams restent).
        await applyActivityDetail(userId, object_id, raw);
        logger.info('[Webhook] Activité upsertée', { userId, activityId: object_id, aspect_type });

        // Auto-enrichissement (streams) en background
        enrichActivityByStravaId(object_id, userId)
          .then((result) => {
            if (result) {
              logger.info('[Webhook] Auto-enrichissement OK', {
                userId, activityId: object_id, detail: result.detailCalled, stream: result.streamCalled,
              });
            }
          })
          .catch(err =>
            logger.error('[Webhook] Erreur auto-enrichissement', { userId, object_id, error: err.message })
          );

        // Invalide le cache des stats athlète : nouvelle activité = totaux à recalculer
        cache.delete(`athlete-stats:${userId}`);
      }
    } catch (err) {
      logger.error('[Webhook] Erreur sync activité', { userId, object_id, error: err.message });
    }
  }

  if (aspect_type === 'delete') {
    const deleted = await Activity.destroy({ where: { stravaId: object_id, userId } });
    cache.delete(`athlete-stats:${userId}`);
    invalidateUserDashboards(userId);
    logger.info('[Webhook] Activité supprimée', { userId, object_id, deleted });
  }
}

module.exports = { handleStravaEvent };
