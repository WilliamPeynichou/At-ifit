jest.mock('../models/Activity', () => ({
  upsert: jest.fn(),
  create: jest.fn(),
  bulkCreate: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../models/ActivityStream', () => ({
  upsert: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
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
const ActivityStream = require('../models/ActivityStream');
const User = require('../models/User');
const stravaHelpers = require('../utils/stravaHelpers');
const { handleStravaEvent } = require('../services/webhookService');

// Laisse tourner l'enrichissement lancé en arrière-plan (fire-and-forget)
const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r));
};

const ATHLETE_ID = 555;
const STRAVA_ID = 9001;

describe('webhookService — événement activity create/update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue({ id: 42, stravaAccessToken: 'tok', stravaRefreshToken: 'r', stravaExpiresAt: null, stravaAthleteId: ATHLETE_ID });
    User.findByPk.mockResolvedValue({ id: 42, stravaAccessToken: 'tok' });
    stravaHelpers.getValidStravaToken.mockResolvedValue('valid-token');
    stravaHelpers.getActivity.mockResolvedValue({
      id: STRAVA_ID,
      name: 'Sortie',
      type: 'Ride',
      start_date: '2026-05-31T08:00:00Z',
      distance: 42000,
      moving_time: 3600,
      calories: 800,
    });
    stravaHelpers.getActivityStreams.mockResolvedValue({ time: { data: [0, 1] }, watts: { data: [200, 210], resolution: 'high' } });
    Activity.bulkCreate.mockResolvedValue([]);
    Activity.findAll.mockResolvedValue([]);
    // Après upsert + applyActivityDetail, le détail est posé : enrichActivity ne doit plus le refaire
    Activity.findOne.mockResolvedValue({ id: 7, userId: 42, stravaId: STRAVA_ID, detailFetchedAt: new Date(), streamFetchedAt: null });
    Activity.update.mockResolvedValue([1]);
    ActivityStream.upsert.mockResolvedValue([{}, true]);
  });

  test('create : un seul appel détail Strava (pas de refetch dans l\'enrichissement)', async () => {
    await handleStravaEvent({ object_type: 'activity', aspect_type: 'create', object_id: STRAVA_ID, owner_id: ATHLETE_ID });
    await flush();

    expect(stravaHelpers.getActivity).toHaveBeenCalledTimes(1);
    expect(stravaHelpers.getActivity).toHaveBeenCalledWith('valid-token', STRAVA_ID, { userId: 42 });
    // Les streams restent récupérés par l'enrichissement
    expect(stravaHelpers.getActivityStreams).toHaveBeenCalledTimes(1);
  });

  test('create : applique le détail reçu (detailFetchedAt posé) avant l\'enrichissement', async () => {
    await handleStravaEvent({ object_type: 'activity', aspect_type: 'create', object_id: STRAVA_ID, owner_id: ATHLETE_ID });
    await flush();

    expect(Activity.update).toHaveBeenCalledWith(
      expect.objectContaining({ detailFetchedAt: expect.any(Date), calories: 800, name: 'Sortie' }),
      { where: { userId: 42, stravaId: STRAVA_ID } }
    );
  });

  test('update : même comportement (1 appel détail)', async () => {
    await handleStravaEvent({ object_type: 'activity', aspect_type: 'update', object_id: STRAVA_ID, owner_id: ATHLETE_ID });
    await flush();

    expect(stravaHelpers.getActivity).toHaveBeenCalledTimes(1);
  });

  test('ignore les événements non-activité sans appel Strava', async () => {
    await handleStravaEvent({ object_type: 'athlete', aspect_type: 'update', object_id: 1, owner_id: ATHLETE_ID });

    expect(stravaHelpers.getActivity).not.toHaveBeenCalled();
    expect(Activity.bulkCreate).not.toHaveBeenCalled();
  });

  test('delete : invalide les dashboards cachés du user', async () => {
    const memoryCache = require('../utils/memoryCache');
    memoryCache.set('dash:42:running:{}', { v: 1 }, 600);
    memoryCache.set('dash:43:running:{}', { v: 2 }, 600);
    Activity.destroy.mockResolvedValue(1);

    await handleStravaEvent({ object_type: 'activity', aspect_type: 'delete', object_id: STRAVA_ID, owner_id: ATHLETE_ID });

    expect(Activity.destroy).toHaveBeenCalledWith({ where: { stravaId: STRAVA_ID, userId: 42 } });
    expect(memoryCache.get('dash:42:running:{}')).toBeNull();
    expect(memoryCache.get('dash:43:running:{}')).toEqual({ v: 2 });
  });
});
