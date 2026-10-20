jest.mock('../models/Activity', () => ({ findAll: jest.fn() }));
jest.mock('../models/User', () => ({ findByPk: jest.fn() }));
jest.mock('../services/stravaSync', () => ({ syncUserActivities: jest.fn(), syncSince: jest.fn() }));
jest.mock('../services/userMetricsService', () => ({ resolveMaxHeartrate: jest.fn() }));
jest.mock('../services/dashboardCache', () => ({
  getOrCompute: jest.fn((_key, _ttl, compute) => compute()),
  dashKey: jest.fn(() => 'running-test'),
  DASHBOARD_TTL_SECONDS: 60,
}));

const Activity = require('../models/Activity');
const User = require('../models/User');
const { resolveMaxHeartrate } = require('../services/userMetricsService');
const { buildAnalysis, getRunningWeeklyStats } = require('../services/stravaRunning.service');
const { filterRunningActivities } = require('../utils/runningMetrics');

const period = { preset: 'CUSTOM', from: '2026-04-06', to: '2026-04-26' };
const row = { id: 'run-1', type: 'Run', startDate: '2026-04-14T12:00:00Z', distance: 10000, movingTime: 3600 };

function expectCalendarWeeks(weeks) {
  expect(weeks.map(w => w.weekStart)).toEqual(['2026-04-06', '2026-04-13', '2026-04-20']);
  expect(weeks.map(w => w.activityCount)).toEqual([0, 1, 0]);
}

describe('Running service calendar period wiring', () => {
  beforeEach(() => jest.clearAllMocks());

  test('analysis preserves empty weeks at both period boundaries', () => {
    const analysis = buildAnalysis(filterRunningActivities([row]), period, {}, { value: 190 });
    expectCalendarWeeks(analysis.weeklyStats);
  });

  test('weekly endpoint forwards the requested period', async () => {
    User.findByPk.mockResolvedValue({ stravaAccessToken: 'test-token' });
    Activity.findAll.mockResolvedValue([row]);
    resolveMaxHeartrate.mockResolvedValue({ value: 190 });
    const weeks = await getRunningWeeklyStats('user-test', period);
    expectCalendarWeeks(weeks);
  });

  test('analysis returns zero weeks across an empty selected period', () => {
    const analysis = buildAnalysis([], period, {}, { value: 190 });
    expect(analysis.weeklyStats).toHaveLength(3);
    expect(analysis.weeklyStats.every(w => w.activityCount === 0)).toBe(true);
  });
});
