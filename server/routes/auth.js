const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const auth = require('../middleware/auth');
const { validateRequest, validations } = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Generate JWT access token (short-lived: 15 minutes)
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

/**
 * Generate JWT refresh token (long-lived: 5 days)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '5d' }
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
  authLimiter,
  validateRequest(validations.register),
  asyncHandler(async (req, res) => {
    const { email, password, pseudo, country } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn('Registration attempt with existing email', { 
        email, 
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return sendError(res, 'Email already registered', 400);
    }

    // Create user
    const user = await User.create({
      email,
      password,
      pseudo: pseudo || email.split('@')[0],
      country: country || 'FR',
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    });

    logger.info('New user registered', { 
      userId: user.id, 
      email: user.email,
      ip: req.ip
    });

    sendSuccess(res, {
      user: formatUserResponse(user),
      accessToken,
      refreshToken
    }, 'Registration successful', 201);
  })
);

// Login
router.post('/login',
  authLimiter,
  validateRequest(validations.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    
    // Always perform password check to prevent timing attacks
    let isMatch = false;
    if (user) {
      isMatch = await user.comparePassword(password);
    }

    if (!user || !isMatch) {
      logger.warn('Failed login attempt', { 
        email, 
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userExists: !!user
      });
      return sendError(res, 'Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    });

    logger.info('User logged in', { 
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    sendSuccess(res, {
      user: formatUserResponse(user),
      accessToken,
      refreshToken
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

// Refresh access token
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      if (decoded.type !== 'refresh') {
        return sendError(res, 'Invalid token type', 401);
      }

      // Check if refresh token exists in database and is not revoked
      const storedToken = await RefreshToken.findOne({
        where: {
          token: refreshToken,
          userId: decoded.id,
          revoked: false
        }
      });

      if (!storedToken) {
        logger.warn('Refresh token not found or revoked', { userId: decoded.id });
        return sendError(res, 'Invalid or revoked refresh token', 401);
      }

      // Check if token is expired
      if (new Date() > storedToken.expiresAt) {
        await storedToken.update({ revoked: true });
        return sendError(res, 'Refresh token expired', 401);
      }

      // Generate new access token
      const accessToken = generateAccessToken(decoded.id);

      logger.info('Access token refreshed', { userId: decoded.id });

      sendSuccess(res, {
        accessToken
      }, 'Token refreshed successfully');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendError(res, 'Refresh token expired', 401);
      }
      if (error.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid refresh token', 401);
      }
      logger.error('Error refreshing token', error);
      return sendError(res, 'Failed to refresh token', 500);
    }
  })
);

// Logout (revoke refresh token)
router.post('/logout',
  auth,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the refresh token
      await RefreshToken.update(
        { revoked: true, revokedAt: new Date() },
        {
          where: {
            token: refreshToken,
            userId: req.userId
          }
        }
      );
    }

    logger.info('User logged out', { userId: req.userId });

    sendSuccess(res, null, 'Logged out successfully');
  })
);

module.exports = router;
