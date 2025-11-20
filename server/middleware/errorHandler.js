/**
 * Centralized error handling middleware
 */

const logger = require('../utils/logger');

/**
 * Standard API response format
 * Maintains backward compatibility - returns data directly
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  // For backward compatibility, return data directly instead of wrapping
  res.status(statusCode).json(data);
};

const sendError = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: message
  };
  
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Global error handler middleware
 * Should be added last in middleware chain
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', err);
  
  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return sendError(res, 'Validation error', 400, err.errors.map(e => e.message));
  }
  
  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return sendError(res, 'Resource already exists', 409);
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }
  
  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  sendError(res, message, statusCode);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  sendError(res, 'Route not found', 404);
};

/**
 * Async route wrapper to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  sendSuccess,
  sendError
};
