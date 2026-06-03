const axios = require('axios');
const logger = require('./logger');
const { logStravaApiCall } = require('../services/stravaApiLogService');
const { logAuditEvent } = require('../services/auditService');

function classifyStravaCall(url) {
  if (/oauth\/token/.test(url)) return 'refresh_token';
  if (/oauth\/deauthorize/.test(url)) return 'revocation';
  if (/\/athlete$/.test(url)) return 'profile_athlete';
  if (/\/athlete\/activities/.test(url)) return 'activity_list';
  if (/\/activities\/[^/]+\/streams/.test(url)) return 'activity_streams';
  if (/\/activities\//.test(url)) return 'activity_detail';
  if (/\/athletes\/[^/]+\/stats/.test(url)) return 'athlete_stats';
  if (/\/athlete\/zones/.test(url)) return 'zones';
  if (/\/athlete\/clubs/.test(url)) return 'clubs';
  if (/\/routes/.test(url)) return 'routes';
  if (/\/segments\/starred/.test(url)) return 'segments';
  return 'other';
}

function resourceIdFromUrl(url) {
  const match = url.match(/\/(activities|athletes)\/(\d+)/);
  return match?.[2] || null;
}

function countItems(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') return Object.keys(data).length;
  return null;
}

/**
 * Helper centralisé pour tous les appels API Strava
 * Gère : 401 zombie token, 429 rate limit (backoff), 5xx (retry)
 */
const stravaFetch = async (url, options = {}, { userId } = {}) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 4000, 8000];

  const startedAt = Date.now();
  const method = options.method || 'GET';
  const callType = options.callType || classifyStravaCall(url);
  let attempts = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    attempts = attempt + 1;
    try {
      const response = await axios({ url, ...options });
      await logStravaApiCall({
        userId,
        callType,
        endpoint: url.replace(/^https:\/\/www\.strava\.com\/api\/v3/, ''),
        method,
        status: 'success',
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        attempts,
        itemCount: countItems(response.data),
        resourceId: resourceIdFromUrl(url),
      });
      return response.data;
    } catch (error) {
      const status = error.response?.status;

      // 401 — token révoqué externalement (zombie token)
      if (status === 401) {
        logger.warn('[StravaFetch] Token révoqué (401)', { userId, url });
        if (userId) {
          try {
            const User = require('../models/User');
            await User.update(
              { stravaAccessToken: null, stravaRefreshToken: null, stravaExpiresAt: null },
              { where: { id: userId } }
            );
            logger.info('[StravaFetch] Tokens Strava effacés en DB', { userId });
          } catch (dbErr) {
            logger.error('[StravaFetch] Erreur effacement tokens', { userId, error: dbErr.message });
          }
        }
        const err = new Error('STRAVA_TOKEN_REVOKED');
        err.code = 'STRAVA_TOKEN_REVOKED';
        err.status = 401;
        throw err;
      }

      // 429 — rate limit Strava (15 req/15min ou 600/jour)
      if (status === 429) {
        const retryAfter = parseInt(error.response?.headers['x-ratelimit-reset'] || '900', 10);
        const waitMs = Math.min(retryAfter * 1000, 15 * 60 * 1000); // max 15min
        logger.warn('[StravaFetch] Rate limit 429 — pause', { userId, url, waitMs });
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      // 5xx — erreur Strava, retry avec backoff
      if (status >= 500 && attempt < MAX_RETRIES) {
        logger.warn('[StravaFetch] Erreur 5xx, retry', { userId, url, status, attempt });
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }

      // Réseau ou autre erreur, retry si pas le dernier essai
      if (!status && attempt < MAX_RETRIES) {
        logger.warn('[StravaFetch] Erreur réseau, retry', { userId, url, attempt, error: error.message });
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }

      logger.error('[StravaFetch] Échec définitif', { userId, url, status, error: error.message });
      await logStravaApiCall({
        userId,
        callType,
        endpoint: url.replace(/^https:\/\/www\.strava\.com\/api\/v3/, ''),
        method,
        status: 'error',
        httpStatus: status || null,
        durationMs: Date.now() - startedAt,
        attempts,
        errorMessage: error.code || error.message,
        resourceId: resourceIdFromUrl(url),
      });
      throw error;
    }
  }
};

const normalizeRedirectUri = (redirectUri) => {
  if (!redirectUri) return redirectUri;

  const trimmed = redirectUri.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
};

const getStravaCredentials = (userId) => {
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri: normalizeRedirectUri(process.env.STRAVA_REDIRECT_URI)
  };
};

const getValidStravaToken = async (user) => {
  const now = Math.floor(Date.now() / 1000);
  
  if (user.stravaExpiresAt && user.stravaExpiresAt > now) {
    return user.stravaAccessToken;
  }
  
  if (!user.stravaRefreshToken) {
    logger.warn('No refresh token available for user', { userId: user.id });
    return null;
  }
  
  const { clientId, clientSecret } = getStravaCredentials(user.id);
  
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: user.stravaRefreshToken
    });
    
    const { access_token, refresh_token, expires_at } = response.data;
    
    await user.update({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: expires_at
    });
    
    logger.info('Strava token refreshed successfully', { userId: user.id });
    await logStravaApiCall({ userId: user.id, callType: 'refresh_token', endpoint: '/oauth/token', method: 'POST', status: 'success', httpStatus: response.status, attempts: 1 });
    await logAuditEvent({ userId: user.id, actorUserId: user.id, eventType: 'strava_refresh_token', category: 'strava', message: 'Strava token refreshed' });
    return access_token;
    
  } catch (error) {
    logger.error('Failed to refresh Strava token', error);
    await logStravaApiCall({ userId: user.id, callType: 'refresh_token', endpoint: '/oauth/token', method: 'POST', status: 'error', httpStatus: error.response?.status || null, attempts: 1, errorMessage: error.message });
    return null;
  }
};

const fetchStravaActivities = (accessToken, params = {}, meta = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athlete/activities', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 100, ...params },
  }, meta);

const getAthlete = (accessToken, meta = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athlete', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }, meta);

const getAthleteStats = (accessToken, athleteId, meta = {}) =>
  stravaFetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }, meta);

const getAthleteZones = (accessToken, meta = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athlete/zones', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }, meta);

const getAthleteClubs = (accessToken, meta = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athlete/clubs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }, meta);

const getActivity = (accessToken, activityId, meta = {}) =>
  stravaFetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }, meta);

const getActivityStreams = (accessToken, activityId, types = ['time', 'distance', 'latlng', 'altitude'], meta = {}) =>
  stravaFetch(`https://www.strava.com/api/v3/activities/${activityId}/streams`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { keys: types.join(','), key_by_type: true },
  }, meta);

const getAthleteRoutes = (accessToken, params = {}, meta = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athletes/self/routes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 30, ...params },
  }, meta);

const getAthleteGear = async (accessToken, meta = {}) => {
  const athlete = await getAthlete(accessToken, meta);
  return { bikes: athlete.bikes || [], shoes: athlete.shoes || [] };
};

const getStarredSegments = (accessToken, params = {}, meta = {}) =>
  stravaFetch('https://www.strava.com/api/v3/segments/starred', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 30, ...params },
  }, meta);

const revokeStravaToken = async (accessToken) => {
  try {
    await axios.post('https://www.strava.com/oauth/deauthorize', {
      access_token: accessToken
    });
    await logStravaApiCall({ callType: 'revocation', endpoint: '/oauth/deauthorize', method: 'POST', status: 'success', attempts: 1 });
    logger.info('Strava token revoked successfully');
    return true;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 404) {
      logger.info('Strava token already invalid/revoked');
      return true;
    }
    logger.error('Failed to revoke Strava token', error);
    await logStravaApiCall({ callType: 'revocation', endpoint: '/oauth/deauthorize', method: 'POST', status: 'error', httpStatus: error.response?.status || null, attempts: 1, errorMessage: error.message });
    return false;
  }
};

module.exports = {
  stravaFetch,
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
};
