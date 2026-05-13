const { Op, fn, col } = require('sequelize');
const Activity = require('../models/Activity');
const User = require('../models/User');

const DEFAULT_HR_REST = 60;
const HR_MAX_FLOOR_FALLBACK = 180;

async function resolveMaxHeartrate(userId) {
  // Priorité 1 : FC max observée sur activités. Une mesure réelle prime toujours sur une formule de population.
  // Seuil 140 bpm pour éviter qu'une sortie d'endurance basse ne soit prise comme "vraie" FC max.
  const maxHrRow = await Activity.findOne({
    where: { userId, maxHeartrate: { [Op.not]: null } },
    attributes: [[fn('MAX', col('maxHeartrate')), 'maxHr']],
    raw: true,
  });
  const observed = Number(maxHrRow?.maxHr) || 0;
  if (observed >= 140) {
    return {
      value: observed,
      source: 'observed_max',
      confidence: 'high',
    };
  }

  // Priorité 2 : formule de Tanaka (2001) si âge dispo.
  const user = await User.findByPk(userId, { attributes: ['age'] });
  if (user?.age && user.age > 0 && user.age < 110) {
    return {
      value: Math.round(208 - 0.7 * user.age),
      source: 'tanaka_formula',
      confidence: 'medium',
    };
  }

  // Priorité 3 : plancher arbitraire.
  return {
    value: HR_MAX_FLOOR_FALLBACK,
    source: 'default_floor',
    confidence: 'low',
  };
}

async function resolveRestHeartrate(userId) {
  const user = await User.findByPk(userId, { attributes: ['restHeartrate'] });
  if (user?.restHeartrate && user.restHeartrate >= 30 && user.restHeartrate <= 100) {
    return {
      value: user.restHeartrate,
      source: 'user_input',
      confidence: 'high',
    };
  }
  return {
    value: DEFAULT_HR_REST,
    source: 'default',
    confidence: 'low',
  };
}

async function resolveHrLimits(userId, overrides = {}) {
  const [maxResolved, restResolved] = await Promise.all([
    overrides.hrMax ? Promise.resolve({ value: Number(overrides.hrMax), source: 'override', confidence: 'high' }) : resolveMaxHeartrate(userId),
    overrides.hrRest ? Promise.resolve({ value: Number(overrides.hrRest), source: 'override', confidence: 'high' }) : resolveRestHeartrate(userId),
  ]);

  return {
    hrMax: maxResolved.value,
    hrRest: restResolved.value,
    hrMaxSource: maxResolved.source,
    hrRestSource: restResolved.source,
    hrMaxConfidence: maxResolved.confidence,
    hrRestConfidence: restResolved.confidence,
  };
}

module.exports = {
  resolveMaxHeartrate,
  resolveRestHeartrate,
  resolveHrLimits,
  DEFAULT_HR_REST,
  HR_MAX_FLOOR_FALLBACK,
};
