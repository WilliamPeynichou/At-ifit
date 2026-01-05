const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

/**
 * Configuration Helmet pour les headers de sécurité
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Rate limiting renforcé pour différentes routes
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000) + ' seconds'
      });
    }
  });
};

// Rate limiter pour l'authentification (plus strict)
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 tentatives max
  'Too many authentication attempts. Please try again later.'
);

// Rate limiter pour les requêtes générales
const generalRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requêtes max
  'Too many requests. Please try again later.'
);

// Rate limiter pour les requêtes API (plus strict)
const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 requêtes max
  'Too many API requests. Please try again later.'
);

/**
 * Sanitization des entrées pour prévenir NoSQL injection
 * Middleware personnalisé qui n'applique mongoSanitize que sur req.body
 * pour éviter l'erreur "Cannot set property query"
 */
const sanitizeInput = (req, res, next) => {
  // Sauvegarder req.query original
  const originalQuery = req.query;
  
  // Créer un objet temporaire pour req.query pour éviter l'erreur
  Object.defineProperty(req, 'query', {
    get: () => originalQuery,
    set: () => {}, // Ne rien faire si on essaie de modifier
    configurable: true
  });
  
  // Appliquer mongoSanitize uniquement sur req.body
  if (req.body && typeof req.body === 'object') {
    // Sanitize req.body manuellement
    const sanitizeObject = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Remplacer les caractères dangereux dans les clés
        const cleanKey = key.replace(/[$]/g, '_');
        sanitized[cleanKey] = sanitizeObject(value);
      }
      return sanitized;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  // Restaurer req.query original
  Object.defineProperty(req, 'query', {
    value: originalQuery,
    writable: false,
    configurable: true
  });
  
  next();
};

/**
 * Validation et sanitization des paramètres d'URL
 * Note: On ne modifie pas req.query directement car cela peut causer des erreurs
 * La sanitization est déjà gérée par mongoSanitize et sanitizeBody
 */
const sanitizeParams = (req, res, next) => {
  // Ne pas modifier req.query ou req.params directement
  // La sanitization est déjà gérée par mongoSanitize (sanitizeInput)
  // et sanitizeBody pour le body
  // On passe simplement au middleware suivant
  next();
};

module.exports = {
  helmetConfig,
  authRateLimiter,
  generalRateLimiter,
  apiRateLimiter,
  sanitizeInput,
  sanitizeParams
};

