const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const ml = require('../services/personalMlService');
const router = express.Router();
router.use(auth);
router.get('/model', async (req, res, next) => {
  try { res.json(ml.summary(await ml.personalModel(req.userId))); }
  catch (e) { next(e); }
});
router.post('/estimate', rateLimit({ windowMs: 60000, max: 5 }), async (req, res, next) => {
  const { distanceKm, elevationM, date } = req.body || {};
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm <= 5 || distanceKm > 500 ||
      typeof elevationM !== 'number' || !Number.isFinite(elevationM) || elevationM < 0 || elevationM > 20000 ||
      typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
      Date.parse(date) <= Date.now()) {
    return res.status(400).json({ error: 'Distance > 5 et ≤ 500 km, D+ de 0 à 20 000 m, date future requise.' });
  }
  try {
    const model = await ml.personalModel(req.userId);
    if (!model) return res.status(404).json({ error: 'Aucun modèle personnel disponible.' });
    if (Date.parse(date) <= Date.parse(model.manifest.created_at)) {
      return res.status(400).json({ error: 'La date doit être postérieure à l’entraînement.' });
    }
    try { return res.json(await ml.estimate(model, { distanceKm, elevationM, date })); }
    catch { return res.status(503).json({ error: 'Calcul ML indisponible. Réessaie plus tard.' }); }
  } catch (e) { next(e); }
});
module.exports = router;
