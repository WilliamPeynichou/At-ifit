jest.mock('../models/Activity', () => ({
  upsert: jest.fn(),
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

    User.findByPk.mockResolvedValue({ id: 42, stravaAccessToken: 'token', stravaRefreshToken: 'refresh' });
    User.update.mockResolvedValue([1]);
    stravaHelpers.getValidStravaToken.mockResolvedValue('valid-token');
    Activity.upsert.mockResolvedValue([{}, true]);
    Activity.findAll.mockResolvedValue([]);
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
    });
    expect(Activity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, stravaId: 1001, type: 'Ride', distance: 42000 }),
      { conflictFields: ['stravaId'] }
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
    expect(Activity.upsert).toHaveBeenCalledTimes(101);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenCalledTimes(2);
    expect(stravaHelpers.fetchStravaActivities).toHaveBeenNthCalledWith(2, 'valid-token', expect.objectContaining({ page: 2 }));
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
