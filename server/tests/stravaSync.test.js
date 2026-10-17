jest.mock('../models/Activity', () => ({
  upsert: jest.fn(),
  create: jest.fn(),
  bulkCreate: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/ActivityStream', () => ({
  upsert: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findByPk: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../utils/stravaHelpers', () => ({
  getValidStravaToken: jest.fn(),
  fetchStravaActivities: jest.fn(),
  getActivity: jest.fn(),
  getActivityStreams: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const User = require('../models/User');
const stravaHelpers = require('../utils/stravaHelpers');
const {
  syncSince,
  syncUserActivities,
  upsertActivities,
  enrichUserActivities,
  getSyncStatus,
  mapStravaActivityDetail,
} = require('../services/stravaSync');

describe('stravaSync incremental', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findByPk.mockReset();
    User.update.mockReset();
    stravaHelpers.getValidStravaToken.mockReset();
    stravaHelpers.fetchStravaActivities.mockReset();
    Activity.upsert.mockReset();
    Activity.findAll.mockReset();
    Activity.findOne.mockReset();
    Activity.create.mockReset();
    Activity.bulkCreate.mockReset();
    stravaHelpers.getActivity.mockReset();
    stravaHelpers.getActivityStreams.mockReset();

    User.findByPk.mockResolvedValue({ id: 42, stravaAccessToken: 'token', stravaRefreshToken: 'refresh' });
    User.update.mockResolvedValue([1]);
    stravaHelpers.getValidStravaToken.mockResolvedValue('valid-token');
    Activity.upsert.mockResolvedValue([{}, true]);
    Activity.findAll.mockResolvedValue([]);
    Activity.findOne.mockResolvedValue(null);
    Activity.create.mockResolvedValue({});
    Activity.bulkCreate.mockResolvedValue([]);
  });

  test('syncSince utilise une fenêtre de recouvrement pour récupérer les activités antidatées/importées après coup', async () => {
    const afterTimestamp = 1717200000; // ex: dernière sync après le 31 mai
    stravaHelpers.fetchStravaActivities
      .mockResolvedValueOnce([{ id: 1001, type: 'Ride', start_date: '2026-05-31T08:00:00Z', distance: 42000 }])
      .mockResolvedValueOnce([]);

    const result = await syncSince(42, afterTimestamp, { enrich: false, overlapDays: 14 });

    expect(result.success).toBe(true);
    expect(result.synced).toBe(1);
    expect(result.fetched).toBe(1);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenCalledWith('valid-token', {
      per_page: 200,
      page: 1,
      after: afterTimestamp - 14 * 86400,
    }, { userId: 42 });
    expect(Activity.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42, stravaId: [1001] } }));
    expect(Activity.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ userId: 42, stravaId: 1001, type: 'Ride', distance: 42000 })],
      expect.objectContaining({ updateOnDuplicate: expect.any(Array) })
    );
    expect(User.update).toHaveBeenCalledWith({ lastSyncAt: expect.any(Date) }, { where: { id: 42 } });
  });

  test('syncSince pagine toutes les activités récentes au lieu de limiter à 100', async () => {
    stravaHelpers.fetchStravaActivities
      .mockResolvedValueOnce(Array.from({ length: 200 }, (_, i) => ({ id: i + 1, type: 'Ride', start_date: '2026-05-31T08:00:00Z' })))
      .mockResolvedValueOnce([{ id: 201, type: 'Ride', start_date: '2026-05-31T09:00:00Z' }]);
    Activity.upsert.mockResolvedValue([{}, true]);

    const result = await syncSince(42, 1717200000, { enrich: false, overlapDays: 14 });

    expect(result.success).toBe(true);
    expect(result.fetched).toBe(201);
    expect(Activity.bulkCreate).toHaveBeenCalledTimes(2);
    expect(Activity.bulkCreate.mock.calls[0][0]).toHaveLength(200);
    expect(Activity.bulkCreate.mock.calls[1][0]).toHaveLength(1);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenCalledTimes(2);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenNthCalledWith(2, 'valid-token', expect.objectContaining({ page: 2 }), { userId: 42 });
  });

  test('upsertActivities met à jour uniquement la ligne du même utilisateur pour éviter l’écrasement inter-utilisateurs', async () => {
    Activity.findAll.mockResolvedValue([{ stravaId: 1001 }]);

    const count = await upsertActivities([
      { id: 1001, type: 'Run', start_date: '2026-05-31T08:00:00Z', distance: 5000 }
    ], 84);

    expect(count).toEqual({ total: 1, created: 0, updated: 1 });
    expect(Activity.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 84, stravaId: [1001] }, attributes: ['stravaId'], raw: true }));
    expect(Activity.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ userId: 84, stravaId: 1001, type: 'Run' })],
      expect.objectContaining({ updateOnDuplicate: expect.any(Array) })
    );
    expect(Activity.findOne).not.toHaveBeenCalled();
    expect(Activity.create).not.toHaveBeenCalled();
    expect(Activity.upsert).not.toHaveBeenCalled();
  });

  test('upsertActivities en lot : l\'update ne contient jamais calories, userId ni stravaId', async () => {
    Activity.findAll.mockResolvedValue([{ stravaId: 1001 }]);

    await upsertActivities([
      { id: 1001, type: 'Ride', start_date: '2026-05-31T08:00:00Z', calories: null },
    ], 42);

    const { updateOnDuplicate } = Activity.bulkCreate.mock.calls[0][1];
    expect(updateOnDuplicate).not.toContain('calories');
    expect(updateOnDuplicate).not.toContain('userId');
    expect(updateOnDuplicate).not.toContain('stravaId');
    expect(updateOnDuplicate).toContain('type');
  });

  test('upsertActivities en lot : compteurs created/updated exacts sur un lot mixte', async () => {
    Activity.findAll.mockResolvedValue([{ stravaId: 2 }, { stravaId: 4 }]);

    const count = await upsertActivities([
      { id: 1, start_date: '2026-05-31T08:00:00Z' },
      { id: 2, start_date: '2026-05-31T08:00:00Z' },
      { id: 3, start_date: '2026-05-31T08:00:00Z' },
      { id: 4, start_date: '2026-05-31T08:00:00Z' },
    ], 42);

    expect(count).toEqual({ total: 4, created: 2, updated: 2 });
    expect(Activity.bulkCreate.mock.calls[0][0]).toHaveLength(4);
  });

  test('upsertActivities : repli ligne à ligne si bulkCreate échoue, sans calories dans l\'update', async () => {
    const existing = { update: jest.fn().mockResolvedValue({}) };
    Activity.findAll.mockResolvedValue([{ stravaId: 1 }]);
    Activity.bulkCreate.mockRejectedValue(new Error('db down'));
    Activity.findOne.mockImplementation(async ({ where }) => (where.stravaId === 1 ? existing : null));

    const count = await upsertActivities([
      { id: 1, type: 'Run', start_date: '2026-05-31T08:00:00Z', calories: null },
      { id: 2, type: 'Ride', start_date: '2026-05-31T09:00:00Z' },
    ], 42);

    expect(count).toEqual({ total: 2, created: 1, updated: 1 });
    expect(existing.update).toHaveBeenCalledTimes(1);
    expect(existing.update.mock.calls[0][0]).not.toHaveProperty('calories');
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ type: 'Run' }));
    expect(Activity.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, stravaId: 2 }));
  });

  test('enrichUserActivities s\'arrête proprement sur STRAVA_DAILY_QUOTA et passe en statut partial', async () => {
    const activities = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1, userId: 42, stravaId: 100 + i, detailFetchedAt: null, streamFetchedAt: null,
    }));
    Activity.findAll.mockResolvedValueOnce(activities);
    const quota = Object.assign(new Error('daily quota'), { code: 'STRAVA_DAILY_QUOTA' });
    stravaHelpers.getActivity.mockRejectedValue(quota);

    const result = await enrichUserActivities(42, { maxCount: 6 });

    expect(result.success).toBe(true);
    expect(result.totalDetail).toBe(0);
    // Seul le premier batch (5) est lancé, le 2e batch n'est jamais démarré
    expect(stravaHelpers.getActivity).toHaveBeenCalledTimes(5);
    expect(stravaHelpers.getActivityStreams).not.toHaveBeenCalled();
    expect(getSyncStatus(42).status).toBe('partial');
    expect(getSyncStatus(42).errors).toContain('STRAVA_DAILY_QUOTA');
  });

  test('syncUserActivities ne marque pas fullSyncCompletedAt si une page Strava échoue', async () => {
    stravaHelpers.fetchStravaActivities
      .mockResolvedValueOnce(Array.from({ length: 200 }, (_, i) => ({ id: i + 1, type: 'Ride', start_date: '2026-05-31T08:00:00Z' })))
      .mockRejectedValueOnce(new Error('rate limit'));

    const result = await syncUserActivities(42, { enrich: false });

    expect(result.success).toBe(false);
    expect(result.status).toBe('partial');
    expect(result.errors).toEqual([expect.objectContaining({ page: 2, error: 'rate limit' })]);
    expect(User.update).toHaveBeenCalledWith({ lastSyncAt: expect.any(Date) }, { where: { id: 42 } });
    expect(User.update).not.toHaveBeenCalledWith(expect.objectContaining({ fullSyncCompletedAt: expect.any(Date) }), expect.anything());
  });
});

describe('enrichUserActivities — forceSinceDays et background (Lot G1)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const STREAMS = { time: { data: [0, 1], resolution: 'high' }, heartrate: { data: [120, 130] } };

  // Ligne Activity simulée : startDays = âge en jours ; detail / stream = déjà enrichi ou non
  const row = (id, { startDays, detail, stream }) => ({
    id,
    userId: 42,
    stravaId: 100 + id,
    startDate: new Date(Date.now() - startDays * DAY),
    detailFetchedAt: detail ? new Date() : null,
    streamFetchedAt: stream ? new Date() : null,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByPk.mockReset();
    stravaHelpers.getValidStravaToken.mockReset();
    stravaHelpers.fetchStravaActivities.mockReset();
    stravaHelpers.getActivity.mockReset();
    stravaHelpers.getActivityStreams.mockReset();
    Activity.findAll.mockReset();
    Activity.update.mockReset();
    Activity.bulkCreate.mockReset();

    User.findByPk.mockResolvedValue({ id: 42, stravaAccessToken: 'token', stravaRefreshToken: 'refresh' });
    User.update.mockResolvedValue([1]);
    stravaHelpers.getValidStravaToken.mockResolvedValue('valid-token');
    stravaHelpers.getActivity.mockImplementation(async (_token, stravaId) => ({ name: `detail-${stravaId}`, type: 'Ride' }));
    stravaHelpers.getActivityStreams.mockResolvedValue(STREAMS);
    Activity.update.mockResolvedValue([1]);
    Activity.findAll.mockResolvedValue([]);
    Activity.bulkCreate.mockResolvedValue([]);
  });

  test('forceSinceDays: 2 — récente déjà enrichie refetch détail + streams, ancienne complète ignorée, ancienne incomplète complétée sur ce qui manque', async () => {
    const recent = row(1, { startDays: 0.5, detail: true, stream: true });
    const oldComplete = row(2, { startDays: 10, detail: true, stream: true });
    const oldPartial = row(3, { startDays: 10, detail: false, stream: true });
    Activity.findAll.mockResolvedValueOnce([recent, oldComplete, oldPartial]);

    const result = await enrichUserActivities(42, { forceSinceDays: 2 });

    expect(result.success).toBe(true);
    // Récente (< 48 h) : détail + streams refaits malgré un enrichissement existant
    expect(stravaHelpers.getActivity).toHaveBeenCalledWith('valid-token', 101, { userId: 42, background: true });
    expect(stravaHelpers.getActivityStreams).toHaveBeenCalledWith('valid-token', 101, expect.any(Array), { userId: 42, background: true });
    expect(Activity.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'detail-101' }), { where: { id: 1 } });
    // Ancienne complète : aucun appel Strava
    expect(stravaHelpers.getActivity).not.toHaveBeenCalledWith('valid-token', 102, expect.anything());
    expect(stravaHelpers.getActivityStreams).not.toHaveBeenCalledWith('valid-token', 102, expect.anything(), expect.anything());
    // Ancienne incomplète (détail manquant) : détail seul, pas de streams
    expect(stravaHelpers.getActivity).toHaveBeenCalledWith('valid-token', 103, { userId: 42, background: true });
    expect(stravaHelpers.getActivityStreams).not.toHaveBeenCalledWith('valid-token', 103, expect.anything(), expect.anything());
    expect(stravaHelpers.getActivity).toHaveBeenCalledTimes(2);
    expect(stravaHelpers.getActivityStreams).toHaveBeenCalledTimes(1);
    expect(result.totalDetail).toBe(2);
    expect(result.totalStream).toBe(1);
  });

  test('forceSinceDays: 2 — la clause where contient startDate >= now - 2 jours', async () => {
    const before = Date.now();

    await enrichUserActivities(42, { forceSinceDays: 2 });

    const { where } = Activity.findAll.mock.calls[0][0];
    expect(where.userId).toBe(42);
    const dateClause = where[Op.or].find(c => c.startDate);
    expect(dateClause).toBeDefined();
    const gte = dateClause.startDate[Op.gte];
    expect(gte).toBeInstanceOf(Date);
    expect(Math.abs(gte.getTime() - (before - 2 * DAY))).toBeLessThan(5000);
  });

  test('force: true inchangé — where sans clause de date, toutes les activités refetchées (forceSinceDays ignoré)', async () => {
    const complete = row(1, { startDays: 10, detail: true, stream: true });
    Activity.findAll.mockResolvedValueOnce([complete]);

    await enrichUserActivities(42, { force: true, forceSinceDays: 2 });

    const { where } = Activity.findAll.mock.calls[0][0];
    expect(where).toEqual({ userId: 42 });
    expect(Object.getOwnPropertySymbols(where)).toHaveLength(0);
    expect(stravaHelpers.getActivity).toHaveBeenCalledWith('valid-token', 101, { userId: 42, background: true });
    expect(stravaHelpers.getActivityStreams).toHaveBeenCalledWith('valid-token', 101, expect.any(Array), { userId: 42, background: true });
  });

  test('getActivity et getActivityStreams reçoivent { userId, background: true } sur le chemin forceSinceDays', async () => {
    Activity.findAll.mockResolvedValueOnce([row(1, { startDays: 0.5, detail: false, stream: false })]);

    await enrichUserActivities(42, { forceSinceDays: 2 });

    expect(stravaHelpers.getActivity).toHaveBeenCalledWith('valid-token', 101, { userId: 42, background: true });
    expect(stravaHelpers.getActivityStreams).toHaveBeenCalledWith('valid-token', 101, expect.arrayContaining(['time', 'heartrate']), { userId: 42, background: true });
  });

  test('syncSince déclenche l\'enrichissement avec forceSinceDays: 2 (clause startDate >= now - 2 jours)', async () => {
    stravaHelpers.fetchStravaActivities
      .mockResolvedValueOnce([{ id: 1, type: 'Ride', start_date: '2026-05-31T08:00:00Z' }])
      .mockResolvedValueOnce([]);
    const before = Date.now();

    const result = await syncSince(42, 1717200000, { enrich: true, overlapDays: 14 });
    // L'enrichissement est lancé en fire-and-forget : on laisse passer les microtasks
    for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r));

    expect(result.success).toBe(true);
    const enrichCall = Activity.findAll.mock.calls.find(([opts]) => opts.where[Op.or]);
    expect(enrichCall).toBeDefined();
    const dateClause = enrichCall[0].where[Op.or].find(c => c.startDate);
    expect(Math.abs(dateClause.startDate[Op.gte].getTime() - (before - 2 * DAY))).toBeLessThan(5000);
  });
});

describe('mapStravaActivityDetail', () => {
  test('mappe les données puissance, gear et capteurs disponibles dans le détail Strava', () => {
    const mapped = mapStravaActivityDetail({
      name: 'Sortie nouveau vélo',
      type: 'Ride',
      distance: 50000,
      moving_time: 7200,
      elapsed_time: 7500,
      total_elevation_gain: 650,
      average_speed: 6.9,
      max_speed: 18.2,
      average_heartrate: 142,
      max_heartrate: 178,
      has_heartrate: true,
      calories: 1200,
      kilojoules: 950,
      suffer_score: 88,
      average_watts: 220,
      max_watts: 780,
      weighted_average_watts: 245,
      device_watts: true,
      average_cadence: 83,
      average_temp: 21,
      gear_id: 'b123',
      workout_type: 10,
      device_name: 'Garmin Edge',
      best_efforts: [{ name: '20 min' }],
      splits_metric: [{ distance: 1000 }],
      laps: [{ lap_index: 1 }],
    });

    expect(mapped).toMatchObject({
      name: 'Sortie nouveau vélo',
      type: 'Ride',
      distance: 50000,
      movingTime: 7200,
      elapsedTime: 7500,
      totalElevationGain: 650,
      averageSpeed: 6.9,
      maxSpeed: 18.2,
      averageHeartrate: 142,
      maxHeartrate: 178,
      hasHeartrate: true,
      calories: 1200,
      kilojoules: 950,
      sufferScore: 88,
      averageWatts: 220,
      maxWatts: 780,
      weightedAverageWatts: 245,
      deviceWatts: true,
      averageCadence: 83,
      averageTemp: 21,
      gearId: 'b123',
      workoutType: 10,
      deviceName: 'Garmin Edge',
    });
    expect(mapped.detailFetchedAt).toBeInstanceOf(Date);
  });
});
