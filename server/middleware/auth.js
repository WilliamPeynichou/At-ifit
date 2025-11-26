const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No authentication token provided' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Expired token attempt', { ip: req.ip });
        return res.status(401).json({ 
          success: false,
          error: 'Token expired. Please refresh your token.' 
        });
      }
      if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid token attempt', { ip: req.ip });
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token' 
        });
      }
      throw error;
    }

    // Verify token type (should be access token)
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token type' 
      });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      logger.warn('Token for non-existent user', { userId: decoded.id, ip: req.ip });
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message, ip: req.ip });
    res.status(401).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
};

module.exports = auth;
