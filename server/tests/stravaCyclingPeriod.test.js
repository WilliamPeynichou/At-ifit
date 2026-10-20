jest.mock('../models/Activity', () => ({ findAll: jest.fn() }));
jest.mock('../models/User', () => ({ findByPk: jest.fn() }));
jest.mock('../services/stravaSync', () => ({ syncUserActivities: jest.fn(), syncSince: jest.fn() }));
jest.mock('../services/userMetricsService', () => ({ resolveMaxHeartrate: jest.fn() }));
jest.mock('../services/cyclingProfileService', () => ({ getCyclingProfile: jest.fn() }));
jest.mock('../services/dashboardCache', () => ({ getOrCompute: jest.fn((_key, _ttl, compute) => compute()), dashKey: jest.fn(() => 'cycling-test'), DASHBOARD_TTL_SECONDS: 60 }));
const Activity = require('../models/Activity');
const User = require('../models/User');
const { resolveMaxHeartrate } = require('../services/userMetricsService');
const { getCyclingProfile } = require('../services/cyclingProfileService');
const { buildAnalysis, getCyclingWeeklyStats } = require('../services/stravaCycling.service');
const { filterCyclingActivities } = require('../utils/cyclingMetrics');
const period = { preset: 'CUSTOM', from: '2026-04-06', to: '2026-04-26' };
const row = { id: 'ride-1', type: 'Ride', startDate: '2026-04-14T12:00:00Z', distance: 42000, movingTime: 5400 };
const options = { includeGravel: true, includeVirtual: false, includeEbike: false };
const expectWeeks = weeks => {
  expect(weeks.map(w => w.weekStart)).toEqual(['2026-04-06', '2026-04-13', '2026-04-20']);
  expect(weeks.map(w => w.activityCount)).toEqual([0, 1, 0]);
};
describe('Cycling service period wiring', () => {
  beforeEach(() => jest.clearAllMocks());
  test('analysis includes empty boundary weeks and regularity period', () => {
    const analysis = buildAnalysis(filterCyclingActivities([row], options, {}), period, {}, {}, options);
    expectWeeks(analysis.weeklyStats);
    expect(analysis.regularity.totalWeeks).toBe(3);
  });
  test('weekly endpoint forwards selected period', async () => {
    User.findByPk.mockResolvedValue({ stravaAccessToken: 'test' });
    Activity.findAll.mockResolvedValue([row]);
    resolveMaxHeartrate.mockResolvedValue({ value: 190 });
    getCyclingProfile.mockResolvedValue({});
    expectWeeks(await getCyclingWeeklyStats('test-user', period));
  });
  test('empty period retains three zero weeks', () => {
    const analysis = buildAnalysis([], period, {}, {}, options);
    expect(analysis.weeklyStats).toHaveLength(3);
    expect(analysis.weeklyStats.every(w => w.activityCount === 0)).toBe(true);
  });
});
