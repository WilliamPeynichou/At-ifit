const { Op } = require('sequelize');

jest.mock('../models/Activity', () => ({ findAll: jest.fn() }));
jest.mock('../models/User', () => ({ findByPk: jest.fn() }));
jest.mock('../services/stravaSync', () => ({
  syncUserActivities: jest.fn().mockResolvedValue(undefined),
  syncSince: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/userMetricsService', () => ({
  resolveMaxHeartrate: jest.fn(async () => ({ value: 190, source: 'user_input', confidence: 'high' })),
}));
jest.mock('../services/cyclingProfileService', () => ({
  getCyclingProfile: jest.fn(async () => ({
    weight: 70, ftp: 250, ftpSource: 'estimated', ftpConfidence: 'medium', ftpRange: null,
    ftpNote: null, powerZones: [], maxHeartrate: 190, restHeartrate: 50,
  })),
}));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const cache = require('../utils/memoryCache');
const Activity = require('../models/Activity');
const User = require('../models/User');
const runningNorm = require('../utils/runningMetrics');
const cyclingNorm = require('../utils/cyclingMetrics');
const swimmingNorm = require('../utils/swimmingMetrics');
const runningService = require('../services/stravaRunning.service');
const cyclingService = require('../services/stravaCycling.service');
const swimmingService = require('../services/stravaSwimming.service');
const { invalidateUserDashboards } = require('../services/dashboardCache');

const DAY = 86400000;

// Ligne DB = colonnes + raw. `withRaw: false` simule le SELECT sans raw (colonnes extraites seules).
function buildRow({ columns, raw }, { withRaw }) {
  return { ...columns, raw: withRaw ? raw : null };
}

function runningFixture(i) {
  const start = new Date(Date.now() - i * DAY).toISOString();
  const raw = {
    id: 1000 + i, type: 'Run', sport_type: 'Run', name: `Run ${i}`, distance: 10000 + i * 100,
    moving_time: 3000, elapsed_time: 3100, average_speed: 3.33, max_speed: 5,
    total_elevation_gain: 80, average_heartrate: i % 2 ? 150 : null, max_heartrate: 175,
    calories: 650, suffer_score: 70, average_cadence: 82, device_name: 'Garmin',
    start_date: start, start_date_local: start, timezone: '(GMT+01:00) Europe/Paris',
  };
  const columns = {
    id: i, userId: 1, stravaId: 1000 + i, type: 'Run', sportType: 'Run', name: `Run ${i}`,
    distance: raw.distance, movingTime: 3000, elapsedTime: 3100, averageSpeed: 3.33, maxSpeed: 5,
    totalElevationGain: 80, averageHeartrate: raw.average_heartrate, maxHeartrate: 175,
    calories: 650, sufferScore: 70, averageCadence: 82, deviceName: 'Garmin',
    startDate: start, startDateLocal: start, timezone: raw.timezone,
    bestEfforts: null, splitsMetric: null,
  };
  return { columns, raw };
}

function rideFixture(i, { sportType = 'Ride', startLatlng = [48.8, 2.3] } = {}) {
  const start = new Date(Date.now() - i * DAY).toISOString();
  const raw = {
    id: 2000 + i, type: 'Ride', sport_type: sportType, name: `Ride ${i}`, distance: 40000 + i * 1000,
    moving_time: 5400, elapsed_time: 5600, average_speed: 7.4, max_speed: 13,
    total_elevation_gain: 300, elev_high: 245.6, elev_low: 40.2,
    average_heartrate: 140, max_heartrate: 170, average_watts: 180, weighted_average_watts: 190,
    max_watts: 520, device_watts: true, average_cadence: 88, kilojoules: 900, calories: 800,
    suffer_score: 60, device_name: 'Wahoo', start_date: start,
    start_date_local: start, timezone: '(GMT+01:00) Europe/Paris', start_latlng: startLatlng,
    end_latlng: startLatlng, workout_type: null,
  };
  const columns = {
    id: i, userId: 1, stravaId: 2000 + i, type: 'Ride', sportType, name: `Ride ${i}`,
    distance: raw.distance, movingTime: 5400, elapsedTime: 5600, averageSpeed: 7.4, maxSpeed: 13,
    totalElevationGain: 300, elevHigh: 245.6, elevLow: 40.2, averageHeartrate: 140, maxHeartrate: 170,
    averageWatts: 180, weightedAverageWatts: 190, maxWatts: 520, deviceWatts: true, averageCadence: 88,
    kilojoules: 900, calories: 800, sufferScore: 60, deviceName: 'Wahoo', startDate: start,
    startDateLocal: start, timezone: raw.timezone, startLatlng, endLatlng: startLatlng,
    workoutType: null, bestEfforts: null, splitsMetric: null,
  };
  return { columns, raw };
}

function swimFixture(i) {
  const start = new Date(Date.now() - i * DAY).toISOString();
  const raw = {
    id: 3000 + i, type: 'Swim', sport_type: 'PoolSwim', name: `Piscine ${i}`, distance: 1500,
    moving_time: 2100, elapsed_time: 2200, average_speed: 0.71, max_speed: 1.1,
    average_heartrate: 130, device_name: 'Garmin', start_date: start, start_date_local: start,
    timezone: '(GMT+01:00) Europe/Paris', swolf: 38, pool_length: 25, description: 'Séance',
    average_cadence: 20,
  };
  const columns = {
    id: i, userId: 1, stravaId: 3000 + i, type: 'Swim', sportType: 'PoolSwim', name: `Piscine ${i}`,
    distance: 1500, movingTime: 2100, elapsedTime: 2200, averageSpeed: 0.71, maxSpeed: 1.1,
    averageHeartrate: 130, deviceName: 'Garmin', startDate: start, startDateLocal: start,
    timezone: raw.timezone, averageCadence: 20, bestEfforts: null, splitsMetric: null,
  };
  return { columns, raw };
}

beforeEach(() => {
  cache.clear();
  jest.clearAllMocks();
});

describe('normaliseurs : raw complet ≡ colonnes extraites (raw absent)', () => {
  test('Running : sortie identique', () => {
    const fixtures = [0, 1, 2].map(runningFixture);
    const withRaw = runningNorm.filterRunningActivities(fixtures.map(f => buildRow(f, { withRaw: true })));
    const colsOnly = runningNorm.filterRunningActivities(fixtures.map(f => buildRow(f, { withRaw: false })));
    expect(colsOnly).toEqual(withRaw);
    expect(colsOnly.length).toBe(3);
  });

  test('Cycling : sortie identique (elev_high/low, start_date_local, timezone)', () => {
    const fixtures = [0, 1].map(i => rideFixture(i));
    const withRaw = cyclingNorm.filterCyclingActivities(fixtures.map(f => buildRow(f, { withRaw: true })), {}, { ftp: 250, weightKg: 70 });
    const colsOnly = cyclingNorm.filterCyclingActivities(fixtures.map(f => buildRow(f, { withRaw: false })), {}, { ftp: 250, weightKg: 70 });
    expect(colsOnly).toEqual(withRaw);
    expect(colsOnly[0].elevationHigh).toBe(245.6);
    // Tri ascendant : colsOnly[0] est la sortie la plus ancienne (fixture i=1).
    expect(colsOnly[0].localDate).toBe(fixtures[1].columns.startDateLocal);
  });

  test('Cycling : startLatlng [] (indoor) reste identique', () => {
    const f = rideFixture(0, { startLatlng: [] });
    const withRaw = cyclingNorm.filterCyclingActivities([buildRow(f, { withRaw: true })], {}, { ftp: 250 });
    const colsOnly = cyclingNorm.filterCyclingActivities([buildRow(f, { withRaw: false })], {}, { ftp: 250 });
    expect(colsOnly).toEqual(withRaw);
  });

  test('Swimming : raw indispensable (swolf, pool_length, description non extraits)', () => {
    // Garde-fou : la natation garde raw. Sans raw, ces champs disparaissent (régression évitée).
    const fixtures = [0, 1].map(swimFixture);
    const withRaw = swimmingNorm.filterSwimmingActivities(fixtures.map(f => buildRow(f, { withRaw: true })));
    const colsOnly = swimmingNorm.filterSwimmingActivities(fixtures.map(f => buildRow(f, { withRaw: false })));
    expect(withRaw[0].swolf).toBe(38);
    expect(withRaw[0].poolLengthMeters).toBe(25);
    expect(withRaw[0].description).toBe('Séance');
    expect(colsOnly[0].swolf).toBeUndefined();
    expect(colsOnly).not.toEqual(withRaw);
  });
});

describe('pré-filtre SQL par sport', () => {
  test('Running : where = userId + Op.or(type, sportType) ; raw et summaryPolyline exclus', async () => {
    Activity.findAll.mockResolvedValue([]);
    User.findByPk.mockResolvedValue({ id: 1, stravaAccessToken: 't', fullSyncCompletedAt: new Date(), lastSyncAt: new Date() });
    await runningService.getRunningActivities(1, { period: '30D' });
    const args = Activity.findAll.mock.calls[0][0];
    expect(args.where.userId).toBe(1);
    expect(args.where[Op.or]).toEqual([
      { type: { [Op.in]: ['Run', 'TrailRun', 'VirtualRun', 'TrackRun'] } },
      { sportType: { [Op.in]: ['Run', 'TrailRun', 'VirtualRun', 'TrackRun'] } },
    ]);
    expect(args.attributes).toEqual({ exclude: ['raw', 'summaryPolyline'] });
  });

  test('Cycling : TYPES = base ∪ optionnels ; summaryPolyline exclu, raw conservé', async () => {
    Activity.findAll.mockResolvedValue([]);
    User.findByPk.mockResolvedValue({ id: 1, stravaAccessToken: 't', fullSyncCompletedAt: new Date(), lastSyncAt: new Date() });
    await cyclingService.getCyclingActivities(1, {});
    const args = Activity.findAll.mock.calls[0][0];
    const types = ['Ride', 'RoadRide', 'GravelRide', 'VirtualRide', 'EBikeRide'];
    expect(args.where[Op.or]).toEqual([
      { type: { [Op.in]: types } },
      { sportType: { [Op.in]: types } },
    ]);
    expect(args.attributes).toEqual({ exclude: ['summaryPolyline'] });
  });

  test('Swimming : pré-filtre seulement, pas d\'exclusion de colonnes', async () => {
    Activity.findAll.mockResolvedValue([]);
    User.findByPk.mockResolvedValue({ id: 1, stravaAccessToken: 't', fullSyncCompletedAt: new Date(), lastSyncAt: new Date() });
    await swimmingService.getSwimmingActivities(1, {});
    const args = Activity.findAll.mock.calls[0][0];
    expect(args.where[Op.or]).toEqual([
      { type: { [Op.in]: ['Swim', 'PoolSwim', 'OpenWaterSwim'] } },
      { sportType: { [Op.in]: ['Swim', 'PoolSwim', 'OpenWaterSwim'] } },
    ]);
    expect(args.attributes).toBeUndefined();
  });
});

describe('cache dashboards : réponse identique, requête SQL évitée', () => {
  function freshUser(overrides = {}) {
    return {
      id: 1,
      stravaAccessToken: 't',
      fullSyncCompletedAt: new Date(Date.now() - 2 * DAY),
      lastSyncAt: new Date(Date.now() - 60 * 1000),
      ...overrides,
    };
  }

  test('Running analysis : 2e appel sans findAll, deepEqual à un appel non caché', async () => {
    const rows = [0, 1, 2, 3].map(i => buildRow(runningFixture(i), { withRaw: false }));
    Activity.findAll.mockResolvedValue(rows);
    User.findByPk.mockResolvedValue(freshUser());

    const first = await runningService.getRunningAnalysis(1, { period: '30D' });
    const second = await runningService.getRunningAnalysis(1, { period: '30D' });
    expect(Activity.findAll).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);

    cache.clear();
    const uncached = await runningService.getRunningAnalysis(1, { period: '30D' });
    expect(second).toEqual(uncached);
  });

  test('statut de sync recomposé hors cache : lastSyncAt récent visible sans recalcul', async () => {
    Activity.findAll.mockResolvedValue([buildRow(runningFixture(0), { withRaw: false })]);
    const user = freshUser({ lastSyncAt: new Date(Date.now() - 60 * 1000) });
    User.findByPk.mockResolvedValue(user);
    await runningService.getRunningAnalysis(1, { period: '30D' });

    const newer = new Date(Date.now() - 1000);
    User.findByPk.mockResolvedValue(freshUser({ lastSyncAt: newer }));
    const second = await runningService.getRunningAnalysis(1, { period: '30D' });
    expect(Activity.findAll).toHaveBeenCalledTimes(1);
    expect(second.status.lastSyncAt).toEqual(newer);
  });

  test('invalidateUserDashboards : le calcul suivant relit les activités', async () => {
    Activity.findAll.mockResolvedValue([buildRow(runningFixture(0), { withRaw: false })]);
    User.findByPk.mockResolvedValue(freshUser());
    await cyclingService.getCyclingAnalysis(1, {});
    await cyclingService.getCyclingAnalysis(1, {});
    expect(Activity.findAll).toHaveBeenCalledTimes(1);

    invalidateUserDashboards(1);
    await cyclingService.getCyclingAnalysis(1, {});
    expect(Activity.findAll).toHaveBeenCalledTimes(2);
  });

  test('Cycling : options différentes → entrées de cache distinctes', async () => {
    Activity.findAll.mockResolvedValue([buildRow(rideFixture(0), { withRaw: false })]);
    User.findByPk.mockResolvedValue(freshUser());
    const withVirtual = await cyclingService.getCyclingAnalysis(1, { includeVirtual: 'true' });
    const without = await cyclingService.getCyclingAnalysis(1, { includeVirtual: 'false' });
    expect(withVirtual.status.userProfile).toEqual(without.status.userProfile);
    expect(Activity.findAll).toHaveBeenCalledTimes(2);
  });
});
