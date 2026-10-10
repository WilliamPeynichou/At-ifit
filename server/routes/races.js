const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const Race = require('../models/Race');
const { normalizeRaceInput } = require('../utils/raceInput');
const logger = require('../utils/logger');

const router = express.Router();

const LIST_ATTRIBUTES = ['id', 'name', 'sport', 'raceDate', 'locationLabel', 'distanceKm', 'elevationGainM', 'targetMinutes', 'updatedAt'];
const ID_PATTERN = /^\d+$/;

const sendValidationError = (res, errors) => sendError(res, errors.join('. '), 400);

const findOwnedRace = (id, userId) => {
  if (!ID_PATTERN.test(String(id))) return null;
  return Race.findOne({ where: { id, userId } });
};

router.get('/', auth, asyncHandler(async (req, res) => {
  const races = await Race.findAll({
    where: { userId: req.userId },
    attributes: LIST_ATTRIBUTES,
    order: [['raceDate', 'ASC'], ['updatedAt', 'DESC']],
  });
  sendSuccess(res, races);
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const race = await findOwnedRace(req.params.id, req.userId);
  if (!race) return sendError(res, 'Course introuvable', 404);
  sendSuccess(res, race);
}));

router.post('/', auth, asyncHandler(async (req, res) => {
  const { input, errors } = normalizeRaceInput(req.body);
  if (errors.length) return sendValidationError(res, errors);

  const race = await Race.create({ ...input, userId: req.userId });
  logger.info('[Races] Course créée', { userId: req.userId, raceId: race.id, sport: race.sport });
  sendSuccess(res, race, 'Course créée', 201);
}));

router.put('/:id', auth, asyncHandler(async (req, res) => {
  const race = await findOwnedRace(req.params.id, req.userId);
  if (!race) return sendError(res, 'Course introuvable', 404);

  const { input, errors } = normalizeRaceInput(req.body);
  if (errors.length) return sendValidationError(res, errors);

  await race.update(input);
  sendSuccess(res, race);
}));

router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const race = await findOwnedRace(req.params.id, req.userId);
  if (!race) return sendError(res, 'Course introuvable', 404);

  await race.destroy();
  logger.info('[Races] Course supprimée', { userId: req.userId, raceId: race.id });
  sendSuccess(res, { deleted: true });
}));

module.exports = router;
