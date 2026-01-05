/**
 * Utilitaires de sanitization pour prévenir XSS côté frontend
 */

/**
 * Échapper les caractères HTML pour prévenir XSS
 */
export const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  const div = document.createElement('div');
  div.textContent = unsafe;
  return div.innerHTML;
};

/**
 * Nettoyer une chaîne de caractères (supprimer caractères dangereux)
 */
export const cleanString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '');
};

/**
 * Valider et nettoyer un email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
};

/**
 * Valider et nettoyer un nombre
 */
export const sanitizeNumber = (value, min = null, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (min !== null && num < min) return null;
  if (max !== null && num > max) return null;
  return num;
};

/**
 * Valider et nettoyer un entier
 */
export const sanitizeInteger = (value, min = null, max = null) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;
  if (min !== null && num < min) return null;
  if (max !== null && num > max) return null;
  return num;
};

/**
 * Sanitizer un objet récursivement
 */
export const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return cleanString(String(obj));
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = cleanString(key);
    sanitized[cleanKey] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Valider une URL
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    // Autoriser seulement http et https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

