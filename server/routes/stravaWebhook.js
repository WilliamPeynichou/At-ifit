const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { handleStravaEvent } = require('../services/webhookService');
const logger = require('../utils/logger');

const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'atifit_webhook_token';
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';

/**
 * GET /api/webhook/strava
 * Endpoint de validation Strava (challenge handshake)
 */
router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('[Webhook] Validation Strava réussie');
    return res.json({ 'hub.challenge': challenge });
  }

  logger.warn('[Webhook] Validation Strava échouée', { mode, token });
  res.status(403).json({ error: 'Forbidden' });
});

/**
 * POST /api/webhook/strava
 * Reçoit les événements Strava (create/update/delete activité)
 */
router.post('/', (req, res) => {
  // Vérifie la signature HMAC si présente
  const signature = req.headers['x-hub-signature'];
  if (signature && CLIENT_SECRET) {
    const body = JSON.stringify(req.body);
    const expected = 'sha1=' + crypto.createHmac('sha1', CLIENT_SECRET).update(body).digest('hex');
    if (signature !== expected) {
      logger.warn('[Webhook] Signature HMAC invalide');
      return res.status(403).json({ error: 'Invalid signature' });
    }
  }

  // Répond immédiatement à Strava (200 requis dans les 2 secondes)
  res.status(200).json({ status: 'received' });

  // Traitement asynchrone sans bloquer la réponse
  const event = req.body;
  logger.info('[Webhook] Événement reçu', {
    type: event.object_type,
    aspect: event.aspect_type,
    objectId: event.object_id,
    ownerId: event.owner_id,
  });

  handleStravaEvent(event).catch(err =>
    logger.error('[Webhook] Erreur traitement événement', { error: err.message, event })
  );
});

module.exports = router;
