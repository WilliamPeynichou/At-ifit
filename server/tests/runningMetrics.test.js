const {
  normalizeStravaActivity,
  filterRunningActivities,
  calculateWeeklyStats,
  calculateTrainingLoadRatio,
  calculateRegularityScore,
  detectPersonalBests,
} = require('../utils/runningMetrics');
const {
  formatPace,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatPercent,
} = require('../utils/runningFormatting');

function run(overrides = {}) {
  return {
    id: '1',
    type: 'Run',
    name: 'Course test',
    distance: 10000,
    movingTime: 3000,
    elapsedTime: 3100,
    averageSpeed: 3.33,
    maxSpeed: 5,
    totalElevationGain: 80,
    averageHeartrate: 150,
    maxHeartrate: 175,
    calories: 650,
    sufferScore: 70,
    averageCadence: 82,
    startDate: '2026-04-06T08:00:00Z',
    ...overrides,
  };
}

describe('running metrics', () => {
  test('normalise une activité Strava sans diviser par zéro', () => {
    const activity = normalizeStravaActivity(run({ distance: 0, movingTime: 0 }));

    expect(activity.distanceKm).toBe(0);
    expect(activity.movingTimeMinutes).toBe(0);
    expect(activity.averagePaceMinKm).toBeNull();
    expect(activity.trainingLoad).toBe(0);
  });

  test('filtre uniquement les activités running et variantes pertinentes', () => {
    const activities = filterRunningActivities([
      run({ id: 'run', type: 'Run' }),
      run({ id: 'trail', type: 'Other', raw: { id: 'trail', sport_type: 'TrailRun', type: 'Run', start_date: '2026-04-07T08:00:00Z', distance: 8000, moving_time: 2800 } }),
      run({ id: 'ride', type: 'Ride' }),
      run({ id: 'walk', type: 'Walk' }),
      run({ id: 'hike', type: 'Hike' }),
    ]);

    expect(activities).toHaveLength(2);
    expect(activities.map(a => a.id)).toEqual(['run', 'trail']);
  });

  test('calcule les stats hebdomadaires attendues', () => {
    const activities = filterRunningActivities([
      run({ id: '1', startDate: '2026-04-06T08:00:00Z', distance: 10000, movingTime: 3000 }),
      run({ id: '2', startDate: '2026-04-08T08:00:00Z', distance: 5000, movingTime: 1800, averageHeartrate: null }),
      run({ id: '3', startDate: '2026-04-14T08:00:00Z', distance: 12000, movingTime: 4200 }),
    ]);

    const weeks = calculateWeeklyStats(activities);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({
      weekStart: '2026-04-06',
      totalDistanceKm: 15,
      activityCount: 2,
      totalElevationGain: 160,
    });
    expect(Math.round(weeks[0].averagePaceMinKm * 60)).toBe(320);
  });

  test('calcule le ratio de charge sur la moyenne des 4 semaines précédentes', () => {
    const ratios = calculateTrainingLoadRatio([
      { weekStart: '2026-01-05', label: 'S1', trainingLoad: 100 },
      { weekStart: '2026-01-12', label: 'S2', trainingLoad: 100 },
      { weekStart: '2026-01-19', label: 'S3', trainingLoad: 100 },
      { weekStart: '2026-01-26', label: 'S4', trainingLoad: 100 },
      { weekStart: '2026-02-02', label: 'S5', trainingLoad: 160 },
    ]);

    expect(ratios[4].ratio).toBe(1.6);
    expect(ratios[4].status).toBe('risque de surcharge');
  });

  test('calcule la régularité et les records calculables sans splits', () => {
    const activities = filterRunningActivities([
      run({ id: '1', startDate: '2026-04-06T08:00:00Z', distance: 10000, movingTime: 3000 }),
      run({ id: '2', startDate: '2026-04-08T08:00:00Z', distance: 5000, movingTime: 1800 }),
      run({ id: '3', startDate: '2026-04-13T08:00:00Z', distance: 15000, movingTime: 5400 }),
      run({ id: '4', startDate: '2026-04-15T08:00:00Z', distance: 7000, movingTime: 2500 }),
    ]);
    const weekly = calculateWeeklyStats(activities);
    const regularity = calculateRegularityScore(activities);
    const records = detectPersonalBests(activities, weekly);

    expect(regularity.regularityScore).toBe(1);
    expect(records.longestDistance.distanceKm).toBe(15);
    expect(records.splitRecordsAvailable).toBe(false);
  });

  test('formatte les métriques running', () => {
    expect(formatPace(5.56)).toBe('5:34/km');
    expect(formatDuration(75)).toBe('1h15');
    expect(formatDistance(10.234)).toBe('10,23 km');
    expect(formatSpeed(12.4)).toBe('12,4 km/h');
    expect(formatPercent(0.123)).toBe('+12,3 %');
  });
});
