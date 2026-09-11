const { ALGORITHM_VERSION, KNOWLEDGE_VERSION } = require('./nutritionRules');
const { computeDuringExercise } = require('./duringExerciseCalculator');
const { computePreExercise } = require('./preExerciseCalculator');
const { computeRecovery } = require('./recoveryCalculator');
const { evaluateSafety } = require('./safetyRules');

const DISCLAIMER = 'Recommandations générales de nutrition sportive, non médicales. '
  + 'En cas de pathologie, de traitement ou de doute, consulte un médecin ou un diététicien du sport.';

/**
 * Orchestrateur déterministe : seule source de vérité des quantités.
 * Aucune valeur ne provient d'un LLM. L'IA n'intervient qu'en amont pour
 * structurer l'objectif libre, et en aval pour expliquer le résultat.
 */
function generateNutritionAnalysis({
  athlete = {},
  healthPrecautions = [],
  predictedEffort,
  weather = null,
  nutritionProfile = {},
  objective = null,
}) {
  if (!predictedEffort?.estimatedDurationMinutes?.target) {
    throw new Error('predictedEffort.estimatedDurationMinutes.target is required');
  }

  const safety = evaluateSafety({ athlete, healthPrecautions });
  const generatedAt = new Date().toISOString();

  if (!safety.allowed) {
    return {
      available: false,
      blockers: safety.blockers,
      disclaimer: DISCLAIMER,
      algorithmVersion: ALGORITHM_VERSION,
      knowledgeVersion: KNOWLEDGE_VERSION,
      generatedAt,
    };
  }

  const durationMinutes = predictedEffort.estimatedDurationMinutes.target;
  const durationHighMinutes = predictedEffort.estimatedDurationMinutes.high;

  const during = computeDuringExercise({
    durationMinutes,
    durationHighMinutes,
    intensityClass: predictedEffort.intensityClass,
    heatStress: predictedEffort.heatStress,
    sweatRateMlPerHour: predictedEffort.estimatedSweatRateMlPerHour,
    nutritionProfile,
  });

  const before = computePreExercise({
    weightKg: athlete.weightKg,
    hoursBeforeStart: objective?.hoursBeforeStart,
    durationMinutes,
    nutritionProfile,
  });

  // Pertes estimées = sudation × durée, moins ce qui est bu pendant l'effort.
  const sweatTotalMl = predictedEffort.estimatedSweatRateMlPerHour?.target
    ? predictedEffort.estimatedSweatRateMlPerHour.target * (durationMinutes / 60)
    : null;
  const fluidLossMl = sweatTotalMl !== null
    ? Math.max(0, sweatTotalMl - (during.fluidTotalMl?.target || 0))
    : null;

  const after = computeRecovery({
    weightKg: athlete.weightKg,
    durationMinutes,
    fluidLossMl,
    hoursUntilNextSession: objective?.hoursUntilNextSession,
    nutritionProfile,
  });

  const missingData = [];
  if (!athlete.weightKg) missingData.push('poids');
  if (!nutritionProfile.gutTolerance) missingData.push('tolérance digestive');
  if (!nutritionProfile.measuredSweatRateMlPerHour) missingData.push('taux de sudation mesuré');
  if (!weather) missingData.push('météo du lieu et de la date');

  const assumptions = [
    ...(predictedEffort.assumptions || []),
    ...during.assumptions,
    ...(before.assumptions || []),
    ...(after.assumptions || []),
  ];

  const warnings = [
    ...during.warnings,
    ...(before.warnings || []),
    ...(after.warnings || []),
    ...safety.warnings,
  ];

  return {
    available: true,
    before,
    during,
    after,
    effort: predictedEffort,
    weather,
    confidence: {
      score: predictedEffort.confidence ?? null,
      label: confidenceLabel(predictedEffort.confidence),
      basis: 'Qualité et récence de tes activités comparables, complétude des capteurs et disponibilité météo.',
    },
    assumptions: [...new Set(assumptions)],
    missingData,
    warnings: [...new Set(warnings)],
    disclaimer: DISCLAIMER,
    algorithmVersion: ALGORITHM_VERSION,
    knowledgeVersion: KNOWLEDGE_VERSION,
    generatedAt,
  };
}

function confidenceLabel(score) {
  // Attention : Number(null) vaut 0 et passerait le test de finitude.
  // Une confiance absente doit rester « inconnue », jamais « faible ».
  if (score === null || score === undefined || score === '') return 'inconnue';
  const value = Number(score);
  if (!Number.isFinite(value)) return 'inconnue';
  if (value < 0.45) return 'faible';
  if (value < 0.75) return 'modérée';
  return 'élevée';
}

module.exports = { generateNutritionAnalysis, confidenceLabel, DISCLAIMER };
