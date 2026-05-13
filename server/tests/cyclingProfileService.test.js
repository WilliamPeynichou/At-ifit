jest.mock('../models/Activity', () => ({}));
jest.mock('../models/ActivityStream', () => ({}));
jest.mock('../models/User', () => ({}));
jest.mock('../models/Weight', () => ({}));
jest.mock('../services/trainingLoadService', () => ({ getTrainingLoad: jest.fn() }));
jest.mock('../services/stravaAnalytics', () => ({ getPowerCurve: jest.fn(), activityLoad: jest.fn() }));
jest.mock('../services/userMetricsService', () => ({
  resolveMaxHeartrate: jest.fn(),
  resolveHrLimits: jest.fn(),
}));

const {
  bestAveragePower,
  buildPowerZones,
  calculateZoneDurations,
  classifyCyclist,
  median,
} = require('../services/cyclingProfileService');

describe('cyclingProfileService helpers', () => {
  test('classifie le niveau Coggan depuis les W/kg', () => {
    expect(classifyCyclist(1.9)).toBe('Untrained');
    expect(classifyCyclist(2.4)).toBe('Recreational');
    expect(classifyCyclist(3.3)).toBe('Cat 4');
    expect(classifyCyclist(4.8)).toBe('Cat 2');
    expect(classifyCyclist(6.0)).toBe('World Class');
  });

  test('calcule la mediane des watts moyens recents', () => {
    expect(median([122, 95, 110, 130, 118])).toBe(118);
    expect(median([100, 120, 140, 160])).toBe(130);
    expect(median([])).toBeNull();
  });

  test('construit les zones Coggan en watts depuis la FTP (bornes contiguës)', () => {
    const zones = buildPowerZones(300);
    expect(zones).toHaveLength(7);
    expect(zones[0]).toMatchObject({ zone: 'Z1', minWatts: 0, maxWatts: 165 });
    expect(zones[3]).toMatchObject({ zone: 'Z4', minWatts: 273, maxWatts: 318 });
    expect(zones[6]).toMatchObject({ zone: 'Z7', minWatts: 453, maxWatts: null });
  });

  test('calcule la meilleure puissance moyenne sur une duree cible', () => {
    const watts = [100, 110, 250, 260, 270, 120];
    const time = [0, 1, 2, 3, 4, 5];
    expect(Math.round(bestAveragePower(watts, time, 2))).toBe(260);
  });

  test('repartit le temps dans les zones de puissance', () => {
    const zones = buildPowerZones(200);
    const watts = [80, 120, 150, 190, 230, 330];
    const time = [0, 10, 20, 30, 40, 50];
    const durations = calculateZoneDurations(watts, time, zones);

    expect(durations.reduce((sum, zone) => sum + zone.seconds, 0)).toBe(50);
    expect(durations.find(zone => zone.key === 'z2').seconds).toBe(20);
    expect(durations.find(zone => zone.key === 'z4').seconds).toBe(10);
    expect(durations.find(zone => zone.key === 'z7').seconds).toBe(10);
  });

  test('aucun gap entre zones — watts à la frontière sont classés', () => {
    // Frontières historiquement problématiques (FTP=300, ancien code) : 226-227, 271-272, 316-317, 361-362
    const zones = buildPowerZones(300);
    const watts = [0, 226, 271, 316, 361];
    const time = [0, 10, 20, 30, 40];
    const durations = calculateZoneDurations(watts, time, zones);

    // Avec les bornes contiguës, chaque intervalle de 10 s tombe dans une zone (aucun gap).
    const totalSeconds = durations.reduce((sum, zone) => sum + zone.seconds, 0);
    expect(totalSeconds).toBe(40);
    expect(durations.find(z => z.key === 'z2').seconds).toBe(10);
    expect(durations.find(z => z.key === 'z3').seconds).toBe(10);
    expect(durations.find(z => z.key === 'z4').seconds).toBe(10);
    expect(durations.find(z => z.key === 'z5').seconds).toBe(10);
  });
});
