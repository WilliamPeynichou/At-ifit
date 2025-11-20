/**
 * Shared Strava utilities to avoid code duplication
 */

const axios = require('axios');
const logger = require('./logger');

/**
 * Get Strava credentials based on user ID
 * Supports multiple Strava accounts for different users
 */
const getStravaCredentials = (userId) => {
  // Special handling for user ID 2 (Victor)
  if (String(userId) === '2') {
    return {
      clientId: process.env.VICTOR_STRAVA_CLIENT_ID,
      clientSecret: process.env.VICTOR_STRAVA_CLIENT_SECRET,
      redirectUri: process.env.STRAVA_REDIRECT_URI
    };
  }
  
  // Default credentials
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

module.exports = {
  getStravaCredentials,
  getValidStravaToken,
  fetchStravaActivities
};
