/**
 * Utilitaires de validation côté frontend
 */

/**
 * Valider un email
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valider un mot de passe (force minimale)
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>\[\]\\\/_+\-=~`]/.test(password)) return false;
  return true;
};

/**
 * Valider un nombre dans une plage
 */
export const validateNumber = (value, min = null, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
};

/**
 * Valider une date
 */
export const validateDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Valider qu'une date n'est pas dans le futur
 */
export const validateDateNotFuture = (dateString) => {
  if (!validateDate(dateString)) return false;
  const date = new Date(dateString);
  return date <= new Date();
};

