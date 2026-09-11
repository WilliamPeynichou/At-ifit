const {
  computeDuringExercise,
  computeCarbohydratesPerHour,
  computeFluidPerHour,
  computeSodiumPerHour,
  selectCarbohydrateBand,
  buildTimeline,
} = require('../services/nutrition/duringExerciseCalculator');
const {
  FLUID_SAFETY_CAP_ML_PER_HOUR,
  SODIUM_MAX_MG_PER_HOUR,
  GUT_TOLERANCE_CAPS,
} = require('../services/nutrition/nutritionRules');

describe('duringExerciseCalculator — glucides', () => {
  test('aucun glucide requis sous 45 minutes', () => {
    const result = computeCarbohydratesPerHour({ durationMinutes: 40, intensityClass: 'moderate' });
    expect(result.perHour).toEqual({ low: 0, target: 0, high: 0 });
  });

  test('la cible augmente avec la durée', () => {
    const short = computeCarbohydratesPerHour({ durationMinutes: 90, intensityClass: 'moderate' });
    const medium = computeCarbohydratesPerHour({ durationMinutes: 150, intensityClass: 'moderate' });
    const long = computeCarbohydratesPerHour({ durationMinutes: 300, intensityClass: 'moderate' });

    expect(short.perHour.target).toBeLessThan(medium.perHour.target);
    expect(medium.perHour.target).toBeLessThan(long.perHour.target);
    expect(long.perHour.target).toBeLessThanOrEqual(90);
  });

  test('la tolérance digestive basse plafonne la cible et déclenche une alerte', () => {
    const result = computeCarbohydratesPerHour({
      durationMinutes: 300,
      intensityClass: 'high',
      gutTolerance: 'low',
    });

    expect(result.perHour.target).toBeLessThanOrEqual(GUT_TOLERANCE_CAPS.low);
    expect(result.warnings.join(' ')).toMatch(/tolérance digestive/i);
  });

  test('la tolérance ne peut jamais augmenter la cible au-delà du palier', () => {
    const trained = computeCarbohydratesPerHour({
      durationMinutes: 90,
      intensityClass: 'moderate',
      gutTolerance: 'trained',
    });
    // Palier 75–120 min : 40 g/h cible, la tolérance élevée ne doit pas l'inflater.
    expect(trained.perHour.target).toBe(40);
  });

  test('sélectionne le bon palier de durée', () => {
    expect(selectCarbohydrateBand(30).maxDurationMin).toBe(45);
    expect(selectCarbohydrateBand(200).maxDurationMin).toBe(Infinity);
  });
});

describe('duringExerciseCalculator — hydratation', () => {
  test('le taux de sudation mesuré prime sur l’estimation', () => {
    const result = computeFluidPerHour({ heatStress: 'low', measuredSweatRate: 900 });
    expect(result.perHour.target).toBe(720);
    expect(result.assumptions.join(' ')).toMatch(/mesuré/i);
  });

  test('le plafond de sécurité anti-hyponatrémie est appliqué', () => {
    const result = computeFluidPerHour({ heatStress: 'extreme', measuredSweatRate: 2500 });
    expect(result.perHour.target).toBeLessThanOrEqual(FLUID_SAFETY_CAP_ML_PER_HOUR);
    expect(result.warnings.join(' ')).toMatch(/hyponatrémie/i);
  });

  test('la chaleur augmente le besoin hydrique sans donnée de sudation', () => {
    const mild = computeFluidPerHour({ heatStress: 'low' });
    const hot = computeFluidPerHour({ heatStress: 'high' });
    expect(hot.perHour.target).toBeGreaterThan(mild.perHour.target);
  });
});

describe('duringExerciseCalculator — sodium', () => {
  test('le sodium suit la concentration sudorale déclarée', () => {
    const normal = computeSodiumPerHour({ measuredSweatRate: 1000, sweatSodiumProfile: 'normal' });
    const salty = computeSodiumPerHour({ measuredSweatRate: 1000, sweatSodiumProfile: 'salty' });

    expect(normal.perHour.target).toBe(800);
    expect(salty.perHour.target).toBe(1200);
  });

  test('le sodium reste borné même avec une sudation extrême', () => {
    const result = computeSodiumPerHour({ measuredSweatRate: 3000, sweatSodiumProfile: 'salty' });
    expect(result.perHour.target).toBeLessThanOrEqual(SODIUM_MAX_MG_PER_HOUR);
  });
});

describe('duringExerciseCalculator — stratégie complète', () => {
  const baseInput = {
    durationMinutes: 240,
    durationHighMinutes: 300,
    intensityClass: 'moderate',
    heatStress: 'high',
    sweatRateMlPerHour: { low: 600, target: 800, high: 1000 },
    nutritionProfile: { gutTolerance: 'medium' },
  };

  test('les totaux sont calculés sur la durée cible, pas sur la durée haute', () => {
    const result = computeDuringExercise(baseInput);
    const expectedCarbs = result.carbohydratesGPerHour.target * 4;
    expect(result.carbohydratesTotalG.target).toBe(expectedCarbs);
  });

  test('la réserve à emporter couvre le scénario long', () => {
    const result = computeDuringExercise(baseInput);
    expect(result.carryReserve.basedOnDurationMinutes).toBe(300);
    expect(result.carryReserve.carbohydratesG).toBeGreaterThan(result.carbohydratesTotalG.target);
  });

  test('la chronologie respecte l’intervalle de ravitaillement', () => {
    const result = computeDuringExercise(baseInput);
    expect(result.timeline.length).toBeGreaterThan(0);
    expect(result.timeline[0].atMinute).toBe(20);
    expect(result.timeline.every(step => step.atMinute < baseInput.durationMinutes)).toBe(true);
  });

  test('un effort court ne génère ni glucides ni chronologie', () => {
    const result = computeDuringExercise({ ...baseInput, durationMinutes: 35, durationHighMinutes: 40 });
    expect(result.carbohydratesTotalG.target).toBe(0);
    expect(result.feedingIntervalMinutes).toBeNull();
  });

  test('les plages restent ordonnées low <= target <= high', () => {
    const result = computeDuringExercise(baseInput);
    for (const key of ['carbohydratesGPerHour', 'fluidMlPerHour', 'sodiumMgPerHour']) {
      expect(result[key].low).toBeLessThanOrEqual(result[key].target);
      expect(result[key].target).toBeLessThanOrEqual(result[key].high);
    }
  });
});

describe('buildTimeline', () => {
  test('ne dépasse jamais la fin de l’effort', () => {
    const timeline = buildTimeline({
      durationMinutes: 60,
      carbPerHour: { target: 60 },
      fluidPerHour: { target: 600 },
      sodiumPerHour: { target: 600 },
    });
    expect(timeline.map(s => s.atMinute)).toEqual([20, 40]);
  });
});
