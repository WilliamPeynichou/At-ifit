const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const axios = require('axios');

// Helper to get Strava credentials (reused from strava.js logic if needed, or just use defaults if user 2 isn't hardcoded here. 
// Actually, strava.js handles the token refresh. We should reuse that logic or just fetch activities if we have a valid token.
// For simplicity, we'll assume the token is valid or let the frontend trigger a refresh if needed. 
// But wait, we need to analyze history. We need a valid token.
// I'll duplicate the getValidToken logic or export it from strava.js? 
// Exporting is better but might be circular. I'll duplicate for now to avoid breaking strava.js refactor.
// Actually, I can just import the strava route helper if I export it.
// Let's keep it simple: The user should be connected. We'll try to use the token.

// Helper to get credentials based on User ID (Duplicated from strava.js for now to ensure User 2 works)
const getCredentials = (userId) => {
  if (String(userId) === '2') {
    return {
      clientId: process.env.VICTOR_STRAVA_CLIENT_ID,
      clientSecret: process.env.VICTOR_STRAVA_CLIENT_SECRET,
    };
  }
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
  };
};

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
    console.error('Error refreshing token in user route:', error.message);
    return null; // Handle gracefully
  }
};

// Get User Profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile
router.post('/', auth, async (req, res) => {
  try {
    const { height, age, pseudo, gender, targetWeight } = req.body;
    const user = await User.findByPk(req.userId);
    
    if (user) {
      await user.update({ height, age, pseudo, gender, targetWeight });
      res.json({
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        height: user.height,
        age: user.age,
        gender: user.gender,
        targetWeight: user.targetWeight,
        targetWeight: user.targetWeight,
        consoKcal: user.consoKcal,
        weeksToGoal: user.weeksToGoal
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Calories
router.post('/calculate-calories', auth, async (req, res) => {
  try {
    const { gender, goal } = req.body; // goal: 'loss', 'gain', 'maintain'
    const user = await User.findByPk(req.userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.weight && !req.body.weight) { 
        // We need weight. If not in body, check DB (but DB weight is in Weight table, not User table usually? 
        // Wait, User table doesn't have weight column, Weight table does.
        // I need to fetch the latest weight from Weight model.
    }

    // Fetch latest weight
    // We need to import Weight model or assume user passes it? 
    // Let's fetch it.
    const Weight = require('../models/Weight');
    const latestWeightEntry = await Weight.findOne({
        where: { userId: user.id },
        order: [['date', 'DESC']]
    });
    
    const weight = latestWeightEntry ? latestWeightEntry.weight : 70; // Default or error?
    const height = user.height || 175;
    const age = user.age || 30;
    
    // 1. Calculate BMR (Mifflin-St Jeor)
    // Homme: 10 x poids (kg) + 6.25 x taille (cm) - 5 x age (ans) + 5
    // Femme: 10 x poids (kg) + 6.25 x taille (cm) - 5 x age (ans) - 161
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'female') {
        bmr -= 161;
    } else {
        bmr += 5;
    }

    // 2. Determine Activity Factor from Strava
    let activityFactor = 1.2; // Default Sedentary
    let avgHoursPerWeek = 0;

    if (user.stravaAccessToken) {
        const token = await getValidToken(user);
        if (token) {
            // Fetch last 4 weeks of activities to get an average
            const before = Math.floor(Date.now() / 1000);
            const after = before - (28 * 24 * 60 * 60); // 28 days ago
            
            try {
                const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { before, after, per_page: 100 }
                });
                
                const activities = response.data;
                const totalSeconds = activities.reduce((sum, act) => sum + act.moving_time, 0);
                avgHoursPerWeek = (totalSeconds / 3600) / 4;
                
                // Determine factor
                // Sedentary: < 1h/week (approx) -> 1.2
                // Lightly active: 1-3h/week -> 1.375
                // Moderately active: 3-6h/week -> 1.55
                // Active: 6-10h/week -> 1.725
                // Very active: > 10h/week -> 1.9
                
                if (avgHoursPerWeek < 1) activityFactor = 1.2;
                else if (avgHoursPerWeek < 3) activityFactor = 1.375;
                else if (avgHoursPerWeek < 6) activityFactor = 1.55;
                else if (avgHoursPerWeek < 10) activityFactor = 1.725;
                else activityFactor = 1.9;
                
            } catch (err) {
                console.error('Error fetching Strava history:', err.message);
            }
        }
    }

    // 3. Calculate TDEE
    const tdee = bmr * activityFactor;

    // 4. Calculate Target Calories based on Goal with Adaptive Logic
    let targetCalories = tdee;
    let adjustmentReason = "Maintenance mode";
    let delta = 0;

    if (user.targetWeight) {
        delta = Math.abs(weight - user.targetWeight).toFixed(1);
    }

    if (goal === 'loss') {
        if (user.targetWeight && weight > user.targetWeight) {
            // Adaptive Deficit
            if (delta > 10) {
                targetCalories -= 500;
                adjustmentReason = `Aggressive deficit (-500 kcal) for >10kg loss (${delta}kg remaining)`;
            } else if (delta > 5) {
                targetCalories -= 400;
                adjustmentReason = `Moderate deficit (-400 kcal) for >5kg loss (${delta}kg remaining)`;
            } else if (delta > 2) {
                targetCalories -= 300;
                adjustmentReason = `Standard deficit (-300 kcal) for >2kg loss (${delta}kg remaining)`;
            } else {
                targetCalories -= 200;
                adjustmentReason = `Light deficit (-200 kcal) for final <2kg loss (${delta}kg remaining)`;
            }
        } else {
            // Fallback if no target weight or already reached
            targetCalories -= 400;
            adjustmentReason = "Standard deficit (-400 kcal)";
        }
    } else if (goal === 'gain') {
        if (user.targetWeight && weight < user.targetWeight) {
             // Adaptive Surplus
             if (delta > 10) {
                targetCalories += 500;
                adjustmentReason = `Aggressive surplus (+500 kcal) for >10kg gain (${delta}kg remaining)`;
            } else if (delta > 5) {
                targetCalories += 400;
                adjustmentReason = `Moderate surplus (+400 kcal) for >5kg gain (${delta}kg remaining)`;
            } else if (delta > 2) {
                targetCalories += 300;
                adjustmentReason = `Standard surplus (+300 kcal) for >2kg gain (${delta}kg remaining)`;
            } else {
                targetCalories += 200;
                adjustmentReason = `Light surplus (+200 kcal) for final <2kg gain (${delta}kg remaining)`;
            }
        } else {
            targetCalories += 300;
            adjustmentReason = "Standard surplus (+300 kcal)";
        }
    }

    // 5. Calculate Time to Goal
    let weeksToGoal = null;
    if (delta > 0 && tdee !== targetCalories) {
        const dailyDiff = Math.abs(tdee - targetCalories);
        const weeklyChangeKg = (dailyDiff * 7) / 7700; // ~7700 kcal per kg
        if (weeklyChangeKg > 0) {
            weeksToGoal = (delta / weeklyChangeKg).toFixed(1);
        }
    }

    // Round values
    const result = {
        bmr: Math.round(bmr),
        activityFactor,
        avgHoursPerWeek: avgHoursPerWeek.toFixed(1),
        tdee: Math.round(tdee),
        targetCalories: Math.round(targetCalories),
        delta,
        adjustmentReason,
        weeksToGoal
    };

    // Save to User
    await user.update({ 
        consoKcal: result.targetCalories,
        weeksToGoal: result.weeksToGoal
    });

    res.json(result);

  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
