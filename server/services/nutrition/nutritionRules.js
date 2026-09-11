/**
 * Règles scientifiques versionnées de nutrition d'effort.
 *
 * Ce fichier ne contient que des constantes issues de la littérature référencée
 * dans `server/knowledge/sports-nutrition/manifest.json`. Aucune valeur ne doit
 * être produite par un LLM : le moteur déterministe est la seule source de vérité
 * pour les calculs, l'IA se limite à extraire des variables et à expliquer.
 */

const KNOWLEDGE_VERSION = '1.0.0';
const ALGORITHM_VERSION = '1.0.0';

/**
 * Glucides pendant l'effort, par paliers de durée (Jeukendrup 2014, ACSM 2016).
 * Au-delà de 60 g/h, une source multi-transportable (glucose:fructose) est requise.
 */
const CARBOHYDRATE_BANDS = [
  { maxDurationMin: 45, low: 0, target: 0, high: 0, note: 'Effort court : les réserves de glycogène suffisent.' },
  { maxDurationMin: 75, low: 0, target: 20, high: 30, note: 'Apport facultatif, utile surtout en intensité élevée.' },
  { maxDurationMin: 120, low: 30, target: 40, high: 60, note: 'Un apport régulier limite la baisse de régime en fin d’effort.' },
  { maxDurationMin: 180, low: 45, target: 60, high: 75, note: 'Palier classique des sorties longues.' },
  { maxDurationMin: Infinity, low: 60, target: 80, high: 90, note: 'Nécessite des glucides multi-transportables et un intestin entraîné.' },
];

/** Plafond absolu d'absorption documenté, toutes tolérances confondues. */
const CARBOHYDRATE_MAX_G_PER_HOUR = 120;

/** Tolérance digestive déclarée par l'athlète : plafond appliqué à la cible. */
const GUT_TOLERANCE_CAPS = {
  low: 45,
  medium: 70,
  high: 90,
  trained: 110,
};

/** Intensité : modulation bornée de la cible glucidique. */
const INTENSITY_CARB_FACTORS = {
  low: 0.85,
  moderate: 1,
  moderate_high: 1.1,
  high: 1.15,
};

/**
 * Hydratation (Sawka 2007). Les bornes de sécurité priment toujours :
 * dépasser durablement 1 000 ml/h expose à l'hyponatrémie d'effort
 * (Hew-Butler 2015).
 */
const FLUID_DEFAULT_ML_PER_HOUR = { low: 400, target: 550, high: 750 };
const FLUID_MIN_ML_PER_HOUR = 300;
const FLUID_SAFETY_CAP_ML_PER_HOUR = 1000;

/** Facteurs environnementaux appliqués au besoin hydrique, bornés. */
const HEAT_STRESS_FLUID_FACTORS = {
  low: 0.85,
  moderate: 1,
  high: 1.2,
  extreme: 1.35,
};

/**
 * Sodium : concentration sudorale usuelle 300–1 500 mg/L, médiane ~800 mg/L
 * (Sawka 2007). Le sodium est calculé à partir du volume sudoral estimé, pas
 * du volume bu, afin de ne pas récompenser la surhydratation.
 */
const SWEAT_SODIUM_MG_PER_LITRE = {
  low: 400,
  normal: 800,
  salty: 1200,
};
const SODIUM_MIN_MG_PER_HOUR = 200;
const SODIUM_MAX_MG_PER_HOUR = 1500;

/** Avant l'effort (Burke 2011, ACSM 2016). */
const PRE_EXERCISE = {
  carbGPerKgByHoursBefore: [
    { maxHoursBefore: 1, low: 0.5, target: 1, high: 1 },
    { maxHoursBefore: 2, low: 1, target: 1.5, high: 2 },
    { maxHoursBefore: 4, low: 2, target: 2.5, high: 3 },
    { maxHoursBefore: Infinity, low: 3, target: 3.5, high: 4 },
  ],
  fluidMlPerKg: { low: 5, target: 6, high: 7 },
  sodiumMgPerKg: { low: 3, target: 5, high: 8 },
};

/** Après l'effort (ACSM 2016, Burke 2011). */
const RECOVERY = {
  carbGPerKgPerHour: { low: 0.8, target: 1, high: 1.2 },
  carbGPerKgRelaxed: { low: 0.5, target: 0.7, high: 0.9 },
  proteinGPerKg: { low: 0.25, target: 0.3, high: 0.4 },
  fluidMlPerKgLost: { low: 1250, target: 1400, high: 1500 },
  urgentRecoveryThresholdHours: 8,
};

/** Caféine : optionnelle, jamais proposée sans consentement explicite. */
const CAFFEINE_MG_PER_KG = { low: 3, target: 3, high: 6 };
const CAFFEINE_MAX_MG_PER_DAY = 400;

module.exports = {
  ALGORITHM_VERSION,
  KNOWLEDGE_VERSION,
  CARBOHYDRATE_BANDS,
  CARBOHYDRATE_MAX_G_PER_HOUR,
  GUT_TOLERANCE_CAPS,
  INTENSITY_CARB_FACTORS,
  FLUID_DEFAULT_ML_PER_HOUR,
  FLUID_MIN_ML_PER_HOUR,
  FLUID_SAFETY_CAP_ML_PER_HOUR,
  HEAT_STRESS_FLUID_FACTORS,
  SWEAT_SODIUM_MG_PER_LITRE,
  SODIUM_MIN_MG_PER_HOUR,
  SODIUM_MAX_MG_PER_HOUR,
  PRE_EXERCISE,
  RECOVERY,
  CAFFEINE_MG_PER_KG,
  CAFFEINE_MAX_MG_PER_DAY,
};
