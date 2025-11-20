const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { getStravaCredentials, getValidStravaToken, fetchStravaActivities } = require('../utils/stravaHelpers');
const logger = require('../utils/logger');

// 1. Redirect to Strava OAuth
router.get('/auth', auth, asyncHandler(async (req, res) => {
  const { clientId, redirectUri } = getStravaCredentials(req.userId);
  const scope = 'read,activity:read_all';
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  
  sendSuccess(res, { url });
}));

// 2. Callback from Strava
router.get('/callback', (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.warn('Strava auth failed', { error });
    return res.redirect('http://localhost:5173/strava-connect?error=auth_failed');
  }

  // Redirect to frontend with the code
  res.redirect(`http://localhost:5173/strava-connect?code=${code}`);
});

// 3. Exchange Code (Called from Frontend with Auth)
router.post('/connect', auth, asyncHandler(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return sendError(res, 'Authorization code is required', 400);
  }
  
  const { clientId, clientSecret } = getStravaCredentials(req.userId);

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at } = response.data;

    const user = await User.findByPk(req.userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    await user.update({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: expires_at
    });

    logger.info('Strava connected successfully', { userId: req.userId });
    sendSuccess(res, null, 'Strava connected successfully');
    
  } catch (error) {
    logger.error('Strava connect error', error);
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
    return sendError(res, 'Strava not connected', 400);
  }

  const accessToken = await getValidStravaToken(user);
  
  if (!accessToken) {
    return sendError(res, 'Failed to get valid Strava token', 401);
  }

  try {
    const activities = await fetchStravaActivities(accessToken, { per_page: 50 });
    sendSuccess(res, activities);
  } catch (error) {
    logger.error('Failed to fetch Strava activities', error);
    return sendError(res, 'Failed to fetch Strava activities', 500);
  }
}));

module.exports = router;

