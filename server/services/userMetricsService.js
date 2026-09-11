const { Op, fn, col } = require('sequelize');
const Activity = require('../models/Activity');
const User = require('../models/User');

const DEFAULT_HR_REST = 60;
const DEFAULT_HR_MAX = 180;

async function resolveMaxHeartrate(userId) {
  // Priorité 1 : valeur mesurée/testée explicitement saisie par l’athlète.
  const user = await User.findByPk(userId, { attributes: ['maxHeartrate', 'age'] });
  const userInput = Number(user?.maxHeartrate);
  if (Number.isFinite(userInput) && userInput >= 100 && userInput <= 230) {
    return {
      value: userInput,
      source: 'user_input',
      confidence: 'high',
    };
  }

  // Priorité 2 : FC max observée sur activités. Le seuil bas filtre les sorties
  // qui ne se rapprochent manifestement pas d'un maximum physiologique.
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
      confidence: 'medium',
    };
  }

  // Priorité 3 : formule de Tanaka (2001) si âge disponible.
  if (user?.age && user.age > 0 && user.age < 110) {
    return {
      value: Math.round(208 - 0.7 * user.age),
      source: 'tanaka_formula',
      confidence: 'medium',
    };
  }

  // Priorité 4 : défaut explicite, uniquement faute de donnée individuelle.
  return {
    value: DEFAULT_HR_MAX,
    source: 'default',
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

function validOverride(value, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

async function resolveHrLimits(userId, overrides = {}) {
  const maxOverride = validOverride(overrides.hrMax, 100, 230);
  const restOverride = validOverride(overrides.hrRest, 30, 100);
  const [maxResolved, restResolved] = await Promise.all([
    maxOverride !== null ? Promise.resolve({ value: maxOverride, source: 'override', confidence: 'high' }) : resolveMaxHeartrate(userId),
    restOverride !== null ? Promise.resolve({ value: restOverride, source: 'override', confidence: 'high' }) : resolveRestHeartrate(userId),
  ]);

  // Des limites incohérentes rendent Karvonen/TRIMP invalides. On conserve la
  // FC max résolue et remplace uniquement la FC de repos fautive par le défaut.
  const safeRest = restResolved.value < maxResolved.value
    ? restResolved
    : { value: DEFAULT_HR_REST, source: 'default_invalid_pair', confidence: 'low' };

  return {
    hrMax: maxResolved.value,
    hrRest: safeRest.value,
    hrMaxSource: maxResolved.source,
    hrRestSource: safeRest.source,
    hrMaxConfidence: maxResolved.confidence,
    hrRestConfidence: safeRest.confidence,
  };
}

module.exports = {
  resolveMaxHeartrate,
  resolveRestHeartrate,
  resolveHrLimits,
  DEFAULT_HR_REST,
  DEFAULT_HR_MAX,
};
