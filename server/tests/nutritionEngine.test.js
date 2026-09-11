const { generateNutritionAnalysis, confidenceLabel } = require('../services/nutrition/nutritionEngine');
const { evaluateSafety, isProductSafe } = require('../services/nutrition/safetyRules');

const predictedEffort = {
  sport: 'cycling',
  estimatedDurationMinutes: { low: 200, target: 240, high: 290 },
  intensityClass: 'moderate',
  estimatedEnergyKcal: { low: 1900, target: 2400, high: 2900 },
  heatStress: 'moderate',
  estimatedSweatRateMlPerHour: { low: 500, target: 700, high: 900 },
  confidence: 0.62,
  modelType: 'personal_weighted_baseline',
  comparableActivitiesCount: 9,
  assumptions: ['Durée estimée depuis 9 sorties comparables.'],
};

const athlete = { age: 34, gender: 'male', weightKg: 72 };

describe('nutritionEngine', () => {
  test('produit les trois phases et les métadonnées de version', () => {
    const result = generateNutritionAnalysis({ athlete, predictedEffort });

    expect(result.available).toBe(true);
    expect(result.during.carbohydratesGPerHour.target).toBeGreaterThan(0);
    expect(result.before.available).toBe(true);
    expect(result.after.available).toBe(true);
    expect(result.algorithmVersion).toBe('1.0.0');
    expect(result.knowledgeVersion).toBe('1.0.0');
    expect(result.disclaimer).toMatch(/non médicales/i);
  });

  test('bloque un athlète mineur sans produire de quantités', () => {
    const result = generateNutritionAnalysis({
      athlete: { ...athlete, age: 16 },
      predictedEffort,
    });

    expect(result.available).toBe(false);
    expect(result.blockers[0].code).toBe('minor_not_supported');
    expect(result.during).toBeUndefined();
  });

  test('bloque une précaution santé à risque', () => {
    const result = generateNutritionAnalysis({
      athlete,
      healthPrecautions: ['diabetes'],
      predictedEffort,
    });

    expect(result.available).toBe(false);
    expect(result.blockers[0].code).toBe('diabetes');
  });

  test('bloque lorsque l’âge n’est pas renseigné', () => {
    const result = generateNutritionAnalysis({
      athlete: { weightKg: 70, age: null },
      predictedEffort,
    });

    expect(result.available).toBe(false);
    expect(result.blockers[0].code).toBe('age_required');
  });

  test('signale les données manquantes sans échouer', () => {
    const result = generateNutritionAnalysis({
      athlete: { age: 30 },
      predictedEffort,
    });

    expect(result.available).toBe(true);
    expect(result.missingData).toContain('poids');
    expect(result.before.available).toBe(false);
  });

  test('exige une durée cible', () => {
    expect(() => generateNutritionAnalysis({ athlete, predictedEffort: {} })).toThrow(/estimatedDurationMinutes/);
  });

  test('la récupération devient urgente si la séance suivante est proche', () => {
    const urgent = generateNutritionAnalysis({
      athlete,
      predictedEffort,
      objective: { hoursUntilNextSession: 5 },
    });
    const relaxed = generateNutritionAnalysis({ athlete, predictedEffort });

    expect(urgent.after.urgency).toBe('high');
    expect(relaxed.after.urgency).toBe('standard');
    expect(urgent.after.carbohydratesG.target).toBeGreaterThan(relaxed.after.carbohydratesG.target);
  });
});

describe('confidenceLabel', () => {
  test('mappe le score sur un libellé borné', () => {
    expect(confidenceLabel(0.2)).toBe('faible');
    expect(confidenceLabel(0.6)).toBe('modérée');
    expect(confidenceLabel(0.9)).toBe('élevée');
    expect(confidenceLabel(null)).toBe('inconnue');
  });
});

describe('safetyRules', () => {
  test('autorise un adulte sans précaution', () => {
    expect(evaluateSafety({ athlete: { age: 30 } }).allowed).toBe(true);
  });

  test('refuse un produit dont les allergènes sont inconnus', () => {
    expect(isProductSafe({ name: 'Gel' }, ['gluten'])).toBe(false);
    expect(isProductSafe({ name: 'Gel', allergens: ['soja'] }, ['gluten'])).toBe(true);
    expect(isProductSafe({ name: 'Barre', allergens: ['gluten'] }, ['gluten'])).toBe(false);
  });

  test('sans allergène déclaré, aucun filtrage n’est appliqué', () => {
    expect(isProductSafe({ name: 'Gel' }, [])).toBe(true);
  });
});
