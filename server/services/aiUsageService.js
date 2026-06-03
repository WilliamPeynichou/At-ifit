const AiUsageLog = require('../models/AiUsageLog');
const logger = require('../utils/logger');
const { sanitizeMetadata } = require('../utils/sensitiveData');

function estimateTokens(...parts) {
  const chars = parts.filter(Boolean).join(' ').length;
  return Math.ceil(chars / 4);
}

async function logAiUsage({ userId = null, provider, model = null, usageType = 'message_agent', status = 'success', durationMs = null, userMessageLength = null, responseLength = null, dataUsed = [], intents = [], actionProposed = null, actionStatus = null, promptTokens = null, completionTokens = null, estimatedCost = null, errorMessage = null, metadata = {} }) {
  try {
    return await AiUsageLog.create({
      userId,
      provider,
      model,
      usageType,
      status,
      durationMs,
      userMessageLength,
      responseLength,
      dataUsed: sanitizeMetadata(dataUsed),
      intents: sanitizeMetadata(intents),
      actionProposed,
      actionStatus,
      promptTokens,
      completionTokens,
      estimatedTokens: promptTokens || completionTokens ? null : estimateTokens(metadata?.inputPreview, metadata?.outputPreview),
      estimatedCost,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 500) : null,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    logger.warn('[AI Usage] log failed', { userId, usageType, error: error.message });
    return null;
  }
}

module.exports = { logAiUsage, estimateTokens };
