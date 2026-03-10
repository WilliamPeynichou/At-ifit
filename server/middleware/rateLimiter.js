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

/**
 * Rate limiter pour le coach IA
 * Limite à 10 messages par minute par IP
 */
const aiCoachLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('AI Coach rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      success: false,
      error: 'Trop de messages envoyés. Réessayez dans une minute.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Rate limiter pour les webhooks Strava
 * Limite à 120 requêtes par minute (2/s) — largement suffisant pour Strava
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('[Webhook] Rate limit dépassé', { ip: req.ip });
    res.status(429).json({ success: false, error: 'Too many requests' });
  }
});

module.exports = {
  authLimiter,
  generalLimiter,
  aiCoachLimiter,
  webhookLimiter
};


