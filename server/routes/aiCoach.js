const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { aiCoachLimiter } = require('../middleware/rateLimiter');
const { sendMessageToAICoach } = require('../services/aiCoachService');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/ai-coach/message
router.post('/message', auth, aiCoachLimiter, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return sendError(res, 'Le message est requis', 400);
  }

  if (!Array.isArray(history)) {
    return sendError(res, 'Le format de l\'historique est invalide', 400);
  }

  // Limiter l'historique envoyé à Mistral (20 derniers échanges = 40 messages)
  const trimmedHistory = history.slice(-40);

  logger.info('[AI Coach Route] Message reçu', {
    userId,
    messageLength: message.trim().length,
    historyLength: trimmedHistory.length
  });

  const result = await sendMessageToAICoach(userId, message.trim(), trimmedHistory);

  if (result.success) {
    return sendSuccess(res, { response: result.message });
  }

  logger.error('[AI Coach Route] Échec service IA', { userId, error: result.error });
  return sendError(res, result.error, 503);
}));

module.exports = router;
