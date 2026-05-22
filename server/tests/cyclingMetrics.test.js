const {
  normalizeStravaCyclingActivity,
  filterCyclingActivities,
  calculateWeeklyCyclingStats,
  calculateCyclingTrainingLoadRatio,
  calculateCyclingRegularityScore,
  detectCyclingPersonalBests,
  classifyRideType,
} = require('../utils/cyclingMetrics');
const {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatPower,
  formatPowerToWeight,
  formatElevation,
  formatPercentage,
} = require('../utils/cyclingFormatting');

const profile = {
  weightKg: 70,
  ftp: 250,
  estimatedMaxHeartRate: 190,
};

function ride(overrides = {}) {
  return {
    id: '1',
    type: 'Ride',
    name: 'Sortie test',
    distance: 50000,
    movingTime: 6000,
    elapsedTime: 6300,
    averageSpeed: 8.33,
    maxSpeed: 15,
    totalElevationGain: 500,
    averageHeartrate: 145,
    maxHeartrate: 175,
    averageWatts: 190,
    weightedAverageWatts: 210,
    maxWatts: 650,
    kilojoules: 1100,
    deviceWatts: true,
    averageCadence: 86,
    calories: 1200,
    startDate: '2026-04-06T08:00:00Z',
    ...overrides,
  };
}

describe('cycling metrics', () => {
  test('normalise une activité vélo et évite les divisions par zéro', () => {
    const activity = normalizeStravaCyclingActivity(ride({ distance: 0, movingTime: 0 }), profile);

    expect(activity.distanceKm).toBe(0);
    expect(activity.movingTimeMinutes).toBe(0);
    expect(activity.elevationPerKm).toBeNull();
    expect(activity.trainingLoad).toBe(0);
  });

  test('classifie les types de sorties', () => {
    expect(classifyRideType(ride({ type: 'Ride' }))).toBe('road');
    expect(classifyRideType(ride({ type: 'RoadRide' }))).toBe('road');
    expect(classifyRideType(ride({ type: 'GravelRide' }))).toBe('gravel');
    expect(classifyRideType(ride({ type: 'VirtualRide' }))).toBe('virtual');
    expect(classifyRideType(ride({ type: 'EBikeRide' }))).toBe('ebike');
  });

  test('filtre route/gravel par défaut et exclut virtuel/VAE', () => {
    const activities = filterCyclingActivities([
      ride({ id: 'road', type: 'Ride' }),
      ride({ id: 'gravel', type: 'GravelRide' }),
      ride({ id: 'virtual', type: 'VirtualRide' }),
      ride({ id: 'ebike', type: 'EBikeRide' }),
      ride({ id: 'run', type: 'Run' }),
    ], {}, profile);

    expect(activities.map(a => a.id)).toEqual(['road', 'gravel']);
  });

  test('inclut virtuel et VAE uniquement sur option explicite', () => {
    const activities = filterCyclingActivities([
      ride({ id: 'road', type: 'Ride' }),
      ride({ id: 'virtual', type: 'VirtualRide' }),
      ride({ id: 'ebike', type: 'EBikeRide' }),
    ], { includeVirtual: true, includeEbike: true }, profile);

    expect(activities.map(a => a.id)).toEqual(['road', 'virtual', 'ebike']);
  });

  test('calcule les statistiques hebdomadaires', () => {
    const activities = filterCyclingActivities([
      ride({ id: '1', startDate: '2026-04-06T08:00:00Z', distance: 50000, movingTime: 6000, totalElevationGain: 500 }),
      ride({ id: '2', startDate: '2026-04-08T08:00:00Z', distance: 30000, movingTime: 3600, totalElevationGain: 100, averageWatts: null, weightedAverageWatts: null }),
      ride({ id: '3', startDate: '2026-04-14T08:00:00Z', distance: 70000, movingTime: 9000, totalElevationGain: 900 }),
    ], {}, profile);

    const weeks = calculateWeeklyCyclingStats(activities);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({
      weekStart: '2026-04-06',
      totalDistanceKm: 80,
      activityCount: 2,
      elevationGain: 600,
      longestRideDistanceKm: 50,
    });
  });

  test('calcule ratio de charge, régularité et records calculables', () => {
    const ratios = calculateCyclingTrainingLoadRatio([
      { weekStart: '2026-01-05', label: 'S1', trainingLoad: 100 },
      { weekStart: '2026-01-12', label: 'S2', trainingLoad: 100 },
      { weekStart: '2026-01-19', label: 'S3', trainingLoad: 100 },
      { weekStart: '2026-01-26', label: 'S4', trainingLoad: 100 },
      { weekStart: '2026-02-02', label: 'S5', trainingLoad: 160 },
    ]);
    expect(ratios[4].ratio).toBe(1.6);
    expect(ratios[4].status).toBe('risque de surcharge');

    const activities = filterCyclingActivities([
      ride({ id: '1', startDate: '2026-04-06T08:00:00Z', distance: 50000 }),
      ride({ id: '2', startDate: '2026-04-08T08:00:00Z', distance: 80000 }),
      ride({ id: '3', startDate: '2026-04-13T08:00:00Z', distance: 90000 }),
      ride({ id: '4', startDate: '2026-04-15T08:00:00Z', distance: 40000 }),
    ], {}, profile);
    const weekly = calculateWeeklyCyclingStats(activities);
    const regularity = calculateCyclingRegularityScore(activities);
    const records = detectCyclingPersonalBests(activities, weekly);

    expect(regularity.regularityScore).toBe(1);
    expect(records.longestDistance.distanceKm).toBe(90);
    expect(records.streamRecordsAvailable).toBe(false);
  });

  test('formatte les métriques vélo', () => {
    expect(formatDistance(42.195)).toBe('42,2 km');
    expect(formatDuration(75)).toBe('1h15');
    expect(formatSpeed(28.4)).toBe('28,4 km/h');
    expect(formatPower(250.4)).toBe('250 W');
    expect(formatPowerToWeight(3.571)).toBe('3,57 W/kg');
    expect(formatElevation(1234.4)).toBe('1 234 m');
    expect(formatPercentage(0.123)).toBe('+12,3 %');
  });
});
