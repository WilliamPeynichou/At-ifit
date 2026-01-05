/**
 * Sanitization utilities pour prévenir XSS et injection
 */

/**
 * Échapper les caractères HTML pour prévenir XSS
 */
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Nettoyer une chaîne de caractères (supprimer caractères dangereux)
 */
const cleanString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

/**
 * Valider et nettoyer un email
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
};

/**
 * Valider et nettoyer un nombre
 */
const sanitizeNumber = (value, min = null, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (min !== null && num < min) return null;
  if (max !== null && num > max) return null;
  return num;
};

/**
 * Valider et nettoyer un entier
 */
const sanitizeInteger = (value, min = null, max = null) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;
  if (min !== null && num < min) return null;
  if (max !== null && num > max) return null;
  return num;
};

/**
 * Nettoyer un objet récursivement
 * Note: Les champs 'password' ne sont PAS modifiés pour préserver leur intégrité
 */
const sanitizeObject = (obj, skipPassword = false) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    // Ne pas modifier les mots de passe
    if (skipPassword) {
      return String(obj);
    }
    return cleanString(String(obj));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, skipPassword));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = cleanString(key);
    // Ne pas modifier le champ 'password' - préserver tel quel
    if (key === 'password' || key.toLowerCase().includes('password')) {
      sanitized[cleanKey] = value; // Garder le mot de passe tel quel
    } else {
      sanitized[cleanKey] = sanitizeObject(value, skipPassword);
    }
  }
  return sanitized;
};

/**
 * Middleware pour sanitizer le body de la requête
 * Note: Les mots de passe ne sont PAS modifiés pour préserver leur intégrité
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Ne pas modifier les mots de passe lors de la sanitization
    req.body = sanitizeObject(req.body, true);
  }
  next();
};

module.exports = {
  escapeHtml,
  cleanString,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeObject,
  sanitizeBody
};

