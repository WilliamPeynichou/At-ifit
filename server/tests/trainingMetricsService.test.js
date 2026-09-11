const {
  ATL_DECAY,
  CTL_DECAY,
  activityLoad,
  computePerformanceManagementChart,
} = require('../services/trainingMetricsService');

describe('trainingMetricsService', () => {
  test('utilise les constantes de décroissance continue du PMC', () => {
    expect(ATL_DECAY).toBeCloseTo(Math.exp(-1 / 7), 10);
    expect(CTL_DECAY).toBeCloseTo(Math.exp(-1 / 42), 10);
    expect(ATL_DECAY).toBeLessThan(CTL_DECAY);
  });

  test('calcule le fallback TRIMP de Banister et préfère sufferScore', () => {
    expect(activityLoad({ sufferScore: 72 }, 180, 60)).toBe(72);

    const trimp = activityLoad({
      sufferScore: null,
      averageHeartrate: 150,
      movingTime: 3600,
    }, 180, 60);
    expect(trimp).toBe(122);
  });

  test('borne la réserve cardiaque pour neutraliser les FC aberrantes', () => {
    const atMax = activityLoad({ averageHeartrate: 180, movingTime: 3600 }, 180, 60);
    const aboveMax = activityLoad({ averageHeartrate: 250, movingTime: 3600 }, 180, 60);
    expect(aboveMax).toBe(atMax);
    expect(activityLoad({ averageHeartrate: 50, movingTime: 3600 }, 180, 60)).toBe(0);
  });

  test('produit ATL, CTL et TSB avec une définition unique', () => {
    const curve = computePerformanceManagementChart([
      { startDate: '2026-01-01T10:00:00Z', sufferScore: 100 },
    ], {
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-02T23:59:59Z',
      hrMax: 180,
      hrRest: 60,
    });

    expect(curve).toEqual([
      { date: '2026-01-01', load: 100, atl: 13.3, ctl: 2.4, tsb: -11 },
      { date: '2026-01-02', load: 0, atl: 11.5, ctl: 2.3, tsb: -9.2 },
    ]);
  });

  test('agrège plusieurs activités du même jour', () => {
    const curve = computePerformanceManagementChart([
      { startDate: '2026-01-01T08:00:00Z', sufferScore: 30 },
      { startDate: '2026-01-01T18:00:00Z', sufferScore: 70 },
    ], {
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      hrMax: 180,
      hrRest: 60,
    });

    expect(curve).toHaveLength(1);
    expect(curve[0].load).toBe(100);
  });
});
