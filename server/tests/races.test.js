const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

jest.mock('../database', () => ({ transaction: jest.fn(async fn => fn('tx')) }));
jest.mock('../models/User', () => ({ findByPk: jest.fn(async (id) => ({ id })) }));
jest.mock('../models/Activity', () => ({ findAll: jest.fn(async () => []) }));
jest.mock('../models/Race', () => ({
  findAll: jest.fn(async () => []),
  findOne: jest.fn(),
  create: jest.fn(async (values) => ({ id: 7, ...values })),
}));

const Race = require('../models/Race');
const generalLimiter = require('express-rate-limit')({ windowMs: 60000, max: 1000 });
const raceRoutes = require('../routes/races');
const { normalizeRaceInput } = require('../utils/raceInput');
const { normalizeNutritionProfile } = require('../utils/nutritionProfile');
const { buildTrainingSummary } = require('../services/trainingSummaryService');

const token = jwt.sign({ id: 1, type: 'access' }, process.env.JWT_SECRET);

function buildApp() {
  const app = express();
  app.use('/api/races', generalLimiter, express.json({ limit: '2mb' }), raceRoutes);
  app.use(express.json({ limit: '10kb' }));
  app.post('/api/other', (req, res) => res.json({ ok: true }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ success: false, error: err.message }));
  return app;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => resolve(server));
  });
}

const post = (base, path, body) => fetch(`${base}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});

const bigGpx = () => ({
  name: 'Trail',
  sport: 'running',
  raceDate: '2026-06-14',
  planner: {
    gpx: { fileName: 'a.gpx', name: 'A', points: Array.from({ length: 4000 }, (_, i) => ({ lat: 45 + i / 1e5, lon: 6, ele: 1200 + (i % 50) })), waypoints: [] },
    stations: [],
    sections: [],
  },
});

describe('courses : parser 2mb sur /api/races, 10kb ailleurs', () => {
  let server;
  let base;

  beforeAll(async () => {
    server = await listen(buildApp());
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => new Promise(resolve => server.close(resolve)));

  beforeEach(() => {
    Race.create.mockClear();
  });

  test('accepte un tracé GPX de plusieurs centaines de Ko sur /api/races', async () => {
    const body = bigGpx();
    expect(JSON.stringify(body).length).toBeGreaterThan(10 * 1024);

    const res = await post(base, '/api/races', body);
    expect(res.status).toBe(201);
    expect(Race.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, name: 'Trail', sport: 'running' }));
  });

  test('refuse un corps de plus de 2mb sur /api/races', async () => {
    const body = { ...bigGpx(), objective: { blob: 'x'.repeat(2.2 * 1024 * 1024) } };
    const res = await post(base, '/api/races', body);
    expect(res.status).toBe(413);
  });

  test('conserve la limite 10kb sur les autres routes', async () => {
    const res = await post(base, '/api/other', { blob: 'x'.repeat(20 * 1024) });
    expect(res.status).toBe(413);
  });

  test('rejette une course invalide avec 400 et message français', async () => {
    const res = await post(base, '/api/races', { name: '', sport: 'golf' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/name est requis/);
    expect(json.error).toMatch(/sport doit être/);
  });
});

describe('normalisation des contrats courses', () => {
  test('RaceInput : valeurs par défaut et champs inconnus ignorés', () => {
    const { input, errors } = normalizeRaceInput({
      name: '  Marathon  ',
      sport: 'running',
      raceDate: '2026-04-12',
      distanceKm: 42.2,
      secret: 'ignored',
    });
    expect(errors).toEqual([]);
    expect(input).toEqual(expect.objectContaining({
      name: 'Marathon',
      sport: 'running',
      raceDate: '2026-04-12',
      distanceKm: 42.2,
      elevationGainM: null,
      objective: {},
      planner: null,
      strategy: null,
      trainingPlan: null,
    }));
    expect(input).not.toHaveProperty('secret');
  });

  test('RaceInput : date impossible et nom trop long refusés', () => {
    const { errors } = normalizeRaceInput({ name: 'x'.repeat(121), sport: 'cycling', raceDate: '2026-02-30' });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/name ne doit pas dépasser 120/),
      expect.stringMatching(/raceDate n'est pas une date valide/),
    ]));
  });

  test('profil nutrition : défauts, déduplication des allergies, enums stricts', () => {
    const ok = normalizeNutritionProfile({ gutTolerance: 'high', allergies: ['Gluten', ' gluten ', ''] });
    expect(ok.errors).toEqual([]);
    expect(ok.profile).toEqual({
      gutTolerance: 'high',
      sweatSodiumProfile: 'normal',
      diet: 'omnivore',
      allergies: ['Gluten'],
      preferredProducts: '',
      avoidedProducts: '',
      caffeine: true,
    });

    const ko = normalizeNutritionProfile({ gutTolerance: 'extreme', caffeine: 'oui' });
    expect(ko.profile).toBeNull();
    expect(ko.errors).toHaveLength(2);
  });
});

describe('synthèse d\'entraînement', () => {
  const now = new Date('2026-05-20T10:00:00Z');
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();

  test('agrège par sport, ignore les types non suivis et calcule la tendance', () => {
    const summary = buildTrainingSummary([
      { type: 'Run', name: 'Sortie', startDate: daysAgo(2), distance: 10000, movingTime: 3000, totalElevationGain: 100 },
      { type: 'TrailRun', name: 'Trail', startDate: daysAgo(5), distance: 20000, movingTime: 7200, totalElevationGain: 800 },
      { type: 'Ride', name: null, startDate: daysAgo(3), distance: 60000, movingTime: 7200, totalElevationGain: 500 },
      { type: 'Swim', name: 'Piscine', startDate: daysAgo(4), distance: 2000, movingTime: 2400, totalElevationGain: 0 },
      { type: 'Yoga', startDate: daysAgo(1), distance: 0, movingTime: 3600 },
      { type: 'Run', startDate: daysAgo(200), distance: 99000, movingTime: 99999 },
    ], now);

    expect(summary.weeksAnalyzed).toBe(12);
    expect(summary.bySport.running.sessions).toBe(2);
    expect(summary.bySport.running.longestKm).toBe(20);
    expect(summary.bySport.running.avgPaceMinKm).toBeCloseTo(5.67, 2);
    expect(summary.bySport.cycling.avgSpeedKmh).toBe(30);
    expect(summary.bySport.swimming.sessions).toBe(1);
    expect(summary.trend).toBe('up');
    expect(summary.recentLongest[0]).toEqual(expect.objectContaining({ type: 'Ride', distanceKm: 60 }));
    expect(summary.recentLongest.every(a => !('id' in a) && !('stravaId' in a))).toBe(true);
  });

  test('sans activité : tendance stable et sports à zéro', () => {
    const summary = buildTrainingSummary([], now);
    expect(summary.trend).toBe('stable');
    expect(summary.bySport.running).toEqual(expect.objectContaining({ sessions: 0, weeklyKm: 0, avgPaceMinKm: null }));
    expect(summary.recentLongest).toEqual([]);
  });
});
