jest.mock('../models/Activity', () => ({ findAll: jest.fn() }));
jest.mock('../models/User', () => ({ findByPk: jest.fn() }));
jest.mock('../services/stravaSync', () => ({ syncUserActivities: jest.fn(), syncSince: jest.fn() }));
jest.mock('../services/userMetricsService', () => ({ resolveMaxHeartrate: jest.fn() }));
jest.mock('../services/dashboardCache', () => ({ getOrCompute: jest.fn((_key, _ttl, compute) => compute()), dashKey: jest.fn(() => 'swim-test'), DASHBOARD_TTL_SECONDS: 60 }));

const Activity = require('../models/Activity');
const User = require('../models/User');
const { resolveMaxHeartrate } = require('../services/userMetricsService');
const { buildAnalysis, getSwimmingWeeklyStats } = require('../services/stravaSwimming.service');
const { filterSwimmingActivities } = require('../utils/swimmingMetrics');
const period = { preset: 'CUSTOM', from: '2026-04-06', to: '2026-04-26' };
const row = { id: 'swim-1', type: 'Swim', startDate: '2026-04-14T12:00:00Z', distance: 1000, movingTime: 3600 };
function expectWeeks(weeks) {
  expect(weeks.map(w => w.weekStart)).toEqual(['2026-04-06', '2026-04-13', '2026-04-20']);
  expect(weeks.map(w => w.activityCount)).toEqual([0, 1, 0]);
}
describe('Natation service calendar period wiring', () => {
  beforeEach(() => jest.clearAllMocks());
  test('buildAnalysis transmet la période aux semaines et à la régularité', () => {
    const analysis = buildAnalysis(filterSwimmingActivities([row]), period, {}, { value: 190 });
    expectWeeks(analysis.weeklyStats);
    expect(analysis.regularity).toMatchObject({ totalWeeks: 3, activeWeeks: 1 });
    expect(analysis.trainingLoadRatios[0].previousAverage).toBeNull();
  });
  test('endpoint hebdomadaire interroge des mocks et respecte les semaines limites', async () => {
    User.findByPk.mockResolvedValue({ stravaAccessToken: 'mock' });
    Activity.findAll.mockResolvedValue([row]);
    resolveMaxHeartrate.mockResolvedValue({ value: 190 });
    expectWeeks(await getSwimmingWeeklyStats('mock-user', period));
    expect(Activity.findAll).toHaveBeenCalledTimes(1);
  });
});
