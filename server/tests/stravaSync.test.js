jest.mock('../models/Activity', () => ({
  upsert: jest.fn(),
  create: jest.fn(),
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

const Activity = require('../models/Activity');
const User = require('../models/User');
const stravaHelpers = require('../utils/stravaHelpers');
const {
  syncSince,
  syncUserActivities,
  upsertActivities,
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

    User.findByPk.mockResolvedValue({ id: 42, stravaAccessToken: 'token', stravaRefreshToken: 'refresh' });
    User.update.mockResolvedValue([1]);
    stravaHelpers.getValidStravaToken.mockResolvedValue('valid-token');
    Activity.upsert.mockResolvedValue([{}, true]);
    Activity.findAll.mockResolvedValue([]);
    Activity.findOne.mockResolvedValue(null);
    Activity.create.mockResolvedValue({});
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
      per_page: 100,
      page: 1,
      after: afterTimestamp - 14 * 86400,
    }, { userId: 42 });
    expect(Activity.findOne).toHaveBeenCalledWith({ where: { userId: 42, stravaId: 1001 } });
    expect(Activity.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, stravaId: 1001, type: 'Ride', distance: 42000 })
    );
    expect(User.update).toHaveBeenCalledWith({ lastSyncAt: expect.any(Date) }, { where: { id: 42 } });
  });

  test('syncSince pagine toutes les activités récentes au lieu de limiter à 100', async () => {
    stravaHelpers.fetchStravaActivities
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, type: 'Ride', start_date: '2026-05-31T08:00:00Z' })))
      .mockResolvedValueOnce([{ id: 101, type: 'Ride', start_date: '2026-05-31T09:00:00Z' }]);
    Activity.upsert.mockResolvedValue([{}, true]);

    const result = await syncSince(42, 1717200000, { enrich: false, overlapDays: 14 });

    expect(result.success).toBe(true);
    expect(result.fetched).toBe(101);
    expect(Activity.create).toHaveBeenCalledTimes(101);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenCalledTimes(2);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenNthCalledWith(2, 'valid-token', expect.objectContaining({ page: 2 }), { userId: 42 });
  });

  test('upsertActivities met à jour uniquement la ligne du même utilisateur pour éviter l’écrasement inter-utilisateurs', async () => {
    const existing = { update: jest.fn().mockResolvedValue({}) };
    Activity.findOne.mockResolvedValue(existing);

    const count = await upsertActivities([
      { id: 1001, type: 'Run', start_date: '2026-05-31T08:00:00Z', distance: 5000 }
    ], 84);

    expect(count).toEqual({ total: 1, created: 0, updated: 1 });
    expect(Activity.findOne).toHaveBeenCalledWith({ where: { userId: 84, stravaId: 1001 } });
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ userId: 84, stravaId: 1001, type: 'Run' }));
    expect(Activity.create).not.toHaveBeenCalled();
    expect(Activity.upsert).not.toHaveBeenCalled();
  });

  test('syncUserActivities ne marque pas fullSyncCompletedAt si une page Strava échoue', async () => {
    stravaHelpers.fetchStravaActivities
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, type: 'Ride', start_date: '2026-05-31T08:00:00Z' })))
      .mockRejectedValueOnce(new Error('rate limit'));

    const result = await syncUserActivities(42, { enrich: false });

    expect(result.success).toBe(false);
    expect(result.status).toBe('partial');
    expect(result.errors).toEqual([expect.objectContaining({ page: 2, error: 'rate limit' })]);
    expect(User.update).toHaveBeenCalledWith({ lastSyncAt: expect.any(Date) }, { where: { id: 42 } });
    expect(User.update).not.toHaveBeenCalledWith(expect.objectContaining({ fullSyncCompletedAt: expect.any(Date) }), expect.anything());
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
