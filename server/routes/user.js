const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Weight = require('../models/Weight');
const auth = require('../middleware/auth');
const { validateRequest, validations } = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { getValidStravaToken, fetchStravaActivities } = require('../utils/stravaHelpers');
const logger = require('../utils/logger');

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
const calculateBMR = (weight, height, age, gender) => {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'female' ? bmr - 161 : bmr + 5;
};

/**
 * Determine activity factor from Strava history
 */
const calculateActivityFactor = (avgHoursPerWeek) => {
  if (avgHoursPerWeek < 1) return 1.2;      // Sedentary
  if (avgHoursPerWeek < 3) return 1.375;    // Lightly active
  if (avgHoursPerWeek < 6) return 1.55;     // Moderately active
  if (avgHoursPerWeek < 10) return 1.725;   // Active
  return 1.9;                                // Very active
};

/**
 * Calculate calorie adjustment based on goal and weight delta
 */
const calculateCalorieAdjustment = (goal, delta) => {
  if (goal === 'maintain') {
    return { adjustment: 0, reason: 'Maintenance mode' };
  }
  
  const isLoss = goal === 'loss';
  const sign = isLoss ? -1 : 1;
  
  if (!delta || delta <= 0) {
    const defaultAdj = isLoss ? -400 : 300;
    return {
      adjustment: defaultAdj,
      reason: `Standard ${isLoss ? 'deficit' : 'surplus'} (${defaultAdj} kcal)`
    };
  }
  
  // Adaptive adjustment based on remaining weight
  let adjustment;
  let description;
  
  if (delta > 10) {
    adjustment = 500;
    description = `Aggressive ${isLoss ? 'deficit' : 'surplus'} (${sign * 500} kcal) for >10kg ${isLoss ? 'loss' : 'gain'}`;
  } else if (delta > 5) {
    adjustment = 400;
    description = `Moderate ${isLoss ? 'deficit' : 'surplus'} (${sign * 400} kcal) for >5kg ${isLoss ? 'loss' : 'gain'}`;
  } else if (delta > 2) {
    adjustment = 300;
    description = `Standard ${isLoss ? 'deficit' : 'surplus'} (${sign * 300} kcal) for >2kg ${isLoss ? 'loss' : 'gain'}`;
  } else {
    adjustment = 200;
    description = `Light ${isLoss ? 'deficit' : 'surplus'} (${sign * 200} kcal) for final <2kg ${isLoss ? 'loss' : 'gain'}`;
  }
  
  return {
    adjustment: sign * adjustment,
    reason: `${description} (${delta.toFixed(1)}kg remaining)`
  };
};

// Get User Profile
router.get('/', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  sendSuccess(res, user);
}));

// Update User Profile
router.post('/', 
  auth,
  validateRequest(validations.updateProfile),
  asyncHandler(async (req, res) => {
    const { height, age, pseudo, gender, targetWeight, country } = req.body;
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    await user.update({ height, age, pseudo, gender, targetWeight, country });
    
    sendSuccess(res, {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo,
      height: user.height,
      age: user.age,
      gender: user.gender,
      targetWeight: user.targetWeight,
      consoKcal: user.consoKcal,
      weeksToGoal: user.weeksToGoal,
      country: user.country
    }, 'Profile updated successfully');
  })
);

// Calculate Calories
router.post('/calculate-calories', 
  auth,
  asyncHandler(async (req, res) => {
    const { gender, goal } = req.body;
    
    if (!gender || !goal) {
      return sendError(res, 'Gender and goal are required', 400);
    }
    
    if (!['male', 'female', 'other'].includes(gender)) {
      return sendError(res, 'Invalid gender value', 400);
    }
    
    if (!['loss', 'gain', 'maintain'].includes(goal)) {
      return sendError(res, 'Invalid goal value', 400);
    }
    
    const user = await User.findByPk(req.userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    // Get latest weight from Weight table
    const latestWeightEntry = await Weight.findOne({
      where: { userId: user.id },
      order: [['date', 'DESC']]
    });
    
    if (!latestWeightEntry) {
      return sendError(res, 'No weight data found. Please log your weight first.', 400);
    }
    
    const weight = latestWeightEntry.weight;
    const height = user.height || 175;
    const age = user.age || 30;
    
    // 1. Calculate BMR
    const bmr = calculateBMR(weight, height, age, gender);
    
    // 2. Determine Activity Factor from Strava
    let activityFactor = 1.2;
    let avgHoursPerWeek = 0;
    
    if (user.stravaAccessToken) {
      try {
        const token = await getValidStravaToken(user);
        if (token) {
          const before = Math.floor(Date.now() / 1000);
          const after = before - (28 * 24 * 60 * 60); // 28 days ago
          
          const activities = await fetchStravaActivities(token, { before, after, per_page: 100 });
          
          const totalSeconds = activities.reduce((sum, act) => sum + (act.moving_time || 0), 0);
          avgHoursPerWeek = (totalSeconds / 3600) / 4;
          activityFactor = calculateActivityFactor(avgHoursPerWeek);
        }
      } catch (error) {
        logger.warn('Failed to fetch Strava activities for calorie calculation', { userId: user.id });
        // Continue with default activity factor
      }
    }
    
    // 3. Calculate TDEE
    const tdee = bmr * activityFactor;
    
    // 4. Calculate Target Calories
    const delta = user.targetWeight ? Math.abs(weight - user.targetWeight) : 0;
    const { adjustment, reason } = calculateCalorieAdjustment(goal, delta);
    const targetCalories = tdee + adjustment;
    
    // 5. Calculate Time to Goal
    let weeksToGoal = null;
    if (delta > 0 && adjustment !== 0) {
      const dailyDiff = Math.abs(adjustment);
      const weeklyChangeKg = (dailyDiff * 7) / 7700; // ~7700 kcal per kg
      if (weeklyChangeKg > 0) {
        weeksToGoal = parseFloat((delta / weeklyChangeKg).toFixed(1));
      }
    }
    
    // 6. Save to User
    await user.update({ 
      consoKcal: Math.round(targetCalories),
      weeksToGoal
    });
    
    const result = {
      bmr: Math.round(bmr),
      activityFactor,
      avgHoursPerWeek: avgHoursPerWeek.toFixed(1),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      delta: delta.toFixed(1),
      adjustmentReason: reason,
      weeksToGoal
    };
    
    logger.info('Calorie calculation completed', { userId: user.id, result });
    sendSuccess(res, result, 'Calories calculated successfully');
  })
);

module.exports = router;

