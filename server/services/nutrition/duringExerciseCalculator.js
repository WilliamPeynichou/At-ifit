const {
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
} = require('./nutritionRules');
const { clamp, round, roundRange, scaleRange, clampRange } = require('./rangeUtils');

const FEEDING_INTERVAL_MIN = 20;

function selectCarbohydrateBand(durationMinutes) {
  return CARBOHYDRATE_BANDS.find(band => durationMinutes <= band.maxDurationMin)
    || CARBOHYDRATE_BANDS[CARBOHYDRATE_BANDS.length - 1];
}

/**
 * Glucides par heure : palier de durée, modulé par l'intensité puis plafonné
 * par la tolérance digestive déclarée. La tolérance ne peut qu'abaisser la
 * cible : on ne pousse jamais un athlète au-delà de ce qu'il a entraîné.
 */
function computeCarbohydratesPerHour({ durationMinutes, intensityClass, gutTolerance }) {
  const band = selectCarbohydrateBand(durationMinutes);
  const assumptions = [];
  const warnings = [];

  if (band.target === 0) {
    return {
      perHour: { low: 0, target: 0, high: 0 },
      assumptions: [band.note],
      warnings,
      band,
    };
  }

  const intensityFactor = INTENSITY_CARB_FACTORS[intensityClass] ?? INTENSITY_CARB_FACTORS.moderate;
  if (!INTENSITY_CARB_FACTORS[intensityClass]) {
    assumptions.push('Intensité inconnue : palier modéré retenu par défaut.');
  }

  const toleranceCap = GUT_TOLERANCE_CAPS[gutTolerance] ?? GUT_TOLERANCE_CAPS.medium;
  if (!GUT_TOLERANCE_CAPS[gutTolerance]) {
    assumptions.push('Tolérance digestive non renseignée : plafond intermédiaire appliqué.');
  }

  const scaled = scaleRange({ low: band.low, target: band.target, high: band.high }, intensityFactor);
  const capped = clampRange(scaled, 0, Math.min(toleranceCap, CARBOHYDRATE_MAX_G_PER_HOUR));

  if (scaled.target > toleranceCap) {
    warnings.push(
      `Cible théorique ${round(scaled.target)} g/h ramenée à ${round(capped.target)} g/h par ta tolérance digestive. `
      + 'Augmente progressivement à l’entraînement avant de viser plus haut.'
    );
  }
  if (capped.target > 60) {
    assumptions.push('Au-delà de 60 g/h, utilise des glucides multi-transportables (glucose + fructose).');
  }

  return { perHour: roundRange(capped), assumptions: [band.note, ...assumptions], warnings, band };
}

/**
 * Hydratation : le taux de sudation mesuré prime toujours sur l'estimation
 * environnementale. Le plafond de sécurité anti-hyponatrémie est appliqué en
 * dernier et ne peut jamais être dépassé.
 */
function computeFluidPerHour({ heatStress, sweatRateMlPerHour, measuredSweatRate }) {
  const assumptions = [];
  const warnings = [];
  let base;

  if (measuredSweatRate && Number.isFinite(Number(measuredSweatRate))) {
    const measured = Number(measuredSweatRate);
    base = { low: measured * 0.7, target: measured * 0.8, high: measured * 0.9 };
    assumptions.push(`Basé sur ton taux de sudation mesuré (${round(measured)} ml/h), remplacé à 70–90 %.`);
  } else if (sweatRateMlPerHour && Number.isFinite(Number(sweatRateMlPerHour.target))) {
    base = {
      low: sweatRateMlPerHour.low * 0.7,
      target: sweatRateMlPerHour.target * 0.8,
      high: sweatRateMlPerHour.high * 0.9,
    };
    assumptions.push('Basé sur une sudation estimée depuis l’intensité et la météo, remplacée à 70–90 %.');
  } else {
    const factor = HEAT_STRESS_FLUID_FACTORS[heatStress] ?? HEAT_STRESS_FLUID_FACTORS.moderate;
    base = scaleRange(FLUID_DEFAULT_ML_PER_HOUR, factor);
    assumptions.push('Aucune donnée de sudation : fourchette de population ajustée aux conditions.');
  }

  const bounded = clampRange(base, FLUID_MIN_ML_PER_HOUR, FLUID_SAFETY_CAP_ML_PER_HOUR);

  if (base.target > FLUID_SAFETY_CAP_ML_PER_HOUR) {
    warnings.push(
      `Besoin théorique supérieur à ${FLUID_SAFETY_CAP_ML_PER_HOUR} ml/h : la recommandation est plafonnée pour `
      + 'limiter le risque d’hyponatrémie. Compense par un apport sodé plus élevé, pas par plus d’eau.'
    );
  }
  if (heatStress === 'extreme') {
    warnings.push('Conditions très chaudes : bois à la soif, surveille les signes de coup de chaleur et adapte l’allure.');
  }

  return { perHour: roundRange(bounded, -1), assumptions, warnings };
}

/**
 * Sodium calculé sur le volume de sueur estimé et non sur le volume bu :
 * l'objectif est de compenser les pertes, pas de suivre la boisson.
 */
function computeSodiumPerHour({ sweatRateMlPerHour, measuredSweatRate, sweatSodiumProfile, heatStress }) {
  const assumptions = [];
  const concentrationKey = SWEAT_SODIUM_MG_PER_LITRE[sweatSodiumProfile] ? sweatSodiumProfile : 'normal';
  const concentration = SWEAT_SODIUM_MG_PER_LITRE[concentrationKey];

  if (concentrationKey === 'normal' && !SWEAT_SODIUM_MG_PER_LITRE[sweatSodiumProfile]) {
    assumptions.push('Concentration sudorale non mesurée : valeur médiane de population (800 mg/L) utilisée.');
  } else if (concentrationKey === 'salty') {
    assumptions.push('Profil « sueur salée » déclaré : concentration haute (1 200 mg/L) retenue.');
  }

  let sweatLitresPerHour;
  if (measuredSweatRate && Number.isFinite(Number(measuredSweatRate))) {
    const measured = Number(measuredSweatRate) / 1000;
    sweatLitresPerHour = { low: measured * 0.9, target: measured, high: measured * 1.1 };
  } else if (sweatRateMlPerHour && Number.isFinite(Number(sweatRateMlPerHour.target))) {
    sweatLitresPerHour = {
      low: sweatRateMlPerHour.low / 1000,
      target: sweatRateMlPerHour.target / 1000,
      high: sweatRateMlPerHour.high / 1000,
    };
  } else {
    const factor = HEAT_STRESS_FLUID_FACTORS[heatStress] ?? HEAT_STRESS_FLUID_FACTORS.moderate;
    const estimated = scaleRange(FLUID_DEFAULT_ML_PER_HOUR, factor);
    sweatLitresPerHour = { low: estimated.low / 1000, target: estimated.target / 1000, high: estimated.high / 1000 };
    assumptions.push('Pertes sodées déduites d’une sudation estimée : marge d’incertitude importante.');
  }

  const raw = scaleRange(sweatLitresPerHour, concentration);
  const bounded = clampRange(raw, SODIUM_MIN_MG_PER_HOUR, SODIUM_MAX_MG_PER_HOUR);

  return { perHour: roundRange(bounded, -1), assumptions, concentrationMgPerLitre: concentration };
}

/** Totaux calculés sur la durée cible : la borne haute ne sert qu'à la réserve. */
function toTotals(perHour, durationMinutes, digits = 0) {
  const hours = durationMinutes / 60;
  return roundRange(scaleRange(perHour, hours), digits);
}

function buildTimeline({ durationMinutes, carbPerHour, fluidPerHour, sodiumPerHour }) {
  if (durationMinutes < FEEDING_INTERVAL_MIN) return [];

  const steps = Math.floor(durationMinutes / FEEDING_INTERVAL_MIN);
  const fraction = FEEDING_INTERVAL_MIN / 60;
  const timeline = [];

  for (let step = 1; step <= steps; step += 1) {
    const minute = step * FEEDING_INTERVAL_MIN;
    if (minute >= durationMinutes) break;
    timeline.push({
      atMinute: minute,
      carbohydratesG: round(carbPerHour.target * fraction),
      fluidMl: round(fluidPerHour.target * fraction, -1),
      sodiumMg: round(sodiumPerHour.target * fraction, -1),
    });
  }

  return timeline;
}

/**
 * Stratégie pendant l'effort — sortie principale de la card.
 */
function computeDuringExercise({
  durationMinutes,
  durationHighMinutes,
  intensityClass,
  heatStress,
  sweatRateMlPerHour,
  nutritionProfile = {},
}) {
  const carb = computeCarbohydratesPerHour({
    durationMinutes,
    intensityClass,
    gutTolerance: nutritionProfile.gutTolerance,
  });
  const fluid = computeFluidPerHour({
    heatStress,
    sweatRateMlPerHour,
    measuredSweatRate: nutritionProfile.measuredSweatRateMlPerHour,
  });
  const sodium = computeSodiumPerHour({
    sweatRateMlPerHour,
    measuredSweatRate: nutritionProfile.measuredSweatRateMlPerHour,
    sweatSodiumProfile: nutritionProfile.sweatSodiumProfile,
    heatStress,
  });

  const reserveMinutes = Math.max(durationMinutes, durationHighMinutes || durationMinutes);

  return {
    carbohydratesGPerHour: carb.perHour,
    carbohydratesTotalG: toTotals(carb.perHour, durationMinutes),
    fluidMlPerHour: fluid.perHour,
    fluidTotalMl: toTotals(fluid.perHour, durationMinutes, -1),
    sodiumMgPerHour: sodium.perHour,
    sodiumTotalMg: toTotals(sodium.perHour, durationMinutes, -1),
    feedingIntervalMinutes: carb.perHour.target > 0 ? FEEDING_INTERVAL_MIN : null,
    timeline: buildTimeline({
      durationMinutes,
      carbPerHour: carb.perHour,
      fluidPerHour: fluid.perHour,
      sodiumPerHour: sodium.perHour,
    }),
    // Réserve dimensionnée sur le scénario long : à emporter, pas à consommer.
    carryReserve: {
      basedOnDurationMinutes: reserveMinutes,
      carbohydratesG: round(carb.perHour.target * (reserveMinutes / 60)),
      fluidMl: round(fluid.perHour.target * (reserveMinutes / 60), -1),
      sodiumMg: round(sodium.perHour.target * (reserveMinutes / 60), -1),
      note: 'Quantités à emporter pour couvrir le scénario long. Ne force pas la consommation : les cibles horaires priment.',
    },
    sweatSodiumConcentrationMgPerLitre: sodium.concentrationMgPerLitre,
    assumptions: [...carb.assumptions, ...fluid.assumptions, ...sodium.assumptions],
    warnings: [...carb.warnings, ...fluid.warnings],
  };
}

module.exports = {
  computeDuringExercise,
  computeCarbohydratesPerHour,
  computeFluidPerHour,
  computeSodiumPerHour,
  selectCarbohydrateBand,
  buildTimeline,
  FEEDING_INTERVAL_MIN,
};
