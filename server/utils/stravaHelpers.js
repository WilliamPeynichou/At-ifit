/**
 * Shared Strava utilities to avoid code duplication
 */

const axios = require('axios');
const logger = require('./logger');

/**
 * Get Strava credentials for OAuth
 * Uses a single Strava application for all users
 * Each user authorizes this application with their own Strava account
 */
const getStravaCredentials = (userId) => {
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri: process.env.STRAVA_REDIRECT_URI
  };
};

/**
 * Get valid Strava access token, refreshing if necessary
 * @param {Object} user - Sequelize User model instance
 * @returns {Promise<string|null>} Access token or null if refresh fails
 */
const getValidStravaToken = async (user) => {
  const now = Math.floor(Date.now() / 1000);
  
  // Return existing token if still valid
  if (user.stravaExpiresAt && user.stravaExpiresAt > now) {
    return user.stravaAccessToken;
  }
  
  // Token expired or missing, attempt refresh
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
    
    // Update user with new tokens
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

/**
 * Fetch Strava activities for a user
 * @param {string} accessToken - Valid Strava access token
 * @param {Object} params - Query parameters (before, after, per_page)
 * @returns {Promise<Array>} Array of activities
 */
const fetchStravaActivities = async (accessToken, params = {}) => {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 50, ...params }
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch Strava activities', error);
    throw error;
  }
};

/**
 * Get authenticated athlete profile
 * @param {string} accessToken - Valid Strava access token
 * @returns {Promise<Object>} Athlete profile
 */
const getAthlete = async (accessToken) => {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch athlete', error);
    throw error;
  }
};

/**
 * Get athlete stats
 * @param {string} accessToken - Valid Strava access token
 * @param {number} athleteId - Athlete ID
 * @returns {Promise<Object>} Athlete stats
 */
const getAthleteStats = async (accessToken, athleteId) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch athlete stats', error);
    throw error;
  }
};

/**
 * Get athlete zones
 * @param {string} accessToken - Valid Strava access token
 * @returns {Promise<Object>} Athlete zones
 */
const getAthleteZones = async (accessToken) => {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/zones', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch athlete zones', error);
    throw error;
  }
};

/**
 * Get athlete clubs
 * @param {string} accessToken - Valid Strava access token
 * @returns {Promise<Array>} Array of clubs
 */
const getAthleteClubs = async (accessToken) => {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/clubs', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch athlete clubs', error);
    throw error;
  }
};

/**
 * Get a specific activity
 * @param {string} accessToken - Valid Strava access token
 * @param {number} activityId - Activity ID
 * @returns {Promise<Object>} Activity details
 */
const getActivity = async (accessToken, activityId) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch activity', error);
    throw error;
  }
};

/**
 * Get activity streams (GPS, heart rate, power, etc.)
 * @param {string} accessToken - Valid Strava access token
 * @param {number} activityId - Activity ID
 * @param {Array} types - Stream types (e.g., ['time', 'distance', 'latlng', 'altitude', 'heartrate', 'power'])
 * @returns {Promise<Array>} Array of stream data
 */
const getActivityStreams = async (accessToken, activityId, types = ['time', 'distance', 'latlng', 'altitude']) => {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}/streams`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { keys: types.join(','), key_by_type: true }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch activity streams', error);
    throw error;
  }
};

/**
 * Get athlete routes
 * @param {string} accessToken - Valid Strava access token
 * @param {Object} params - Query parameters (page, per_page)
 * @returns {Promise<Array>} Array of routes
 */
const getAthleteRoutes = async (accessToken, params = {}) => {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athletes/self/routes', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 30, ...params }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch athlete routes', error);
    throw error;
  }
};

/**
 * Get athlete gear (bikes and shoes)
 * @param {string} accessToken - Valid Strava access token
 * @returns {Promise<Object>} Object with bikes and shoes arrays
 */
const getAthleteGear = async (accessToken) => {
  try {
    const athlete = await getAthlete(accessToken);
    const bikes = athlete.bikes || [];
    const shoes = athlete.shoes || [];
    return { bikes, shoes };
  } catch (error) {
    logger.error('Failed to fetch athlete gear', error);
    throw error;
  }
};

/**
 * Get starred segments
 * @param {string} accessToken - Valid Strava access token
 * @param {Object} params - Query parameters (page, per_page)
 * @returns {Promise<Array>} Array of segments
 */
const getStarredSegments = async (accessToken, params = {}) => {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/segments/starred', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 30, ...params }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch starred segments', error);
    throw error;
  }
};

/**
 * Revoke/deauthorize a Strava access token
 * @param {string} accessToken - Strava access token to revoke
 * @returns {Promise<boolean>} True if revoked successfully
 */
const revokeStravaToken = async (accessToken) => {
  try {
    await axios.post('https://www.strava.com/oauth/deauthorize', {
      access_token: accessToken
    });
    logger.info('Strava token revoked successfully');
    return true;
  } catch (error) {
    // If token is already invalid/revoked, that's okay
    if (error.response?.status === 401 || error.response?.status === 404) {
      logger.info('Strava token already invalid/revoked');
      return true;
    }
    logger.error('Failed to revoke Strava token', error);
    return false;
  }
};

module.exports = {
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
