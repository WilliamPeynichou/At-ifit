jest.mock('../models/Activity', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
}));

jest.mock('../models/ActivityStream', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  logAuditEvent: jest.fn().mockResolvedValue({ id: 1 }),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const { logAuditEvent } = require('../services/auditService');
const {
  assessClarificationNeed,
  buildAdvancedSportsAnalysisContext,
  summarizeLargeActivitySet,
  summarizeActivityStreams,
  getMedicalSafetyGuidance,
  detectPeriodFromMessage,
} = require('../services/advancedSportsAnalysisSkill');

const user42Activities = [
  {
    id: 101,
    userId: 42,
    stravaId: 9001,
    type: 'Ride',
    name: 'Sortie endurance ancienne',
    startDate: new Date('2025-01-15T08:00:00Z'),
    distance: 42000,
    movingTime: 5400,
    elapsedTime: 5700,
    totalElevationGain: 520,
    calories: 1280,
    averageHeartrate: 142,
    maxHeartrate: 174,
    averageSpeed: 7.78,
    maxSpeed: 15.5,
    averageWatts: 205,
    maxWatts: 612,
    weightedAverageWatts: 218,
    averageCadence: 86,
    sufferScore: 82,
    gearId: 'bike-1',
    detailFetchedAt: new Date('2025-01-16T08:00:00Z'),
    streamFetchedAt: new Date('2025-01-16T08:05:00Z'),
    raw: { access_token: 'must-not-leak', private_note: 'raw payload' },
  },
  {
    id: 102,
    userId: 42,
    stravaId: 9002,
    type: 'Ride',
    name: 'Sortie sans streams',
    startDate: new Date('2025-02-01T08:00:00Z'),
    distance: 30000,
    movingTime: 3900,
    elapsedTime: 4000,
    totalElevationGain: 220,
    calories: null,
    averageHeartrate: null,
    maxHeartrate: null,
    averageSpeed: 7.69,
    maxSpeed: 13.2,
    averageWatts: 188,
    maxWatts: 502,
    weightedAverageWatts: null,
    averageCadence: 82,
    sufferScore: null,
    gearId: null,
    detailFetchedAt: null,
    streamFetchedAt: null,
    raw: { refreshToken: 'must-not-leak' },
  },
];

const streamFor101 = {
  activityId: 101,
  stravaId: 9001,
  time: [0, 60, 120, 180, 240, 300],
  distance: [0, 450, 930, 1410, 1880, 2350],
  heartrate: [120, 132, 141, 148, 151, 156],
  watts: [110, 190, 220, 260, 245, 230],
  cadence: [75, 84, 88, 91, 89, 87],
  velocitySmooth: [6.8, 7.5, 8.0, 8.0, 7.8, 7.6],
  altitude: [100, 105, 115, 122, 121, 119],
  moving: [true, true, true, true, true, true],
  resolution: 'medium',
};

describe('advancedSportsAnalysisSkill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Activity.findAll.mockResolvedValue(user42Activities);
    Activity.findOne.mockResolvedValue(user42Activities[0]);
    Activity.count.mockResolvedValue(2);
    ActivityStream.findAll.mockResolvedValue([streamFor101]);
    ActivityStream.findOne.mockResolvedValue(streamFor101);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('demande des précisions quand la demande sportive est vague', () => {
    const decision = assessClarificationNeed('Analyse mes sorties');

    expect(decision).toMatchObject({ needsClarification: true });
    expect(decision.questions.join(' ')).toMatch(/période|periode/i);
    expect(decision.questions.join(' ')).toMatch(/sport|vélo|course|activités/i);
    expect(decision.questions.join(' ')).toMatch(/objectif|performance|fatigue|progression/i);
  });

  test('ne demande pas de clarification inutile quand période, sport et objectif sont clairs', () => {
    const decision = assessClarificationNeed('Analyse mes sorties vélo des trois derniers mois et dis-moi si je progresse en endurance');

    expect(decision.needsClarification).toBe(false);
    expect(decision.missing).not.toEqual(expect.arrayContaining(['period', 'sport', 'objective']));
  });

  test('détecte les périodes relatives avec les bornes Europe/Paris autour de minuit', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T22:30:00Z')); // mercredi 15/07 00:30 à Paris

    const week = detectPeriodFromMessage('Analyse cette semaine');
    const month = detectPeriodFromMessage('Analyse ce mois');

    expect(week.from.toISOString()).toBe('2026-07-12T22:00:00.000Z');
    expect(week.to.toISOString()).toBe('2026-07-14T22:30:00.000Z');
    expect(month.from.toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(month.to.toISOString()).toBe('2026-07-14T22:30:00.000Z');
  });

  test('limite l’accès aux données de l’utilisateur connecté et accepte une période ancienne explicite', async () => {
    const result = await buildAdvancedSportsAnalysisContext(42, {
      message: 'Analyse mes sorties vélo de janvier à février 2025',
      period: { from: '2025-01-01', to: '2025-02-28' },
      sportType: 'Ride',
      objective: 'progression endurance',
      includeStreams: false,
    });

    expect(Activity.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42, type: 'Ride' }),
      order: expect.any(Array),
    }));
    expect(JSON.stringify(Activity.findAll.mock.calls[0][0].where)).toMatch(/2025/);
    expect(JSON.stringify(result.context)).toMatch(/Sortie endurance ancienne/);
    expect(JSON.stringify(result.context)).not.toMatch(/userId[^\n]*43|must-not-leak|access_token|refreshToken|password|secret/i);
  });

  test('expose les métriques cardio, vitesse/allure, cadence et puissance quand elles existent', async () => {
    const { context, dataUsed } = await buildAdvancedSportsAnalysisContext(42, {
      message: 'Analyse mes sorties vélo 2025 avec cardio, allure, puissance et cadence',
      period: { from: '2025-01-01', to: '2025-12-31' },
      sportType: 'Ride',
      objective: 'performance',
      includeStreams: false,
    });

    expect(dataUsed).toEqual(expect.arrayContaining([
      'advanced_sports_activities',
      'heartrate_metrics',
      'speed_pace_metrics',
      'power_metrics',
      'cadence_metrics',
    ]));
    expect(context.summary).toMatchObject({
      count: 2,
      distanceKm: 72,
      missing: expect.objectContaining({ heartrate: 1, calories: 1, streams: 1 }),
    });
    expect(context.activities[0]).toMatchObject({
      averageHeartrate: 142,
      maxHeartrate: 174,
      averageSpeedKmh: expect.any(Number),
      pacePerKm: expect.any(String),
      averageWatts: 205,
      maxWatts: 612,
      averageCadence: 86,
      effortScore: 82,
    });
  });

  test('utilise les streams pertinents quand ils existent et signale explicitement leur absence', async () => {
    const { context, dataUsed } = await buildAdvancedSportsAnalysisContext(42, {
      message: 'Regarde ma dernière sortie en détail avec les streams',
      period: { from: '2025-01-01', to: '2025-12-31' },
      sportType: 'Ride',
      objective: 'analyse détaillée',
      includeStreams: true,
      maxDetailedActivities: 2,
    });

    expect(ActivityStream.findAll).toHaveBeenCalled();
    expect(dataUsed).toEqual(expect.arrayContaining(['activity_streams_summary']));
    expect(context.streams).toEqual(expect.arrayContaining([
      expect.objectContaining({
        activityId: 101,
        available: true,
        streamsUsed: expect.arrayContaining(['heartrate', 'watts', 'cadence', 'velocitySmooth', 'altitude', 'distance']),
        heartRate: expect.objectContaining({ min: 120, max: 156 }),
        power: expect.objectContaining({ max: 260 }),
      }),
      expect.objectContaining({ activityId: 102, available: false, limitation: expect.stringMatching(/stream/i) }),
    ]));
  });

  test('résume les gros volumes sans injecter toutes les données brutes', () => {
    const manyActivities = Array.from({ length: 650 }, (_, index) => ({
      id: index + 1,
      type: index % 2 ? 'Run' : 'Ride',
      distance: 10000 + index,
      movingTime: 3600,
      totalElevationGain: index % 100,
      averageHeartrate: index % 3 === 0 ? null : 140,
      averageWatts: index % 2 ? null : 210,
      averageCadence: 85,
      startDate: new Date(2025, index % 12, 1 + (index % 27)),
      raw: { token: `secret-${index}`, huge: 'x'.repeat(1000) },
    }));

    const summary = summarizeLargeActivitySet(manyActivities, { maxActivitiesForAI: 30 });

    expect(summary.totalActivities).toBe(650);
    expect(summary.activitiesSample.length).toBeLessThanOrEqual(30);
    expect(summary.periodBuckets.length).toBeGreaterThan(1);
    expect(summary.trends).toBeDefined();
    expect(JSON.stringify(summary)).not.toMatch(/secret-1|"raw"|token/i);
  });

  test('journalise l’utilisation du skill sans données brutes ni secrets', async () => {
    await buildAdvancedSportsAnalysisContext(42, {
      message: 'Analyse mes sorties vélo de janvier 2025 avec les streams',
      period: { from: '2025-01-01', to: '2025-01-31' },
      sportType: 'Ride',
      objective: 'progression',
      includeStreams: true,
    });

    expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      actorUserId: 42,
      eventType: 'advanced_sports_analysis_skill_used',
      category: 'ai',
      metadata: expect.objectContaining({
        dataCategories: expect.arrayContaining(['activities']),
        period: { from: '2025-01-01', to: '2025-01-31' },
        sportType: 'Ride',
        streamsUsed: true,
      }),
    }));
    expect(JSON.stringify(logAuditEvent.mock.calls[0][0])).not.toMatch(/must-not-leak|access_token|refreshToken|raw/i);
  });

  test('résume un stream en métriques utiles plutôt qu’en données brutes complètes', () => {
    const streamSummary = summarizeActivityStreams(streamFor101, { maxPointsForAI: 3 });

    expect(streamSummary).toMatchObject({
      available: true,
      streamsUsed: expect.arrayContaining(['heartrate', 'watts', 'cadence']),
      heartRate: expect.objectContaining({ min: 120, max: 156, average: expect.any(Number) }),
      speed: expect.objectContaining({ maxKmh: expect.any(Number) }),
      altitude: expect.objectContaining({ min: 100, max: 122 }),
    });
    expect(streamSummary.sampledPoints.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(streamSummary)).not.toContain(JSON.stringify(streamFor101.time));
  });

  test('reste prudent sur les sujets médicaux et ne produit pas de diagnostic', () => {
    const guidance = getMedicalSafetyGuidance('Pourquoi mon cardio est très haut et j’ai une douleur thoracique ?');

    expect(guidance.requiresCaution).toBe(true);
    expect(guidance.message).toMatch(/pas.*diagnostic|diagnostic médical/i);
    expect(guidance.message).toMatch(/professionnel de santé|médecin|urgence/i);
  });
});
