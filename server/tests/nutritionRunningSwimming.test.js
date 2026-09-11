const { runSimilarity, genericPaceMinPerKm } = require('../services/effortPrediction/runningPredictor');
const { swimSimilarity } = require('../services/effortPrediction/swimmingPredictor');

describe('runningPredictor helpers', () => {
  test('favorise une course proche en distance et dénivelé', () => {
    const target = { distanceKm: 21, elevationPerKm: 5 };
    const close = runSimilarity({ distance: 20000, totalElevationGain: 100 }, target);
    const far = runSimilarity({ distance: 5000, totalElevationGain: 0 }, target);
    expect(close).toBeGreaterThan(far);
  });

  test('ignore les distances non significatives', () => {
    expect(runSimilarity({ distance: 500, totalElevationGain: 0 }, { distanceKm: 10, elevationPerKm: 0 })).toBe(0);
  });

  test('l’allure générique ralentit avec le dénivelé', () => {
    const flat = genericPaceMinPerKm(0);
    const hilly = genericPaceMinPerKm(50);
    expect(hilly).toBeGreaterThan(flat);
  });
});

describe('swimmingPredictor helpers', () => {
  test('la similarité vaut 1 pour une distance identique', () => {
    expect(swimSimilarity({ distance: 3800 }, 3.8)).toBeCloseTo(1, 5);
  });

  test('la similarité chute pour une distance très différente', () => {
    expect(swimSimilarity({ distance: 500 }, 3.8)).toBeLessThan(0.2);
  });

  test('ignore les distances quasi nulles', () => {
    expect(swimSimilarity({ distance: 5 }, 3.8)).toBe(0);
  });
});
