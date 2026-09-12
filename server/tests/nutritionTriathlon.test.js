const {
  combineTriathlonEfforts,
  highestHeatStress,
} = require('../services/effortPrediction/triathlonPredictor');
const { validatePreviewInput } = require('../routes/nutrition');

function effort({ sport, duration, energy, sweat, confidence, heatStress, comparables }) {
  return {
    sport,
    estimatedDurationMinutes: {
      low: duration - 5,
      target: duration,
      high: duration + 10,
    },
    estimatedEnergyKcal: {
      low: energy - 50,
      target: energy,
      high: energy + 100,
    },
    estimatedSweatRateMlPerHour: {
      low: sweat - 100,
      target: sweat,
      high: sweat + 100,
    },
    confidence,
    heatStress,
    comparableActivitiesCount: comparables,
    comparableActivities: [],
    assumptions: [`Hypothèse ${sport}`],
  };
}

const swimming = effort({
  sport: 'swimming', duration: 30, energy: 300, sweat: 300, confidence: 0.4, heatStress: 'low', comparables: 2,
});
const cycling = effort({
  sport: 'cycling', duration: 90, energy: 900, sweat: 700, confidence: 0.8, heatStress: 'high', comparables: 6,
});
const running = effort({
  sport: 'running', duration: 50, energy: 600, sweat: 800, confidence: 0.6, heatStress: 'moderate', comparables: 4,
});

describe('triathlonPredictor', () => {
  test('additionne les trois disciplines et les transitions', () => {
    const result = combineTriathlonEfforts({ swimming, cycling, running, transitionMinutes: 10 });

    expect(result.sport).toBe('triathlon');
    expect(result.estimatedDurationMinutes).toEqual({ low: 165, target: 180, high: 210 });
    expect(result.estimatedEnergyKcal).toEqual({ low: 1650, target: 1800, high: 2100 });
    expect(result.comparableActivitiesCount).toBe(12);
    expect(result.legs).toEqual({ swimming, cycling, running });
    expect(result.transitionMinutes).toBe(10);
  });

  test('pondère la sudation et la confiance par la durée des disciplines', () => {
    const result = combineTriathlonEfforts({ swimming, cycling, running, transitionMinutes: 10 });

    expect(result.estimatedSweatRateMlPerHour.target).toBe(659);
    expect(result.confidence).toBe(0.67);
  });

  test('retient le stress thermique le plus élevé', () => {
    expect(highestHeatStress([swimming, cycling, running])).toBe('high');
  });
});

describe('validation nutrition triathlon', () => {
  test('accepte et agrège un triathlon valide', () => {
    const result = validatePreviewInput({
      sport: 'triathlon',
      swimmingDistanceKm: 1.5,
      cyclingDistanceKm: 40,
      cyclingElevationGainM: 500,
      runningDistanceKm: 10,
      runningElevationGainM: 100,
      transitionMinutes: 10,
    });

    expect(result.errors).toEqual([]);
    expect(result.distanceKm).toBe(51.5);
    expect(result.elevationGainM).toBe(600);
    expect(result.triathlon).toMatchObject({
      swimmingDistanceKm: 1.5,
      cyclingDistanceKm: 40,
      runningDistanceKm: 10,
      transitionMinutes: 10,
    });
  });

  test('refuse un segment manquant ou hors limites', () => {
    const result = validatePreviewInput({
      sport: 'triathlon',
      swimmingDistanceKm: 0,
      cyclingDistanceKm: 40,
      runningDistanceKm: 300,
      transitionMinutes: 10,
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/swimmingDistanceKm/),
      expect.stringMatching(/runningDistanceKm/),
    ]));
  });
});
