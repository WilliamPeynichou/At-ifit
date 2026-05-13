const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const User = require('../models/User');
const {
  getValidStravaToken,
  fetchStravaActivities,
  getActivity,
  getActivityStreams,
} = require('../utils/stravaHelpers');
const logger = require('../utils/logger');

// Types de streams demandés à Strava (séries temporelles utiles pour l'analyse)
const STREAM_TYPES = [
  'time', 'distance', 'heartrate', 'watts', 'cadence',
  'velocity_smooth', 'altitude', 'latlng', 'grade_smooth', 'temp', 'moving'
];

// Parallélisation contrôlée : batchs de N requêtes en parallèle avec pause entre batchs.
// Strava limite à 100 req/15min. Batch de 5 + pause 1s = max 5 req/s = 300/min — on dépasserait
// le rate limit. Avec pause 4s entre batchs : 5 req/4s = 75/min = OK pour 15min cumulés.
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 4000;

// Mutex de sync : empêche les syncs parallèles pour un même user
const syncInFlight = new Map(); // userId -> Promise

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Mappe un objet activité Strava (résumé) vers les colonnes de la table Activity
 */
function mapStravaActivity(raw, userId) {
  return {
    userId,
    stravaId: raw.id,
    type: raw.type || 'Other',
    name: raw.name || null,
    distance: raw.distance || 0,
    movingTime: raw.moving_time || 0,
    elapsedTime: raw.elapsed_time || null,
    totalElevationGain: raw.total_elevation_gain || 0,
    averageSpeed: raw.average_speed || null,
    maxSpeed: raw.max_speed || null,
    averageHeartrate: raw.average_heartrate || null,
    maxHeartrate: raw.max_heartrate || null,
    hasHeartrate: raw.has_heartrate ?? null,
    calories: raw.calories || null,
    kilojoules: raw.kilojoules || null,
    sufferScore: raw.suffer_score || null,
    averageWatts: raw.average_watts || null,
    maxWatts: raw.max_watts || null,
    weightedAverageWatts: raw.weighted_average_watts || null,
    deviceWatts: raw.device_watts ?? null,
    averageCadence: raw.average_cadence || null,
    averageTemp: raw.average_temp ?? null,
    startDate: new Date(raw.start_date),
    commute: raw.commute || false,
    trainer: raw.trainer || false,
    gearId: raw.gear_id || null,
    workoutType: raw.workout_type ?? null,
    athleteCount: raw.athlete_count || null,
    kudosCount: raw.kudos_count || null,
    prCount: raw.pr_count || null,
    achievementCount: raw.achievement_count || null,
    summaryPolyline: raw.map?.summary_polyline || null,
    startLatlng: Array.isArray(raw.start_latlng) && raw.start_latlng.length === 2 ? raw.start_latlng : null,
    endLatlng: Array.isArray(raw.end_latlng) && raw.end_latlng.length === 2 ? raw.end_latlng : null,
    locationCity: raw.location_city || null,
    locationCountry: raw.location_country || null,
    raw: raw,
  };
}

/**
 * Mappe le détail d'une activité (endpoint /activities/{id}) vers les colonnes enrichies
 */
function mapStravaActivityDetail(detail) {
  return {
    bestEfforts: detail.best_efforts || null,
    splitsMetric: detail.splits_metric || null,
    laps: detail.laps || null,
    deviceName: detail.device_name || null,
    sufferScore: detail.suffer_score ?? null,
    calories: detail.calories ?? null,
    kilojoules: detail.kilojoules ?? null,
    detailFetchedAt: new Date(),
  };
}

/**
 * Mappe le résultat de /streams vers les colonnes de ActivityStream
 * Strava retourne un objet { type: { data, original_size, resolution } } quand key_by_type=true
 */
function mapStravaStreams(streams, activityId, stravaId) {
  const pick = (key) => streams?.[key]?.data || null;
  const firstResolution = Object.values(streams || {})[0]?.resolution || null;

  return {
    activityId,
    stravaId,
    time: pick('time'),
    distance: pick('distance'),
    heartrate: pick('heartrate'),
    watts: pick('watts'),
    cadence: pick('cadence'),
    velocitySmooth: pick('velocity_smooth'),
    altitude: pick('altitude'),
    latlng: pick('latlng'),
    gradeSmooth: pick('grade_smooth'),
    temp: pick('temp'),
    moving: pick('moving'),
    resolution: firstResolution,
    fetchedAt: new Date(),
  };
}

/**
 * Upsert un tableau d'activités Strava (résumé seulement) en base locale
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
 * Enrichit une activité avec son détail + streams (1 ou 2 appels API selon ce qui manque).
 * Idempotent : ne refait pas l'appel si déjà fait.
 * Pas de sleep interne — c'est le caller (enrichUserActivities) qui gère le throttling par batchs.
 */
async function enrichActivity(activity, accessToken, { force = false } = {}) {
  let detailCalled = false;
  let streamCalled = false;

  // 1. Détail activité (best_efforts, splits, laps)
  if (force || !activity.detailFetchedAt) {
    try {
      const detail = await getActivity(accessToken, activity.stravaId);
      const updates = mapStravaActivityDetail(detail);
      await Activity.update(updates, { where: { id: activity.id } });
      detailCalled = true;
    } catch (err) {
      logger.warn('[StravaSync] Échec fetch détail', { stravaId: activity.stravaId, error: err.message });
    }
  }

  // 2. Streams (séries temporelles)
  if (force || !activity.streamFetchedAt) {
    try {
      const streams = await getActivityStreams(accessToken, activity.stravaId, STREAM_TYPES);
      if (streams && Object.keys(streams).length > 0) {
        const streamData = mapStravaStreams(streams, activity.id, activity.stravaId);
        await ActivityStream.upsert(streamData, { conflictFields: ['activityId'] });
        await Activity.update({ streamFetchedAt: new Date() }, { where: { id: activity.id } });
      } else {
        // Activité sans stream (manuelle ?) — on marque comme fetched pour ne pas retenter
        await Activity.update({ streamFetchedAt: new Date() }, { where: { id: activity.id } });
      }
      streamCalled = true;
    } catch (err) {
      logger.warn('[StravaSync] Échec fetch streams', { stravaId: activity.stravaId, error: err.message });
    }
  }

  return { detailCalled, streamCalled };
}

/**
 * Enrichit une activité par son stravaId (utilisé par le webhook).
 * Récupère le token + l'Activity row en DB, puis appelle enrichActivity.
 */
async function enrichActivityByStravaId(stravaId, userId) {
  const activity = await Activity.findOne({ where: { stravaId, userId } });
  if (!activity) {
    logger.warn('[StravaSync] enrichActivityByStravaId : activité introuvable', { stravaId, userId });
    return null;
  }

  const user = await User.findByPk(userId);
  if (!user || !user.stravaAccessToken) return null;

  const accessToken = await getValidStravaToken(user);
  if (!accessToken) return null;

  return enrichActivity(activity, accessToken);
}

/**
 * Enrichit en masse les activités d'un user qui n'ont pas encore de détail/stream.
 * À appeler après la sync initiale OU pour rattraper le passif.
 */
async function enrichUserActivities(userId, { maxCount = 500, force = false } = {}) {
  const user = await User.findByPk(userId);
  if (!user || !user.stravaAccessToken) {
    return { success: false, error: 'Strava non connecté' };
  }

  const accessToken = await getValidStravaToken(user);
  if (!accessToken) return { success: false, error: 'Token Strava invalide' };

  const where = { userId };
  if (!force) {
    // On enrichit en priorité ce qui n'a aucune des deux infos
    const { Op } = require('sequelize');
    where[Op.or] = [
      { detailFetchedAt: null },
      { streamFetchedAt: null }
    ];
  }

  const activities = await Activity.findAll({
    where,
    order: [['startDate', 'DESC']],
    limit: maxCount,
  });

  logger.info('[StravaSync] Début enrichissement', { userId, count: activities.length, batchSize: BATCH_SIZE });

  let totalDetail = 0;
  let totalStream = 0;

  // Découpe en batchs et traite chaque batch en parallèle
  for (let i = 0; i < activities.length; i += BATCH_SIZE) {
    const batch = activities.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(activity => enrichActivity(activity, accessToken, { force }))
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.detailCalled) totalDetail++;
        if (r.value.streamCalled) totalStream++;
      }
    }

    // Pause entre batchs pour respecter rate limit (sauf après le dernier)
    if (i + BATCH_SIZE < activities.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  logger.info('[StravaSync] Enrichissement terminé', { userId, totalDetail, totalStream });
  return { success: true, totalDetail, totalStream };
}

/**
 * Synchronise TOUTES les activités Strava d'un utilisateur (pagination complète)
 * Puis lance l'enrichissement détail + streams en background.
 *
 * Mutex : si une sync est déjà en cours pour ce user, retourne la promise existante
 * au lieu d'en lancer une seconde. Évite les doubles appels Strava en cas de double-clic
 * ou de navigation rapide.
 */
async function syncUserActivities(userId, { enrich = true } = {}) {
  // Mutex : si déjà en cours, retourne la promise existante
  if (syncInFlight.has(userId)) {
    logger.info('[StravaSync] Sync déjà en cours, retour de la promise existante', { userId });
    return syncInFlight.get(userId);
  }

  const promise = _doSync(userId, { enrich }).finally(() => {
    syncInFlight.delete(userId);
  });

  syncInFlight.set(userId, promise);
  return promise;
}

async function _doSync(userId, { enrich = true } = {}) {
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

  const now = new Date();
  await User.update(
    { lastSyncAt: now, fullSyncCompletedAt: now },
    { where: { id: userId } }
  );
  logger.info('[StravaSync] Sync complète terminée', { userId, totalSynced });

  // Enrichissement détail + streams en background
  if (enrich) {
    enrichUserActivities(userId).catch(err =>
      logger.error('[StravaSync] Erreur enrichissement post-sync', { userId, error: err.message })
    );
  }

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
    if (synced > 0) {
      await User.update({ lastSyncAt: new Date() }, { where: { id: userId } });

      // Enrichit immédiatement les nouvelles activités
      enrichUserActivities(userId, { maxCount: synced }).catch(err =>
        logger.error('[StravaSync] Erreur enrichissement post-syncSince', { userId, error: err.message })
      );
    }
    logger.info('[StravaSync] Sync partielle terminée', { userId, afterTimestamp, synced });
    return { success: true, synced };

  } catch (err) {
    logger.error('[StravaSync] Erreur sync partielle', { userId, error: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = {
  syncUserActivities,
  syncSince,
  upsertActivities,
  enrichActivity,
  enrichActivityByStravaId,
  enrichUserActivities,
  mapStravaActivity,
  mapStravaActivityDetail,
  mapStravaStreams,
};
