const SPORTS = ['running', 'cycling', 'swimming', 'triathlon'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const LIMITS = {
  nameLength: 120,
  locationLength: 255,
  distanceKm: { min: 0, max: 1000 },
  elevationGainM: { min: 0, max: 30000 },
  targetMinutes: { min: 0, max: 100000 },
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function parseText(value, field, maxLength, errors, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) errors.push(`${field} est requis`);
    return null;
  }
  if (typeof value !== 'string') {
    errors.push(`${field} doit être une chaîne de caractères`);
    return null;
  }
  const text = value.trim();
  if (!text) {
    if (required) errors.push(`${field} est requis`);
    return null;
  }
  if (text.length > maxLength) {
    errors.push(`${field} ne doit pas dépasser ${maxLength} caractères`);
    return null;
  }
  return text;
}

function parseOptionalNumber(value, field, { min, max }, errors) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${field} doit être un nombre entre ${min} et ${max}`);
    return null;
  }
  return value;
}

function parseRaceDate(value, errors) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
    errors.push('raceDate doit être au format YYYY-MM-DD');
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    errors.push('raceDate n\'est pas une date valide');
    return null;
  }
  return value;
}

function parseOptionalObject(value, field, errors) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    errors.push(`${field} doit être un objet`);
    return null;
  }
  return value;
}

/**
 * Valide le corps d'une course (contrat RaceInput) et renvoie uniquement les champs connus.
 * @returns {{ input: object|null, errors: string[] }}
 */
function normalizeRaceInput(body) {
  const source = isPlainObject(body) ? body : null;
  if (!source) return { input: null, errors: ['Le corps de la requête doit être un objet'] };

  const errors = [];
  const sport = source.sport;
  if (!SPORTS.includes(sport)) errors.push(`sport doit être l'une des valeurs : ${SPORTS.join(', ')}`);

  const input = {
    name: parseText(source.name, 'name', LIMITS.nameLength, errors, { required: true }),
    sport: SPORTS.includes(sport) ? sport : null,
    raceDate: parseRaceDate(source.raceDate, errors),
    locationLabel: parseText(source.locationLabel, 'locationLabel', LIMITS.locationLength, errors),
    distanceKm: parseOptionalNumber(source.distanceKm, 'distanceKm', LIMITS.distanceKm, errors),
    elevationGainM: parseOptionalNumber(source.elevationGainM, 'elevationGainM', LIMITS.elevationGainM, errors),
    targetMinutes: parseOptionalNumber(source.targetMinutes, 'targetMinutes', LIMITS.targetMinutes, errors),
    objective: parseOptionalObject(source.objective, 'objective', errors) || {},
    planner: parseOptionalObject(source.planner, 'planner', errors),
    strategy: parseOptionalObject(source.strategy, 'strategy', errors),
    trainingPlan: parseOptionalObject(source.trainingPlan, 'trainingPlan', errors),
  };

  if (errors.length) return { input: null, errors };
  return { input, errors: [] };
}

module.exports = { SPORTS, normalizeRaceInput };
