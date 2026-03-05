const Activity = require('../models/Activity');
const User = require('../models/User');
const { getValidStravaToken, fetchStravaActivities } = require('../utils/stravaHelpers');
const logger = require('../utils/logger');

/**
 * Mappe un objet activité Strava brut vers les colonnes de la table Activity
 */
function mapStravaActivity(raw, userId) {
  return {
    userId,
    stravaId: raw.id,
    type: raw.type || 'Other',
    name: raw.name || null,
    distance: raw.distance || 0,
    movingTime: raw.moving_time || 0,
    totalElevationGain: raw.total_elevation_gain || 0,
    averageSpeed: raw.average_speed || null,
    averageHeartrate: raw.average_heartrate || null,
    maxHeartrate: raw.max_heartrate || null,
    calories: raw.calories || null,
    sufferScore: raw.suffer_score || null,
    averageWatts: raw.average_watts || null,
    startDate: new Date(raw.start_date),
    commute: raw.commute || false,
    trainer: raw.trainer || false,
    gearId: raw.gear_id || null,
    raw: raw,
  };
}

/**
 * Upsert un tableau d'activités Strava en base locale
 */
async function upsertActivities(activities, userId) {
  if (!activities || activities.length === 0) return 0;

  let upserted = 0;
  for (const raw of activities) {
    try {
      const data = mapStravaActivity(raw, userId);
      await Activity.upsert(data, { conflictFields: ['stravaId'] });
      upserted++;
    } catch (err) {
      logger.warn('[StravaSync] Erreur upsert activité', { stravaId: raw.id, error: err.message });
    }
  }
  return upserted;
}

/**
 * Synchronise TOUTES les activités Strava d'un utilisateur (pagination complète)
 * Utilisé lors de la première connexion ou d'une re-sync manuelle
 */
async function syncUserActivities(userId) {
  const user = await User.findByPk(userId);
  if (!user || !user.stravaAccessToken) {
    logger.warn('[StravaSync] User sans token Strava', { userId });
    return { success: false, error: 'Strava non connecté' };
  }

  const accessToken = await getValidStravaToken(user);
  if (!accessToken) {
    return { success: false, error: 'Token Strava invalide' };
  }

  let page = 1;
  let totalSynced = 0;
  const PER_PAGE = 100;

  logger.info('[StravaSync] Début sync complète', { userId });

  while (true) {
    try {
      const batch = await fetchStravaActivities(accessToken, { per_page: PER_PAGE, page });

      if (!batch || batch.length === 0) break;

      const synced = await upsertActivities(batch, userId);
      totalSynced += synced;

      logger.info('[StravaSync] Page synchronisée', { userId, page, count: batch.length, total: totalSynced });

      if (batch.length < PER_PAGE) break;
      page++;

    } catch (err) {
      logger.error('[StravaSync] Erreur fetch page', { userId, page, error: err.message });
      break;
    }
  }

  logger.info('[StravaSync] Sync complète terminée', { userId, totalSynced });
  return { success: true, totalSynced };
}

/**
 * Synchronise les activités Strava depuis une date donnée (pour webhooks ou refresh partiel)
 */
async function syncSince(userId, afterTimestamp) {
  const user = await User.findByPk(userId);
  if (!user || !user.stravaAccessToken) {
    return { success: false, error: 'Strava non connecté' };
  }

  const accessToken = await getValidStravaToken(user);
  if (!accessToken) {
    return { success: false, error: 'Token Strava invalide' };
  }

  try {
    const activities = await fetchStravaActivities(accessToken, {
      per_page: 100,
      after: afterTimestamp
    });

    const synced = await upsertActivities(activities || [], userId);
    logger.info('[StravaSync] Sync partielle terminée', { userId, afterTimestamp, synced });
    return { success: true, synced };

  } catch (err) {
    logger.error('[StravaSync] Erreur sync partielle', { userId, error: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = { syncUserActivities, syncSince, upsertActivities, mapStravaActivity };
