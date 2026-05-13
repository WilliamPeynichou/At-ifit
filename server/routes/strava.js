const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const stravaRunningRoutes = require('./stravaRunning.routes');
const stravaSwimmingRoutes = require('./stravaSwimming.routes');
const stravaCyclingRoutes = require('./stravaCycling.routes');
const { syncUserActivities, syncSince, enrichUserActivities } = require('../services/stravaSync');
const {
  getAnalyticsSummary,
  getTimeInZones,
  getPowerCurve,
  getGpsHeatmap,
} = require('../services/stravaAnalytics');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { 
  getStravaCredentials, 
  getValidStravaToken, 
  fetchStravaActivities,
  getAthlete,
  getAthleteStats,
  getAthleteZones,
  getAthleteClubs,
  getActivity,
  getActivityStreams,
  getAthleteRoutes,
  getAthleteGear,
  getStarredSegments,
  revokeStravaToken
} = require('../utils/stravaHelpers');
const logger = require('../utils/logger');
const cache = require('../utils/memoryCache');

// TTLs pour les endpoints peu volatiles
const TTL_ATHLETE = 3600;     // 1h — profil quasi statique
const TTL_STATS = 1800;       // 30min — totaux changent à chaque activité
const TTL_ZONES = 86400;      // 24h — zones HR configurées par l'user
const TTL_GEAR = 3600;        // 1h — équipement change rarement
const TTL_CLUBS = 86400;      // 24h

// Stockage en mémoire des états OAuth en attente (TTL 10 min)
const pendingOAuthStates = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

router.use('/running', stravaRunningRoutes);
router.use('/swimming', stravaSwimmingRoutes);
router.use('/cycling', stravaCyclingRoutes);

function cleanExpiredStates() {
  const now = Date.now();
  for (const [state, { expiresAt }] of pendingOAuthStates) {
    if (now > expiresAt) pendingOAuthStates.delete(state);
  }
}

router.get('/auth', auth, asyncHandler(async (req, res) => {
  const { clientId, redirectUri } = getStravaCredentials(req.userId);
  const scope = 'read,activity:read_all,profile:read_all';

  const crypto = require('crypto');
  const state = crypto.randomBytes(16).toString('hex');

  // Stocke le state avec le userId et une expiration
  cleanExpiredStates();
  pendingOAuthStates.set(state, { userId: req.userId, expiresAt: Date.now() + OAUTH_STATE_TTL_MS });

  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=force&state=${state}`;

  logger.info('Generating Strava OAuth URL', { userId: req.userId });
  sendSuccess(res, { url, logoutUrl: 'https://www.strava.com/logout' });
}));

router.get('/callback', (req, res) => {
  const { code, error, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

  if (error) {
    logger.warn('Strava auth failed', { error });
    return res.redirect(`${frontendUrl}/strava-callback?error=auth_failed`);
  }

  if (!code) {
    logger.warn('No authorization code received from Strava');
    return res.redirect(`${frontendUrl}/strava-callback?error=no_code`);
  }

  // Valide le state
  const pending = state ? pendingOAuthStates.get(state) : null;
  if (!state || !pending || Date.now() > pending.expiresAt) {
    logger.warn('Strava OAuth callback: state invalide ou expiré', { state: state ? 'present' : 'missing' });
    return res.redirect(`${frontendUrl}/strava-callback?error=invalid_state`);
  }

  // State valide → on le consomme (one-time use)
  pendingOAuthStates.delete(state);

  logger.info('Strava OAuth callback valide', { userId: pending.userId });
  res.redirect(`${frontendUrl}/strava-callback?code=${code}&state=${state}`);
});

router.post('/connect', auth, asyncHandler(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return sendError(res, 'Authorization code is required', 400);
  }
  
  const { clientId, clientSecret } = getStravaCredentials(req.userId);

  try {
    logger.info('Attempting to connect Strava', { userId: req.userId, userEmail: req.user?.email });
    
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    const user = await User.findByPk(req.userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Vérifie que ce compte Strava n'est pas déjà lié à un autre utilisateur
    if (athlete?.id) {
      const existingLink = await User.findOne({
        where: { stravaAthleteId: athlete.id }
      });
      if (existingLink && existingLink.id !== req.userId) {
        logger.warn('Strava account already linked to another user', {
          requestingUserId: req.userId,
          ownerUserId: existingLink.id
        });
        return sendError(res, 'This Strava account is already linked to another user', 409);
      }
    }

    await user.update({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: expires_at,
      stravaAthleteId: athlete?.id || null
    });

    logger.info('Strava connected successfully', {
      userId: req.userId,
      userEmail: user.email,
      stravaAthleteId: athlete?.id,
      stravaAthleteName: athlete?.firstname + ' ' + athlete?.lastname
    });

    // Sync initiale en background (non bloquante)
    syncUserActivities(req.userId).catch(err =>
      logger.error('[Strava] Erreur sync post-connect', { userId: req.userId, error: err.message })
    );

    sendSuccess(res, { athlete }, 'Strava connected successfully');
    
  } catch (error) {
    logger.error('Strava connect error', { 
      userId: req.userId, 
      error: error.message,
      response: error.response?.data 
    });
    return sendError(res, 'Failed to connect Strava account', 500);
  }
}));

router.get('/activities', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);

  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  const { type, limit = 200, page = 1, from, to } = req.query;

  // Auto-sync : full sync tant que fullSyncCompletedAt est null (self-healing si interrompu),
  // sinon sync incrémentale si lastSyncAt > 10 min (fallback webhook).
  // Le mutex syncInFlight évite les doubles appels simultanés.
  if (!user.fullSyncCompletedAt) {
    logger.info('[Strava] Full sync auto (fullSyncCompletedAt null)', { userId: req.userId });
    syncUserActivities(req.userId, { enrich: true }).catch(err =>
      logger.error('[Strava] Erreur full sync auto', { userId: req.userId, error: err.message })
    );
  } else {
    const lastSync = user.lastSyncAt ? new Date(user.lastSyncAt) : null;
    const STALE_MS = 10 * 60 * 1000;
    if (!lastSync || (Date.now() - lastSync.getTime()) > STALE_MS) {
      const since = lastSync ? Math.floor(lastSync.getTime() / 1000) : Math.floor((Date.now() - 7 * 86400 * 1000) / 1000);
      logger.info('[Strava] Sync incrémentale auto (lastSyncAt stale)', { userId: req.userId, since });
      syncSince(req.userId, since).catch(err =>
        logger.error('[Strava] Erreur syncSince auto', { userId: req.userId, error: err.message })
      );
    }
  }

  const count = await Activity.count({ where: { userId: req.userId } });

  // Construit la requête Sequelize
  const where = { userId: req.userId };
  if (type) where.type = type;
  if (from || to) {
    where.startDate = {};
    if (from) where.startDate[Op.gte] = new Date(from);
    if (to) where.startDate[Op.lte] = new Date(to);
  }

  const activities = await Activity.findAll({
    where,
    order: [['startDate', 'DESC']],
    limit: Math.min(parseInt(limit), 500),
    offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 500),
    attributes: { exclude: ['raw'] },
  });

  // Si DB vide et sync en cours, retomber sur Strava direct (transition)
  if (activities.length === 0 && count === 0) {
    try {
      const { getValidStravaToken: getToken } = require('../utils/stravaHelpers');
      const accessToken = await getToken(user);
      if (accessToken) {
        const fresh = await fetchStravaActivities(accessToken, { per_page: 50 });
        return sendSuccess(res, fresh || []);
      }
    } catch (err) {
      logger.warn('[Strava] Fallback Strava direct échoué', { userId: req.userId });
    }
  }

  sendSuccess(res, activities);
}));

router.post('/resync', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  syncUserActivities(req.userId, { enrich: true }).catch(err =>
    logger.error('[Strava] Erreur resync manuelle', { userId: req.userId, error: err.message })
  );

  logger.info('[Strava] Resync manuelle déclenchée', { userId: req.userId });
  sendSuccess(res, { status: 'started' }, 'Resync started');
}));

router.delete('/disconnect', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  try {
    await revokeStravaToken(user.stravaAccessToken);
    logger.info('Strava token revoked via API', { userId: req.userId });
  } catch (error) {
    logger.warn('Failed to revoke token via API, clearing from DB anyway', { userId: req.userId, error: error.message });
  }

  await user.update({
    stravaAccessToken: null,
    stravaRefreshToken: null,
    stravaExpiresAt: null,
    stravaAthleteId: null
  });

  logger.info('Strava disconnected successfully', { userId: req.userId });
  sendSuccess(res, null, 'Strava disconnected successfully');
}));

router.get('/athlete', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);

  try {
    const athlete = await cache.getOrSet(
      `athlete:${req.userId}`,
      async () => {
        const accessToken = await getValidStravaToken(user);
        if (!accessToken) throw new Error('Failed to get valid Strava token');
        return getAthlete(accessToken);
      },
      TTL_ATHLETE
    );
    sendSuccess(res, athlete);
  } catch (error) {
    logger.error('Failed to fetch athlete', error);
    return sendError(res, error.message || 'Failed to fetch athlete profile', 500);
  }
}));

router.get('/athlete/stats', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);

  try {
    const stats = await cache.getOrSet(
      `athlete-stats:${req.userId}`,
      async () => {
        const accessToken = await getValidStravaToken(user);
        if (!accessToken) throw new Error('Failed to get valid Strava token');
        // Mutualise le fetch athlete via cache pour éviter un double appel
        const athlete = await cache.getOrSet(
          `athlete:${req.userId}`,
          () => getAthlete(accessToken),
          TTL_ATHLETE
        );
        return getAthleteStats(accessToken, athlete.id);
      },
      TTL_STATS
    );
    sendSuccess(res, stats);
  } catch (error) {
    logger.error('Failed to fetch athlete stats', error);
    return sendError(res, error.message || 'Failed to fetch athlete stats', 500);
  }
}));

router.get('/athlete/zones', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);

  try {
    const zones = await cache.getOrSet(
      `athlete-zones:${req.userId}`,
      async () => {
        const accessToken = await getValidStravaToken(user);
        if (!accessToken) throw new Error('Failed to get valid Strava token');
        return getAthleteZones(accessToken);
      },
      TTL_ZONES
    );
    sendSuccess(res, zones);
  } catch (error) {
    logger.error('Failed to fetch athlete zones', error);
    return sendError(res, error.message || 'Failed to fetch athlete zones', 500);
  }
}));

router.get('/athlete/clubs', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);

  try {
    const clubs = await cache.getOrSet(
      `athlete-clubs:${req.userId}`,
      async () => {
        const accessToken = await getValidStravaToken(user);
        if (!accessToken) throw new Error('Failed to get valid Strava token');
        return getAthleteClubs(accessToken);
      },
      TTL_CLUBS
    );
    sendSuccess(res, clubs);
  } catch (error) {
    logger.error('Failed to fetch athlete clubs', error);
    return sendError(res, error.message || 'Failed to fetch athlete clubs', 500);
  }
}));

router.get('/activities/:id', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  const accessToken = await getValidStravaToken(user);
  
  if (!accessToken) {
    return sendError(res, 'Failed to get valid Strava token', 401);
  }

  try {
    const activity = await getActivity(accessToken, id);
    sendSuccess(res, activity);
  } catch (error) {
    logger.error('Failed to fetch activity', error);
    return sendError(res, 'Failed to fetch activity', 500);
  }
}));

router.get('/activities/:id/streams', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { types, fresh } = req.query;
  const user = await User.findByPk(req.userId);

  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  // Cherche d'abord en cache local (par stravaId, scopé au user)
  const activity = await Activity.findOne({
    where: { stravaId: id, userId: req.userId }
  });

  if (activity && !fresh) {
    const cached = await ActivityStream.findOne({ where: { activityId: activity.id } });
    if (cached) {
      return sendSuccess(res, {
        time: { data: cached.time },
        distance: { data: cached.distance },
        heartrate: { data: cached.heartrate },
        watts: { data: cached.watts },
        cadence: { data: cached.cadence },
        velocity_smooth: { data: cached.velocitySmooth },
        altitude: { data: cached.altitude },
        latlng: { data: cached.latlng },
        grade_smooth: { data: cached.gradeSmooth },
        temp: { data: cached.temp },
        moving: { data: cached.moving },
        cached: true,
      });
    }
  }

  // Fallback : appel direct Strava
  const accessToken = await getValidStravaToken(user);
  if (!accessToken) return sendError(res, 'Failed to get valid Strava token', 401);

  try {
    const streamTypes = types ? types.split(',') : ['time', 'distance', 'heartrate', 'watts', 'altitude', 'latlng'];
    const streams = await getActivityStreams(accessToken, id, streamTypes);
    sendSuccess(res, streams);
  } catch (error) {
    logger.error('Failed to fetch activity streams', error);
    return sendError(res, 'Failed to fetch activity streams', 500);
  }
}));

// Déclenche manuellement l'enrichissement (détail + streams) en background
router.post('/sync/enrich', auth, asyncHandler(async (req, res) => {
  const { force = false, maxCount = 500 } = req.body || {};
  enrichUserActivities(req.userId, { force, maxCount }).catch(err =>
    logger.error('[Strava] Erreur enrichissement manuel', { userId: req.userId, error: err.message })
  );
  sendSuccess(res, { started: true }, 'Enrichissement lancé en arrière-plan');
}));

// === Analytics endpoints (Phase 0.6) ===
const parseRange = (req) => ({
  from: req.query.from || null,
  to: req.query.to || null,
});

router.get('/analytics/summary', auth, asyncHandler(async (req, res) => {
  const summary = await getAnalyticsSummary(req.userId, parseRange(req));
  sendSuccess(res, summary);
}));

router.get('/analytics/zones', auth, asyncHandler(async (req, res) => {
  const { hrMax, hrRest } = req.query;
  const data = await getTimeInZones(req.userId, {
    hrMax: hrMax ? parseInt(hrMax) : 190,
    hrRest: hrRest ? parseInt(hrRest) : 60,
    ...parseRange(req),
  });
  sendSuccess(res, data);
}));

router.get('/analytics/power-curve', auth, asyncHandler(async (req, res) => {
  const data = await getPowerCurve(req.userId, parseRange(req));
  sendSuccess(res, data);
}));

router.get('/analytics/gps-heatmap', auth, asyncHandler(async (req, res) => {
  const data = await getGpsHeatmap(req.userId, parseRange(req));
  sendSuccess(res, data);
}));

// Status de l'enrichissement : combien d'activités ont leur détail/streams
router.get('/sync/status', auth, asyncHandler(async (req, res) => {
  const total = await Activity.count({ where: { userId: req.userId } });
  const withDetail = await Activity.count({
    where: { userId: req.userId, detailFetchedAt: { [Op.not]: null } }
  });
  const withStream = await Activity.count({
    where: { userId: req.userId, streamFetchedAt: { [Op.not]: null } }
  });
  sendSuccess(res, { total, withDetail, withStream });
}));

router.get('/routes', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  const accessToken = await getValidStravaToken(user);
  
  if (!accessToken) {
    return sendError(res, 'Failed to get valid Strava token', 401);
  }

  try {
    const routes = await getAthleteRoutes(accessToken, req.query);
    sendSuccess(res, routes);
  } catch (error) {
    logger.error('Failed to fetch routes', error);
    return sendError(res, 'Failed to fetch routes', 500);
  }
}));

router.get('/gear', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return sendError(res, 'User not found', 404);
  if (!user.stravaAccessToken) return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);

  try {
    const gear = await cache.getOrSet(
      `athlete-gear:${req.userId}`,
      async () => {
        const accessToken = await getValidStravaToken(user);
        if (!accessToken) throw new Error('Failed to get valid Strava token');
        return getAthleteGear(accessToken);
      },
      TTL_GEAR
    );
    sendSuccess(res, gear);
  } catch (error) {
    logger.error('Failed to fetch gear', error);
    return sendError(res, error.message || 'Failed to fetch gear', 500);
  }
}));

router.get('/segments/starred', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  const accessToken = await getValidStravaToken(user);
  
  if (!accessToken) {
    return sendError(res, 'Failed to get valid Strava token', 401);
  }

  try {
    const segments = await getStarredSegments(accessToken, req.query);
    sendSuccess(res, segments);
  } catch (error) {
    logger.error('Failed to fetch starred segments', error);
    return sendError(res, 'Failed to fetch starred segments', 500);
  }
}));

router.get('/all', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  const accessToken = await getValidStravaToken(user);
  
  if (!accessToken) {
    return sendError(res, 'Failed to get valid Strava token', 401);
  }

  try {
    const [athlete, activities, clubs, gear, routes, segments] = await Promise.allSettled([
      getAthlete(accessToken),
      fetchStravaActivities(accessToken, { per_page: 10 }),
      getAthleteClubs(accessToken),
      getAthleteGear(accessToken),
      getAthleteRoutes(accessToken, { per_page: 10 }),
      getStarredSegments(accessToken, { per_page: 10 })
    ]);

    let stats = null;
    if (athlete.status === 'fulfilled') {
      try {
        stats = await getAthleteStats(accessToken, athlete.value.id);
      } catch (error) {
        logger.warn('Failed to fetch stats', error);
      }
    }

    sendSuccess(res, {
      athlete: athlete.status === 'fulfilled' ? athlete.value : null,
      stats,
      activities: activities.status === 'fulfilled' ? activities.value : [],
      clubs: clubs.status === 'fulfilled' ? clubs.value : [],
      gear: gear.status === 'fulfilled' ? gear.value : null,
      routes: routes.status === 'fulfilled' ? routes.value : [],
      segments: segments.status === 'fulfilled' ? segments.value : []
    });
  } catch (error) {
    logger.error('Failed to fetch all Strava data', error);
    return sendError(res, 'Failed to fetch Strava data', 500);
  }
}));

module.exports = router;
