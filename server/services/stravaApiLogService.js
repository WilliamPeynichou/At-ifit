const StravaApiLog = require('../models/StravaApiLog');
const logger = require('../utils/logger');
const { sanitizeMetadata } = require('../utils/sensitiveData');

async function logStravaApiCall({ userId = null, callType = 'other', endpoint, method = 'GET', status = 'success', httpStatus = null, durationMs = null, attempts = 1, errorMessage = null, itemCount = null, resourceId = null, metadata = {} }) {
  try {
    return await StravaApiLog.create({
      userId,
      callType,
      endpoint,
      method,
      status,
      httpStatus,
      durationMs,
      attempts,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 500) : null,
      itemCount,
      resourceId: resourceId == null ? null : String(resourceId),
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    logger.warn('[Strava API] log failed', { userId, callType, error: error.message });
    return null;
  }
}

module.exports = { logStravaApiCall };
