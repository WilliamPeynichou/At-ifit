const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateRequest, validations } = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Format user response (exclude sensitive data)
 */
const formatUserResponse = (user) => ({
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
});

// Register
router.post('/register', 
  validateRequest(validations.register),
  asyncHandler(async (req, res) => {
    const { email, password, pseudo, country } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return sendError(res, 'Email already registered', 400);
    }

    // Create user
    const user = await User.create({
      email,
      password,
      pseudo: pseudo || email.split('@')[0],
      country: country || 'FR',
    });

    const token = generateToken(user.id);

    logger.info('New user registered', { userId: user.id, email: user.email });

    sendSuccess(res, {
      user: formatUserResponse(user),
      token
    }, 'Registration successful', 201);
  })
);

// Login
router.post('/login',
  validateRequest(validations.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const token = generateToken(user.id);

    logger.info('User logged in', { userId: user.id });

    sendSuccess(res, {
      user: formatUserResponse(user),
      token
    }, 'Login successful');
  })
);

// Get current user
router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  sendSuccess(res, user);
}));

module.exports = router;
