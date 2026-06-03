const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { aiCoachLimiter } = require('../middleware/rateLimiter');
const { sendMessageToAICoach, generateWeeklyReport, executeConfirmedAction } = require('../services/aiCoachService');
const logger = require('../utils/logger');
const { logAiUsage } = require('../services/aiUsageService');
const { logAuditEvent } = require('../services/auditService');

const router = express.Router();
const pendingActions = new Map();
const ACTION_TTL_MS = 30 * 60 * 1000;

function actionKey(userId, actionId) {
  return `${userId}:${actionId}`;
}

function cleanupExpiredActions() {
  const now = Date.now();
  for (const [key, entry] of pendingActions.entries()) {
    if (!entry?.expiresAt || entry.expiresAt <= now) pendingActions.delete(key);
  }
}

function storePendingAction(userId, action) {
  if (!action) return null;
  cleanupExpiredActions();
  const id = crypto.randomUUID();
  const actionWithId = {
    ...action,
    id,
    status: 'pending_confirmation',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ACTION_TTL_MS).toISOString(),
  };
  pendingActions.set(actionKey(userId, id), { action: actionWithId, expiresAt: Date.now() + ACTION_TTL_MS });
  return actionWithId;
}

function getPendingAction(userId, actionId) {
  cleanupExpiredActions();
  return pendingActions.get(actionKey(userId, actionId))?.action || null;
}

function deletePendingAction(userId, actionId) {
  pendingActions.delete(actionKey(userId, actionId));
}

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
    const pendingAction = storePendingAction(userId, result.pendingAction);
    if (pendingAction) {
      await logAuditEvent({ req, userId, actorUserId: userId, eventType: 'ai_action_proposed', category: 'ai', message: 'AI action proposed', metadata: { actionType: pendingAction.type } });
    }
    return sendSuccess(res, {
      response: result.message,
      agentStatus: result.agentStatus,
      intents: result.intents || [],
      dataUsed: result.dataUsed || [],
      usedData: result.dataUsed || [],
      dataSources: result.dataUsed || [],
      pendingAction,
      actionProposal: pendingAction,
    });
  }

  if (result.refusal) {
    return sendSuccess(res, {
      response: result.error,
      agentStatus: 'refusal',
      refusal: true,
      dataUsed: [],
      usedData: [],
      dataSources: [],
      pendingAction: null,
      actionProposal: null,
    });
  }

  logger.error('[AI Coach Route] Échec service IA', { userId, error: result.error });
  return sendError(res, result.error, 503);
}));

// POST /api/ai-coach/actions/:id/confirm — exécute une action uniquement après validation explicite
router.post('/actions/:id/confirm', auth, aiCoachLimiter, asyncHandler(async (req, res) => {
  const action = getPendingAction(req.userId, req.params.id);
  if (!action) return sendError(res, 'Action en attente introuvable ou expirée', 404);

  const result = await executeConfirmedAction(req.userId, action);
  deletePendingAction(req.userId, req.params.id);

  if (result.success) {
    await logAiUsage({ userId: req.userId, provider: 'internal', usageType: 'action_ia', status: 'success', actionProposed: action.type, actionStatus: 'validated', metadata: { actionId: req.params.id } });
    await logAuditEvent({ req, userId: req.userId, actorUserId: req.userId, eventType: 'ai_action_validated', category: 'ai', message: 'AI action validated', metadata: { actionId: req.params.id, actionType: action.type } });
    return sendSuccess(res, {
      ...result,
      actionId: req.params.id,
      agentStatus: 'action_executed',
    });
  }

  return sendError(res, result.error || 'Action impossible à exécuter', 400);
}));

// POST /api/ai-coach/actions/:id/cancel — annule proprement une proposition sans modification
router.post('/actions/:id/cancel', auth, aiCoachLimiter, asyncHandler(async (req, res) => {
  const action = getPendingAction(req.userId, req.params.id);
  if (!action) return sendError(res, 'Action en attente introuvable ou expirée', 404);
  deletePendingAction(req.userId, req.params.id);
  await logAiUsage({ userId: req.userId, provider: 'internal', usageType: 'action_ia', status: 'success', actionProposed: action.type, actionStatus: 'cancelled', metadata: { actionId: req.params.id } });
  await logAuditEvent({ req, userId: req.userId, actorUserId: req.userId, eventType: 'ai_action_cancelled', category: 'ai', message: 'AI action cancelled', metadata: { actionId: req.params.id, actionType: action.type } });
  return sendSuccess(res, {
    success: true,
    actionId: req.params.id,
    agentStatus: 'action_cancelled',
    message: 'Action annulée. Aucune donnée n’a été modifiée.',
  });
}));

// GET /api/ai-coach/weekly-report
router.get('/weekly-report', auth, aiCoachLimiter, asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  const result = await generateWeeklyReport(req.userId, force);

  if (result.success) {
    return sendSuccess(res, {
      report: result.report,
      cached: result.cached,
      generatedAt: result.generatedAt,
    });
  }

  return sendError(res, result.error, 503);
}));

module.exports = router;
