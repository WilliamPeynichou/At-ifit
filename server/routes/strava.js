const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper to get credentials based on User ID
const getCredentials = (userId) => {
  // Check if userId is 2 (or "2" as string just in case)
  if (String(userId) === '2') {
    return {
      clientId: process.env.VICTOR_STRAVA_CLIENT_ID,
      clientSecret: process.env.VICTOR_STRAVA_CLIENT_SECRET,
      redirectUri: process.env.STRAVA_REDIRECT_URI // Assuming same redirect URI
    };
  }
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri: process.env.STRAVA_REDIRECT_URI
  };
};

// Helper to refresh token if expired
const getValidToken = async (user) => {
  const now = Math.floor(Date.now() / 1000);
  
  if (user.stravaExpiresAt && user.stravaExpiresAt > now) {
    return user.stravaAccessToken;
  }

  const { clientId, clientSecret } = getCredentials(user.id);

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

    return access_token;
  } catch (error) {
    console.error('Error refreshing Strava token:', error.response?.data || error.message);
    throw new Error('Failed to refresh Strava token');
  }
};

// 1. Redirect to Strava OAuth
// Added auth middleware to identify user and serve correct Client ID
router.get('/auth', auth, (req, res) => {
  const { clientId, redirectUri } = getCredentials(req.userId);
  const scope = 'read,activity:read_all';
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.json({ url });
});

// 2. Callback from Strava
router.get('/callback', (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('http://localhost:5173/strava-connect?error=auth_failed');
  }

  // Redirect to frontend with the code. 
  // The frontend will then call /api/strava/connect with this code AND the user's auth token.
  res.redirect(`http://localhost:5173/strava-connect?code=${code}`);
});

// 3. Exchange Code (Called from Frontend with Auth)
router.post('/connect', auth, async (req, res) => {
  const { code } = req.body;
  const { clientId, clientSecret } = getCredentials(req.userId);

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at } = response.data;

    const user = await User.findByPk(req.userId);
    await user.update({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: expires_at
    });

    res.json({ message: 'Strava connected successfully' });
  } catch (error) {
    console.error('Strava Connect Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to connect Strava account' });
  }
});

// 4. Get Activities
router.get('/activities', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user.stravaAccessToken) {
      return res.status(400).json({ error: 'Strava not connected' });
    }

    const accessToken = await getValidToken(user);

    // Fetch activities (last 30 items by default)
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 50 }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Strava API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch Strava activities' });
  }
});

module.exports = router;
