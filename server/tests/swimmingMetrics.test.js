const {
  normalizeStravaSwimmingActivity,
  filterSwimmingActivities,
  calculateWeeklySwimStats,
  calculateSwimTrainingLoadRatio,
  calculateSwimmingRegularityScore,
  detectSwimmingPersonalBests,
  classifySwimType,
} = require('../utils/swimmingMetrics');
const {
  formatSwimPace,
  formatDuration,
  formatDistanceMeters,
  formatDistanceKm,
  formatSpeed,
  formatHeartRate,
  formatCalories,
  formatPercentage,
} = require('../utils/swimmingFormatting');

function swim(overrides = {}) {
  return {
    id: '1',
    type: 'Swim',
    name: 'Natation test',
    distance: 1000,
    movingTime: 1250,
    elapsedTime: 1300,
    averageSpeed: 0.8,
    maxSpeed: 1.1,
    averageHeartrate: 135,
    maxHeartrate: 160,
    calories: 300,
    sufferScore: 45,
    averageCadence: 28,
    startDate: '2026-04-06T08:00:00Z',
    ...overrides,
  };
}

describe('swimming metrics', () => {
  test('normalise une activité natation et évite les divisions par zéro', () => {
    const activity = normalizeStravaSwimmingActivity(swim({ distance: 0, movingTime: 0 }));

    expect(activity.distanceMeters).toBe(0);
    expect(activity.distanceKm).toBe(0);
    expect(activity.averagePaceMinPer100m).toBeNull();
    expect(activity.trainingLoad).toBe(0);
  });

  test('filtre uniquement les activités de natation', () => {
    const activities = filterSwimmingActivities([
      swim({ id: 'swim', type: 'Swim' }),
      swim({ id: 'pool', type: 'PoolSwim' }),
      swim({ id: 'open', type: 'OpenWaterSwim' }),
      swim({ id: 'ride', type: 'Ride' }),
      swim({ id: 'run', type: 'Run' }),
    ]);

    expect(activities).toHaveLength(3);
    expect(activities.map(a => a.id)).toEqual(['swim', 'pool', 'open']);
  });

  test('classifie piscine, eau libre et inconnu avec prudence', () => {
    expect(classifySwimType(swim({ type: 'PoolSwim' }))).toBe('pool');
    expect(classifySwimType(swim({ type: 'OpenWaterSwim' }))).toBe('open_water');
    expect(classifySwimType(swim({ type: 'Swim', name: 'Session piscine' }))).toBe('pool');
    expect(classifySwimType(swim({ type: 'Swim', name: 'Natation' }))).toBe('unknown');
  });

  test('calcule les stats hebdomadaires', () => {
    const activities = filterSwimmingActivities([
      swim({ id: '1', startDate: '2026-04-06T08:00:00Z', distance: 1000, movingTime: 1250 }),
      swim({ id: '2', startDate: '2026-04-08T08:00:00Z', distance: 1500, movingTime: 2100, averageHeartrate: null }),
      swim({ id: '3', startDate: '2026-04-14T08:00:00Z', distance: 2000, movingTime: 2800 }),
    ]);

    const weeks = calculateWeeklySwimStats(activities);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({
      weekStart: '2026-04-06',
      totalDistanceMeters: 2500,
      totalDistanceKm: 2.5,
      activityCount: 2,
      longestSwimDistanceMeters: 1500,
    });
  });

  test('calcule ratio de charge, régularité et records', () => {
    const ratios = calculateSwimTrainingLoadRatio([
      { weekStart: '2026-01-05', label: 'S1', trainingLoad: 80 },
      { weekStart: '2026-01-12', label: 'S2', trainingLoad: 80 },
      { weekStart: '2026-01-19', label: 'S3', trainingLoad: 80 },
      { weekStart: '2026-01-26', label: 'S4', trainingLoad: 80 },
      { weekStart: '2026-02-02', label: 'S5', trainingLoad: 130 },
    ]);
    expect(ratios[4].ratio).toBe(1.63);
    expect(ratios[4].status).toBe('risque de surcharge');

    const activities = filterSwimmingActivities([
      swim({ id: '1', startDate: '2026-04-06T08:00:00Z', distance: 1000 }),
      swim({ id: '2', startDate: '2026-04-08T08:00:00Z', distance: 1800 }),
      swim({ id: '3', startDate: '2026-04-13T08:00:00Z', distance: 2200 }),
      swim({ id: '4', startDate: '2026-04-15T08:00:00Z', distance: 800 }),
    ]);
    const weekly = calculateWeeklySwimStats(activities);
    const regularity = calculateSwimmingRegularityScore(activities);
    const records = detectSwimmingPersonalBests(activities, weekly);

    expect(regularity.regularityScore).toBe(1);
    expect(records.longestDistance.distanceMeters).toBe(2200);
    expect(records.splitRecordsAvailable).toBe(false);
  });

  test('formatte les métriques natation', () => {
    expect(formatSwimPace(2.083)).toBe('2:05/100m');
    expect(formatDuration(75)).toBe('1h15');
    expect(formatDistanceMeters(4200)).toBe('4 200 m');
    expect(formatDistanceKm(4.2)).toBe('4,20 km');
    expect(formatSpeed(2.9)).toBe('2,9 km/h');
    expect(formatHeartRate(135.4)).toBe('135 bpm');
    expect(formatCalories(301.4)).toBe('301 kcal');
    expect(formatPercentage(0.123)).toBe('+12,3 %');
  });
});
