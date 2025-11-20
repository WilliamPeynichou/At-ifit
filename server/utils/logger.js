/**
 * Simple logger utility to replace console.log/error
 * Can be extended to use Winston or Pino in production
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  info: (message, meta = {}) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, meta);
    }
  },
  
  error: (message, error = null) => {
    console.error(`[ERROR] ${message}`, error?.message || error);
    // In production, send to error tracking service (Sentry, etc.)
  },
  
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  
  debug: (message, meta = {}) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};

module.exports = logger;
