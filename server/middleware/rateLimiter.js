const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limiter pour les routes d'authentification
 * Limite à 5 tentatives par 15 minutes par IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max par fenêtre
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Retourne les headers RateLimit-* dans la réponse
  legacyHeaders: false, // Désactive les headers X-RateLimit-*
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter général pour les routes protégées
 * Limite à 100 requêtes par 15 minutes par IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max par fenêtre
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  generalLimiter
};

