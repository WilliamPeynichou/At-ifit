jest.mock('../models/Activity', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
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

  test('construit un contexte ciblé scoped sur le userId connecté et sans token exposé', async () => {
    const { context, dataUsed } = await buildTargetedAgentContext(42, 'Compare ma semaine avec la précédente et mes records');

    expect(User.findByPk).toHaveBeenCalledWith(42, expect.objectContaining({ attributes: expect.any(Array) }));
    expect(Weight.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 }, limit: 10 }));
    expect(Goal.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42, active: true }, limit: 10 }));
    expect(Activity.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 42 }), limit: 500 }));
    expect(dataUsed).toEqual(expect.arrayContaining(['profile_without_secrets', 'current_week_volume', 'current_vs_previous_week', 'personal_records_summary']));
    expect(JSON.stringify(context)).not.toMatch(/decrypted-token|refresh|password/i);
    expect(context.limits).toMatchObject({ maxRangeDays: 370, rawSecretsExcluded: true, activitiesAreSummarized: true });
  });

  test('prépare les actions mais exige une confirmation utilisateur', () => {
    const action = buildPendingAction('Crée un objectif réaliste', {
      intents: ['action_request', 'goals'],
      currentWeek: { summary: { count: 2 } },
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
