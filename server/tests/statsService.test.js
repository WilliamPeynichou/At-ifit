/**
 * Tests unitaires — statsService.js
 * Mock Sequelize models pour tester les calculs de corrélation poids/performance.
 */

jest.mock('../models/Weight', () => ({ findAll: jest.fn() }));
jest.mock('../models/Activity', () => ({ findAll: jest.fn() }));
jest.mock('../database', () => ({
  define: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const Weight = require('../models/Weight');
const Activity = require('../models/Activity');
const { getWeightPerformanceCorrelation } = require('../services/statsService');

// Dates fixes pour éviter les variations selon le jour d'exécution
const WEEK1_MON = '2026-02-02'; // Semaine 6
const WEEK2_MON = '2026-02-09'; // Semaine 7

function makeWeight(date, weight) {
  return { date, weight };
}

function makeActivity(startDate, distance, calories = 0) {
  return { startDate, distance, calories };
}

describe('getWeightPerformanceCorrelation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('retourne un tableau vide si aucune donnée', async () => {
    Weight.findAll = jest.fn().mockResolvedValue([]);
    Activity.findAll = jest.fn().mockResolvedValue([]);

    const result = await getWeightPerformanceCorrelation(1, 12);
    expect(result).toEqual([]);
  });

  test('agrège correctement les données d\'une semaine', async () => {
    Weight.findAll = jest.fn().mockResolvedValue([
      makeWeight(WEEK1_MON, 75.0),
      makeWeight('2026-02-04', 74.5),
    ]);
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity(WEEK1_MON, 10000, 500),
      makeActivity('2026-02-04', 5000, 300),
    ]);

    const result = await getWeightPerformanceCorrelation(1, 12);
    expect(result).toHaveLength(1);

    const week = result[0];
    expect(week.avgWeight).toBe(74.8); // (75 + 74.5) / 2
    expect(week.totalDistance).toBe(15.0); // (10000 + 5000) / 1000
    expect(week.activityCount).toBe(2);
    expect(week.totalCalories).toBe(800);
    expect(week.avgCalories).toBe(400);
  });

  test('gère des semaines sans poids (avgWeight = null)', async () => {
    Weight.findAll = jest.fn().mockResolvedValue([]);
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity(WEEK1_MON, 8000, 400),
    ]);

    const result = await getWeightPerformanceCorrelation(1, 12);
    expect(result[0].avgWeight).toBeNull();
    expect(result[0].totalDistance).toBe(8.0);
  });

  test('gère des semaines sans activités (totalDistance = 0)', async () => {
    Weight.findAll = jest.fn().mockResolvedValue([
      makeWeight(WEEK1_MON, 80.0),
    ]);
    Activity.findAll = jest.fn().mockResolvedValue([]);

    const result = await getWeightPerformanceCorrelation(1, 12);
    expect(result[0].avgWeight).toBe(80.0);
    expect(result[0].totalDistance).toBe(0);
    expect(result[0].activityCount).toBe(0);
  });

  test('trie les semaines par ordre chronologique', async () => {
    Weight.findAll = jest.fn().mockResolvedValue([
      makeWeight(WEEK2_MON, 74.0),
      makeWeight(WEEK1_MON, 75.0),
    ]);
    Activity.findAll = jest.fn().mockResolvedValue([]);

    const result = await getWeightPerformanceCorrelation(1, 12);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].week < result[1].week).toBe(true);
  });

  test('distance convertie de mètres en km avec 1 décimale', async () => {
    Weight.findAll = jest.fn().mockResolvedValue([]);
    Activity.findAll = jest.fn().mockResolvedValue([
      makeActivity(WEEK1_MON, 12345),
    ]);

    const result = await getWeightPerformanceCorrelation(1, 12);
    expect(result[0].totalDistance).toBe(12.3);
  });
});
