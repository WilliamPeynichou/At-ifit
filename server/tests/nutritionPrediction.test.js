const {
  seasonalEstimate,
  FORECAST_HORIZON_DAYS,
} = require('../services/providers/weatherProvider');
const {
  similarity,
  classifyIntensity,
  heatStressFrom,
  estimateSweatRate,
  weightedQuantile,
  computeConfidence,
} = require('../services/effortPrediction/cyclingPredictor');

describe('weatherProvider', () => {
  const north = { latitude: 45, label: 'Annecy, France', timeZone: 'Europe/Paris' };
  const south = { latitude: -33, label: 'Sydney, Australia', timeZone: 'Australia/Sydney' };

  test('inverse les saisons selon l’hémisphère', () => {
    const northJuly = seasonalEstimate(north, '2027-07-15T08:00:00Z');
    const southJuly = seasonalEstimate(south, '2027-07-15T08:00:00Z');

    expect(northJuly.season).toBe('summer');
    expect(southJuly.season).toBe('winter');
    expect(northJuly.temperatureC).toBeGreaterThan(southJuly.temperatureC);
  });

  test('identifie clairement une estimation saisonnière basse confiance', () => {
    const result = seasonalEstimate(north, '2028-01-15T08:00:00Z');
    expect(result).toMatchObject({
      type: 'seasonal_estimate',
      confidence: 'low',
      provider: 'atifit-seasonal-baseline',
    });
    expect(result.note).toMatch(/hors horizon/i);
    expect(FORECAST_HORIZON_DAYS).toBe(16);
  });
});

describe('cyclingPredictor helpers', () => {
  test('favorise une activité proche en distance et dénivelé', () => {
    const target = { distanceKm: 100, elevationPerKm: 10 };
    const close = similarity({ distance: 95000, totalElevationGain: 950 }, target);
    const far = similarity({ distance: 30000, totalElevationGain: 0 }, target);
    expect(close).toBeGreaterThan(far);
  });

  test('classe une sortie rapide comme intensité modérée haute', () => {
    expect(classifyIntensity({ distanceKm: 100, elevationPerKm: 5, durationMinutes: 180 })).toBe('moderate_high');
    expect(classifyIntensity({ distanceKm: 80, elevationPerKm: 5, durationMinutes: 300 })).toBe('moderate');
  });

  test('déduit le stress thermique de température et humidité', () => {
    expect(heatStressFrom({ temperatureC: 32, humidityPercent: 70 })).toBe('extreme');
    expect(heatStressFrom({ temperatureC: 5, humidityPercent: 70 })).toBe('low');
    expect(heatStressFrom(null)).toBe('moderate');
  });

  test('augmente la sudation estimée avec la chaleur', () => {
    const cool = estimateSweatRate({ intensityClass: 'moderate', heatStress: 'low', weightKg: 70 });
    const hot = estimateSweatRate({ intensityClass: 'moderate', heatStress: 'extreme', weightKg: 70 });
    expect(hot.target).toBeGreaterThan(cool.target);
  });

  test('calcule un quantile pondéré', () => {
    const samples = [
      { value: 20, weight: 1 },
      { value: 25, weight: 5 },
      { value: 30, weight: 1 },
    ];
    expect(weightedQuantile(samples, 0.5)).toBe(25);
  });

  test('la météo et les comparables améliorent la confiance', () => {
    const generic = computeConfidence({ modelType: 'generic_formula', comparableCount: 0, coverage: 0, hasWeather: false });
    const personal = computeConfidence({ modelType: 'personal_weighted_baseline', comparableCount: 12, coverage: 1, hasWeather: true });
    expect(personal).toBeGreaterThan(generic);
  });
});
