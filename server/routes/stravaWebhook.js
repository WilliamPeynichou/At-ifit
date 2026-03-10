const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { handleStravaEvent } = require('../services/webhookService');
const { webhookLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'atifit_webhook_token';
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';

// Rate limiting sur toutes les routes webhook
router.use(webhookLimiter);

/**
 * GET /api/webhook
 * Endpoint de validation Strava (challenge handshake)
 */
router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('[Webhook] Validation Strava réussie');
    return res.json({ 'hub.challenge': challenge });
  }

  logger.warn('[Webhook] Validation Strava échouée', { mode });
  res.status(403).json({ error: 'Forbidden' });
});

/**
 * POST /api/webhook
 * Reçoit les événements Strava (create/update/delete activité)
 * La signature HMAC est OBLIGATOIRE
 */
router.post('/', (req, res) => {
  const signature = req.headers['x-hub-signature'];

  // Signature et secret sont obligatoires
  if (!signature || !CLIENT_SECRET) {
    logger.warn('[Webhook] Requête rejetée : signature ou secret manquant');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = JSON.stringify(req.body);
  const expected = 'sha1=' + crypto.createHmac('sha1', CLIENT_SECRET).update(body).digest('hex');

  // Comparaison à temps constant pour éviter les timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    logger.warn('[Webhook] Signature HMAC invalide');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // Validation basique du payload
  const objectId = parseInt(event.object_id, 10);
  const ownerId = parseInt(event.owner_id, 10);
  if (!Number.isFinite(objectId) || !Number.isFinite(ownerId) || objectId <= 0 || ownerId <= 0) {
    logger.warn('[Webhook] Payload invalide', { object_id: event.object_id, owner_id: event.owner_id });
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Répond immédiatement à Strava (200 requis dans les 2 secondes)
  res.status(200).json({ status: 'received' });

  logger.info('[Webhook] Événement reçu', {
    type: event.object_type,
    aspect: event.aspect_type,
    objectId,
    ownerId,
  });

  // Traitement asynchrone avec payload normalisé
  handleStravaEvent({ ...event, object_id: objectId, owner_id: ownerId }).catch(err =>
    logger.error('[Webhook] Erreur traitement événement', { error: err.message })
  );
});

module.exports = router;
