const GUT_TOLERANCE = ['low', 'medium', 'high', 'trained'];
const SWEAT_SODIUM = ['low', 'normal', 'salty'];
const DIETS = ['omnivore', 'vegetarian', 'vegan', 'pescatarian'];

const MAX_ALLERGIES = 15;
const MAX_ALLERGY_LENGTH = 40;
const MAX_PRODUCTS_LENGTH = 500;

const NUTRITION_PROFILE_DEFAULTS = Object.freeze({
  gutTolerance: 'medium',
  sweatSodiumProfile: 'normal',
  diet: 'omnivore',
  allergies: [],
  preferredProducts: '',
  avoidedProducts: '',
  caffeine: true,
});

function pickEnum(value, allowed, field, errors) {
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) {
    errors.push(`${field} doit être l'une des valeurs : ${allowed.join(', ')}`);
    return undefined;
  }
  return value;
}

function pickText(value, field, errors) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    errors.push(`${field} doit être une chaîne de caractères`);
    return '';
  }
  const text = value.trim();
  if (text.length > MAX_PRODUCTS_LENGTH) {
    errors.push(`${field} ne doit pas dépasser ${MAX_PRODUCTS_LENGTH} caractères`);
  }
  return text.slice(0, MAX_PRODUCTS_LENGTH);
}

function pickAllergies(value, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push('allergies doit être une liste');
    return [];
  }
  const items = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      errors.push('Chaque allergie doit être une chaîne de caractères');
      continue;
    }
    const label = item.trim();
    if (!label) continue;
    if (items.some(existing => existing.toLowerCase() === label.toLowerCase())) continue;
    if (label.length > MAX_ALLERGY_LENGTH) {
      errors.push(`Chaque allergie ne doit pas dépasser ${MAX_ALLERGY_LENGTH} caractères`);
      continue;
    }
    items.push(label);
  }
  if (items.length > MAX_ALLERGIES) {
    errors.push(`Au maximum ${MAX_ALLERGIES} allergies`);
  }
  return items.slice(0, MAX_ALLERGIES);
}

/**
 * Valide un profil nutrition partiel et le complète avec les valeurs par défaut.
 * @returns {{ profile: object|null, errors: string[] }}
 */
function normalizeNutritionProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { profile: null, errors: ['Le profil nutrition doit être un objet'] };
  }

  const errors = [];
  const profile = {
    gutTolerance: pickEnum(input.gutTolerance, GUT_TOLERANCE, 'gutTolerance', errors) ?? NUTRITION_PROFILE_DEFAULTS.gutTolerance,
    sweatSodiumProfile: pickEnum(input.sweatSodiumProfile, SWEAT_SODIUM, 'sweatSodiumProfile', errors) ?? NUTRITION_PROFILE_DEFAULTS.sweatSodiumProfile,
    diet: pickEnum(input.diet, DIETS, 'diet', errors) ?? NUTRITION_PROFILE_DEFAULTS.diet,
    allergies: pickAllergies(input.allergies, errors),
    preferredProducts: pickText(input.preferredProducts, 'preferredProducts', errors),
    avoidedProducts: pickText(input.avoidedProducts, 'avoidedProducts', errors),
    caffeine: NUTRITION_PROFILE_DEFAULTS.caffeine,
  };

  if (input.caffeine !== undefined && input.caffeine !== null) {
    if (typeof input.caffeine !== 'boolean') errors.push('caffeine doit être un booléen');
    else profile.caffeine = input.caffeine;
  }

  if (errors.length) return { profile: null, errors };
  return { profile, errors: [] };
}

/** Profil renvoyé à l'API : défauts si aucun profil n'a encore été enregistré. */
function serializeNutritionProfile(stored) {
  if (!stored || typeof stored !== 'object') return { ...NUTRITION_PROFILE_DEFAULTS, allergies: [] };
  const { profile } = normalizeNutritionProfile(stored);
  return profile || { ...NUTRITION_PROFILE_DEFAULTS, allergies: [] };
}

module.exports = {
  GUT_TOLERANCE,
  SWEAT_SODIUM,
  DIETS,
  NUTRITION_PROFILE_DEFAULTS,
  normalizeNutritionProfile,
  serializeNutritionProfile,
};
