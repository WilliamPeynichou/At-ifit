const axios = require('axios');
const logger = require('./logger');

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
