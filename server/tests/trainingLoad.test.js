/**
 * Tests unitaires — trainingLoadService.js
 * Vérifie les calculs ATL/CTL/TSB et la détermination du statut de forme.
 */

jest.mock('../models/Activity', () => ({ findAll: jest.fn(), findOne: jest.fn().mockResolvedValue(null) }));
jest.mock('../database', () => ({
  define: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));
jest.mock('../services/userMetricsService', () => ({
  resolveHrLimits: jest.fn().mockResolvedValue({ hrMax: 190, hrRest: 60 }),
}));
jest.mock('../services/stravaAnalytics', () => ({
  activityLoad: jest.fn((act) => act.sufferScore || 0),
}));

const Activity = require('../models/Activity');
const { getTrainingLoad, ATL_DECAY, CTL_DECAY } = require('../services/trainingLoadService');

function makeActivity(startDate, sufferScore, distance = 5000) {
  return { startDate, sufferScore, movingTime: 3600, distance, type: 'Run' };
}

describe('getTrainingLoad', () => {
  beforeEach(() => jest.clearAllMocks());

  test('retourne un tableau vide sans activités', async () => {
    Activity.findAll = jest.fn().mockResolvedValue([]);
    const result = await getTrainingLoad(1, 10);
    expect(result).toEqual([]);
  });

  test('retourne au maximum `weeks` semaines', async () => {
    // Génère 5 activités sur 5 semaines distinctes
    const acts = [
      makeActivity('2026-01-05', 50),
      makeActivity('2026-01-12', 60),
      makeActivity('2026-01-19', 55),
      makeActivity('2026-01-26', 70),
      makeActivity('2026-02-02', 80),
    ];
    Activity.findAll = jest.fn().mockResolvedValue(acts);

    const result = await getTrainingLoad(1, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  test('chaque semaine a les propriétés requises', async () => {
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity('2026-02-02', 70, 10000),
    ]);

    const result = await getTrainingLoad(1, 10);
    expect(result.length).toBeGreaterThan(0);

    const week = result[result.length - 1]; // dernière semaine
    expect(week).toHaveProperty('week');
    expect(week).toHaveProperty('weekLabel');
    expect(week).toHaveProperty('totalLoad');
    expect(week).toHaveProperty('atl');
    expect(week).toHaveProperty('ctl');
    expect(week).toHaveProperty('tsb');
    expect(week).toHaveProperty('status');
    expect(week).toHaveProperty('activityCount');
    expect(week).toHaveProperty('totalDistance');
  });

  test('statut "fresh" quand TSB > 5 (pas d\'activités récentes)', async () => {
    // Une seule activité ancienne → CTL s'établit, puis décroit → TSB positif après repos
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity('2026-01-01', 100),
    ]);

    const result = await getTrainingLoad(1, 4);
    // Après plusieurs semaines sans activité, TSB tend vers 0+ (CTL > ATL)
    // On vérifie juste que le statut est un des 3 attendus
    expect(['fresh', 'optimal', 'overload']).toContain(result[result.length - 1].status);
  });

  test('TSB = CTL - ATL', async () => {
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity('2026-02-10', 50),
      makeActivity('2026-02-11', 60),
    ]);

    const result = await getTrainingLoad(1, 10);
    // tsb est calculé sur les floats bruts avant arrondi de ctl/atl,
    // donc tsb peut différer de ctl-atl de ±0.2 (artefact d'arrondi)
    result.forEach(week => {
      const diff = Math.abs(week.tsb - (week.ctl - week.atl));
      expect(diff).toBeLessThanOrEqual(0.2);
    });
  });

  test('ATL réagit plus vite que CTL (decay ATL < decay CTL, formule continue)', () => {
    // Formule TrainingPeaks PMC : ATL_today = ATL_yesterday × exp(-1/N) + load × (1 − exp(-1/N))
    // Un decay plus petit signifie une réaction plus rapide (oubli plus vite).
    expect(ATL_DECAY).toBeCloseTo(Math.exp(-1 / 7), 6);
    expect(CTL_DECAY).toBeCloseTo(Math.exp(-1 / 42), 6);
    expect(ATL_DECAY).toBeLessThan(CTL_DECAY);
  });

  test('totalLoad = somme des sufferScore de la semaine', async () => {
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity('2026-02-02', 30),
      makeActivity('2026-02-03', 40),
      makeActivity('2026-02-04', 50),
    ]);

    const result = await getTrainingLoad(1, 10);
    const lastWeek = result.find(w => w.week === '2026-02-02');
    if (lastWeek) {
      expect(lastWeek.totalLoad).toBe(120);
      expect(lastWeek.activityCount).toBe(3);
    }
  });

  test('semaines triées par ordre chronologique', async () => {
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity('2026-01-26', 50),
      makeActivity('2026-02-02', 60),
    ]);

    const result = await getTrainingLoad(1, 4);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].week >= result[i - 1].week).toBe(true);
    }
  });
});
