jest.mock('../models/Activity', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/ActivityStream', () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/auditService', () => ({
  logAuditEvent: jest.fn().mockResolvedValue({ id: 1 }),
}));

jest.mock('../models/User', () => ({
  findByPk: jest.fn(),
}));

jest.mock('../models/Weight', () => ({
  findAll: jest.fn(),
}));

jest.mock('../models/Goal', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../services/stravaSync', () => ({
  syncUserActivities: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const Activity = require('../models/Activity');
const User = require('../models/User');
const Weight = require('../models/Weight');
const Goal = require('../models/Goal');
const { syncUserActivities } = require('../services/stravaSync');
const {
  buildTargetedAgentContext,
  buildPendingAction,
  executeConfirmedAction,
  summarizeActivities,
  clampDateRange,
  detectIntent,
} = require('../services/agentToolsService');

describe('agentToolsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findByPk.mockResolvedValue({
      id: 42,
      pseudo: 'Alex',
      age: 34,
      stravaAccessToken: 'decrypted-token',
      lastSyncAt: new Date('2026-03-02T10:00:00Z'),
      fullSyncCompletedAt: null,
      targetWeight: 72,
      consoKcal: 2400,
    });
    Weight.findAll.mockResolvedValue([{ date: '2026-03-01', weight: 73 }]);
    Goal.findAll.mockResolvedValue([{ id: 9, type: 'sessions_weekly', sportType: null, targetValue: 3, period: 'week', active: true }]);
    Activity.findAll.mockResolvedValue([
      {
        id: 1,
        userId: 42,
        type: 'Run',
        name: 'Footing',
        distance: 10000,
        movingTime: 3600,
        totalElevationGain: 100,
        calories: 700,
        averageHeartrate: 145,
        averageWatts: null,
        averageCadence: 82,
        sufferScore: 60,
        startDate: new Date('2026-03-01T08:00:00Z'),
      },
    ]);
    Activity.findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('détecte les intentions naturelles utiles à la lecture ciblée', () => {
    expect(detectIntent('Compare ma semaine vélo avec la précédente')).toEqual(expect.arrayContaining(['compare_periods', 'weekly_volume', 'sport_ride']));
    expect(detectIntent('Prépare-moi un bilan')).toEqual(expect.arrayContaining(['weekly_report', 'action_request']));
    expect(detectIntent('Quel est mon poids et mon objectif ?')).toEqual(expect.arrayContaining(['profile', 'goals']));
  });

  test('résume les activités sans données brutes massives et signale les champs manquants', () => {
    const summary = summarizeActivities([
      { distance: 10000, movingTime: 3600, totalElevationGain: 100, calories: 500, averageHeartrate: 140, averageWatts: 210, averageCadence: 85 },
      { distance: 5000, movingTime: 1800, totalElevationGain: 0, calories: null, averageHeartrate: null, averageWatts: null, averageCadence: null },
    ]);

    expect(summary).toMatchObject({
      count: 2,
      distanceKm: 15,
      durationHours: 1.5,
      elevationM: 100,
      calories: 500,
      averageHeartrate: 140,
      averageWatts: 210,
      averageCadence: 85,
      missing: { heartrate: 1, power: 1, cadence: 1, calories: 1 },
    });
  });

  test('borne les périodes demandées pour éviter une extraction excessive', () => {
    const range = clampDateRange({ from: '2020-01-01', to: '2026-01-01' });
    const spanDays = Math.floor((range.to - range.from) / (24 * 60 * 60 * 1000)) + 1;
    expect(spanDays).toBeLessThanOrEqual(370);
  });

  test('construit un contexte unique ciblé, traçable, homogène et sans token exposé', async () => {
    const { context, dataUsed } = await buildTargetedAgentContext(42, 'Compare ma semaine avec la précédente et mes records');

    expect(User.findByPk).toHaveBeenCalledWith(42, expect.objectContaining({ attributes: expect.any(Array) }));
    expect(Weight.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 }, limit: 10 }));
    expect(Goal.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42, active: true }, limit: 10 }));
    expect(Activity.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 42 }), limit: 500 }));

    expect(dataUsed).toEqual(expect.arrayContaining(['profile_without_secrets', 'active_goals', 'strava_connection_status', 'current_week_volume', 'current_vs_previous_week', 'personal_records_summary']));
    expect(context).toMatchObject({
      intents: expect.arrayContaining(['profile', 'weekly_volume', 'compare_periods']),
      temporalReference: expect.objectContaining({
        timeZone: 'Europe/Paris',
        today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      userProfile: expect.objectContaining({
        pseudo: 'Alex',
        age: 34,
        targetWeight: 72,
        estimatedDailyCalories: 2400,
      }),
      activeGoals: expect.arrayContaining([
        expect.objectContaining({ id: 9, type: 'sessions_weekly', targetValue: 3, period: 'week', active: true }),
      ]),
      weightTracking: expect.objectContaining({
        history: expect.arrayContaining([expect.objectContaining({ weightKg: 73 })]),
      }),
      sportConnectionStatus: expect.objectContaining({
        provider: 'strava',
        connected: true,
        dataSynced: true,
      }),
      relevantSportsData: expect.objectContaining({
        currentWeek: expect.objectContaining({ summary: expect.objectContaining({ count: expect.any(Number) }) }),
        weekComparison: expect.objectContaining({ diff: expect.any(Object) }),
        records: expect.any(Object),
      }),
      dataLimits: expect.objectContaining({ maxRangeDays: 370, rawSecretsExcluded: true, activitiesAreSummarized: true }),
      dataConsulted: expect.arrayContaining(['profile_without_secrets', 'active_goals', 'strava_connection_status']),
    });
    expect(context).toHaveProperty('advancedAnalysis');
    expect(JSON.stringify(context)).not.toMatch(/decrypted-token|refresh|password|email/i);
  });

  test.each([
    ['Compare ma semaine avec la précédente.', ['current_week_volume', 'current_vs_previous_week'], ['currentWeek', 'weekComparison']],
    ['Analyse mes dernières sorties vélo.', ['recent_activities_30d', 'advanced_sports_analysis_skill'], ['recentActivities']],
    ['Quel est mon objectif actuel ?', ['active_goals'], []],
    ['Fais-moi un bilan de la semaine.', ['current_week_volume'], ['currentWeek']],
    ['Crée-moi un objectif réaliste.', ['active_goals'], []],
    ['Ma dernière sortie était-elle récente ?', ['recent_activities_30d'], ['recentActivities']],
  ])('valide le contexte unique pour le scénario métier "%s"', async (message, expectedDataUsed, expectedSportsBlocks) => {
    const { context, dataUsed } = await buildTargetedAgentContext(42, message);

    expect(dataUsed).toEqual(expect.arrayContaining(['profile_without_secrets', 'active_goals', 'strava_connection_status']));
    expect(dataUsed).toEqual(expect.arrayContaining(expectedDataUsed));
    expect(context).toMatchObject({
      temporalReference: expect.objectContaining({ timeZone: 'Europe/Paris' }),
      userProfile: expect.objectContaining({ pseudo: 'Alex' }),
      activeGoals: expect.any(Array),
      weightTracking: expect.any(Object),
      sportConnectionStatus: expect.objectContaining({ connected: true }),
      relevantSportsData: expect.any(Object),
      dataLimits: expect.objectContaining({ rawSecretsExcluded: true }),
      dataConsulted: expect.arrayContaining(expectedDataUsed),
    });
    expectedSportsBlocks.forEach(block => {
      expect(context.relevantSportsData).toHaveProperty(block);
    });
    expect(JSON.stringify(context)).not.toMatch(/decrypted-token|stravaAccessToken|stravaRefreshToken|access[_-]?token|refresh[_-]?token|password|email@|@example/i);
  });

  test('calcule les bornes de période en Europe/Paris même autour de minuit UTC', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T22:30:00Z')); // mercredi 15/07 00:30 à Paris

    const range = clampDateRange({ defaultDays: 1 });

    expect(range.from.toISOString()).toBe('2026-07-14T22:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-07-15T21:59:59.999Z');

    jest.useRealTimers();
  });

  test('prépare les actions mais exige une confirmation utilisateur', () => {
    const action = buildPendingAction('Crée un objectif réaliste', {
      intents: ['action_request', 'goals'],
      relevantSportsData: { currentWeek: { summary: { count: 2 } } },
      activeGoals: [{ type: 'sessions_weekly', targetValue: 3, period: 'week', active: true }],
    });

    expect(action).toMatchObject({
      type: 'create_goal',
      requiresConfirmation: true,
      payload: { type: 'sessions_weekly', targetValue: 3, period: 'week' },
      dataUsed: expect.arrayContaining(['current_week_volume', 'active_goals']),
    });
  });

  test('exécute une création d’objectif uniquement via executeConfirmedAction avec userId courant', async () => {
    Goal.create.mockResolvedValue({ id: 123, userId: 42, type: 'sessions_weekly' });

    const result = await executeConfirmedAction(42, {
      type: 'create_goal',
      payload: { type: 'sessions_weekly', sportType: null, targetValue: 4, period: 'week', ignored: 'x' },
    });

    expect(result.success).toBe(true);
    expect(Goal.create).toHaveBeenCalledWith({
      userId: 42,
      type: 'sessions_weekly',
      sportType: null,
      targetValue: 4,
      period: 'week',
      active: true,
    });
  });

  test('refuse les actions invalides et ne modifie rien', async () => {
    const result = await executeConfirmedAction(42, {
      type: 'create_goal',
      payload: { type: 'delete_everything', targetValue: 4, period: 'week' },
    });

    expect(result.success).toBe(false);
    expect(Goal.create).not.toHaveBeenCalled();
    expect(syncUserActivities).not.toHaveBeenCalled();
  });
});
