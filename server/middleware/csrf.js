/**
 * Protection CSRF simplifiée
 * Note: Pour une application SPA avec tokens JWT, CSRF est moins critique
 * mais peut être ajouté pour les routes sensibles
 */

/**
 * Générer un token CSRF simple
 */
const generateCSRFToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Middleware CSRF pour les routes POST/PUT/DELETE
 * Stocke le token dans la session ou le retourne dans les headers
 */
const csrfProtection = (req, res, next) => {
  // Pour les requêtes GET, générer et retourner un token CSRF
  if (req.method === 'GET') {
    const token = generateCSRFToken();
    res.setHeader('X-CSRF-Token', token);
    // Stocker dans la session si disponible, sinon dans un cookie
    if (req.session) {
      req.session.csrfToken = token;
    } else {
      res.cookie('csrfToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
    }
    return next();
  }

  // Pour les autres méthodes, vérifier le token
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const storedToken = req.session?.csrfToken || req.cookies?.csrfToken;

  if (!token || token !== storedToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }

  next();
};

/**
 * Middleware CSRF optionnel (peut être désactivé pour les API avec JWT)
 */
const optionalCSRF = (req, res, next) => {
  // Si le token CSRF est présent, le vérifier
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  if (token) {
    const storedToken = req.session?.csrfToken || req.cookies?.csrfToken;
    if (token !== storedToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token'
      });
    }
  }
  next();
};

module.exports = {
  csrfProtection,
  optionalCSRF,
  generateCSRFToken
};

