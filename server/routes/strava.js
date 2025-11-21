const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
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

// 1. Redirect to Strava OAuth
router.get('/auth', auth, asyncHandler(async (req, res) => {
  const { clientId, redirectUri } = getStravaCredentials(req.userId);
  // Extended scopes: read all activities, profile, and stats
  const scope = 'read,activity:read_all,profile:read_all';
  
  // Generate a unique state parameter to prevent CSRF and ensure fresh login
  const state = `${req.userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // approval_prompt=force forces user to manually log in and authorize, even if already authorized
  // Note: Strava may still use cached session, so users should log out of Strava first
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=force&state=${state}`;
  
  logger.info('Generating Strava OAuth URL', { userId: req.userId, state });
  sendSuccess(res, { url, logoutUrl: 'https://www.strava.com/logout' });
}));

// 2. Callback from Strava OAuth
router.get('/callback', (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    logger.warn('Strava auth failed', { error });
    return res.redirect('http://localhost:5173/strava-connect?error=auth_failed');
  }

  if (!code) {
    logger.warn('No authorization code received from Strava');
    return res.redirect('http://localhost:5173/strava-connect?error=no_code');
  }

  // Redirect to frontend with the code and state
  const redirectUrl = state 
    ? `http://localhost:5173/strava-connect?code=${code}&state=${state}`
    : `http://localhost:5173/strava-connect?code=${code}`;
  
  logger.info('Strava OAuth callback received', { hasCode: !!code, hasState: !!state });
  res.redirect(redirectUrl);
});

// 3. Exchange Code (Called from Frontend with Auth)
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
    
    await user.update({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: expires_at
    });

    logger.info('Strava connected successfully', { 
      userId: req.userId, 
      userEmail: user.email,
      stravaAthleteId: athlete?.id,
      stravaAthleteName: athlete?.firstname + ' ' + athlete?.lastname
    });
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

// 4. Get Activities
router.get('/activities', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  const accessToken = await getValidStravaToken(user);
  
  if (!accessToken) {
    return sendError(res, 'Failed to get valid Strava token. Please reconnect your Strava account.', 401);
  }

  try {
    const activities = await fetchStravaActivities(accessToken, { per_page: 50 });
    sendSuccess(res, activities);
  } catch (error) {
    logger.error('Failed to fetch Strava activities', error);
    return sendError(res, 'Failed to fetch Strava activities', 500);
  }
}));

// 5. Disconnect Strava
router.delete('/disconnect', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  if (!user.stravaAccessToken) {
    return sendError(res, 'Strava not connected. Please connect your Strava account first.', 400);
  }

  // Try to revoke the token via Strava API first
  try {
    await revokeStravaToken(user.stravaAccessToken);
    logger.info('Strava token revoked via API', { userId: req.userId });
  } catch (error) {
    logger.warn('Failed to revoke token via API, clearing from DB anyway', { userId: req.userId, error: error.message });
  }

  // Clear Strava tokens from database
  await user.update({
    stravaAccessToken: null,
    stravaRefreshToken: null,
    stravaExpiresAt: null
  });

  logger.info('Strava disconnected successfully', { userId: req.userId });
  sendSuccess(res, null, 'Strava disconnected successfully');
}));

// 6. Get Authenticated Athlete Profile
router.get('/athlete', auth, asyncHandler(async (req, res) => {
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
    const athlete = await getAthlete(accessToken);
    sendSuccess(res, athlete);
  } catch (error) {
    logger.error('Failed to fetch athlete', error);
    return sendError(res, 'Failed to fetch athlete profile', 500);
  }
}));

// 7. Get Athlete Stats
router.get('/athlete/stats', auth, asyncHandler(async (req, res) => {
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
    // First get athlete to get ID
    const athlete = await getAthlete(accessToken);
    const stats = await getAthleteStats(accessToken, athlete.id);
    sendSuccess(res, stats);
  } catch (error) {
    logger.error('Failed to fetch athlete stats', error);
    return sendError(res, 'Failed to fetch athlete stats', 500);
  }
}));

// 8. Get Athlete Zones
router.get('/athlete/zones', auth, asyncHandler(async (req, res) => {
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
    const zones = await getAthleteZones(accessToken);
    sendSuccess(res, zones);
  } catch (error) {
    logger.error('Failed to fetch athlete zones', error);
    return sendError(res, 'Failed to fetch athlete zones', 500);
  }
}));

// 9. Get Athlete Clubs
router.get('/athlete/clubs', auth, asyncHandler(async (req, res) => {
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
    const clubs = await getAthleteClubs(accessToken);
    sendSuccess(res, clubs);
  } catch (error) {
    logger.error('Failed to fetch athlete clubs', error);
    return sendError(res, 'Failed to fetch athlete clubs', 500);
  }
}));

// 10. Get Specific Activity
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

// 11. Get Activity Streams
router.get('/activities/:id/streams', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { types } = req.query; // Comma-separated list: 'time,distance,latlng,altitude,heartrate,power'
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
    const streamTypes = types ? types.split(',') : ['time', 'distance', 'latlng', 'altitude'];
    const streams = await getActivityStreams(accessToken, id, streamTypes);
    sendSuccess(res, streams);
  } catch (error) {
    logger.error('Failed to fetch activity streams', error);
    return sendError(res, 'Failed to fetch activity streams', 500);
  }
}));

// 12. Get Athlete Routes
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

// 13. Get Athlete Gear (Bikes and Shoes)
router.get('/gear', auth, asyncHandler(async (req, res) => {
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
    const gear = await getAthleteGear(accessToken);
    sendSuccess(res, gear);
  } catch (error) {
    logger.error('Failed to fetch gear', error);
    return sendError(res, 'Failed to fetch gear', 500);
  }
}));

// 14. Get Starred Segments
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

// 15. Get All Strava Data (Summary endpoint)
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
    // Fetch all data in parallel
    const [athlete, activities, clubs, gear, routes, segments] = await Promise.allSettled([
      getAthlete(accessToken),
      fetchStravaActivities(accessToken, { per_page: 10 }),
      getAthleteClubs(accessToken),
      getAthleteGear(accessToken),
      getAthleteRoutes(accessToken, { per_page: 10 }),
      getStarredSegments(accessToken, { per_page: 10 })
    ]);

    // Get stats if athlete is available
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

