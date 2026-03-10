const axios = require('axios');
const logger = require('./logger');

/**
 * Helper centralisé pour tous les appels API Strava
 * Gère : 401 zombie token, 429 rate limit (backoff), 5xx (retry)
 */
const stravaFetch = async (url, options = {}, { userId } = {}) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 4000, 8000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios({ url, ...options });
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
      throw error;
    }
  }
};

const getStravaCredentials = (userId) => {
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri: process.env.STRAVA_REDIRECT_URI
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
    return access_token;
    
  } catch (error) {
    logger.error('Failed to refresh Strava token', error);
    return null;
  }
};

const fetchStravaActivities = (accessToken, params = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athlete/activities', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 100, ...params },
  });

const getAthlete = (accessToken) =>
  stravaFetch('https://www.strava.com/api/v3/athlete', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

const getAthleteStats = (accessToken, athleteId) =>
  stravaFetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

const getAthleteZones = (accessToken) =>
  stravaFetch('https://www.strava.com/api/v3/athlete/zones', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

const getAthleteClubs = (accessToken) =>
  stravaFetch('https://www.strava.com/api/v3/athlete/clubs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

const getActivity = (accessToken, activityId) =>
  stravaFetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

const getActivityStreams = (accessToken, activityId, types = ['time', 'distance', 'latlng', 'altitude']) =>
  stravaFetch(`https://www.strava.com/api/v3/activities/${activityId}/streams`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { keys: types.join(','), key_by_type: true },
  });

const getAthleteRoutes = (accessToken, params = {}) =>
  stravaFetch('https://www.strava.com/api/v3/athletes/self/routes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 30, ...params },
  });

const getAthleteGear = async (accessToken) => {
  const athlete = await getAthlete(accessToken);
  return { bikes: athlete.bikes || [], shoes: athlete.shoes || [] };
};

const getStarredSegments = (accessToken, params = {}) =>
  stravaFetch('https://www.strava.com/api/v3/segments/starred', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 30, ...params },
  });

const revokeStravaToken = async (accessToken) => {
  try {
    await axios.post('https://www.strava.com/oauth/deauthorize', {
      access_token: accessToken
    });
    logger.info('Strava token revoked successfully');
    return true;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 404) {
      logger.info('Strava token already invalid/revoked');
      return true;
    }
    logger.error('Failed to revoke Strava token', error);
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
