jest.mock('../models/User', () => ({ findByPk: jest.fn() }));
jest.mock('fs/promises', () => ({ readFile: jest.fn() }));
const User = require('../models/User');
const fs = require('fs/promises');
const ml = require('../services/personalMlService');
const original = { ...process.env };
afterEach(() => { process.env = { ...original }; jest.clearAllMocks(); });
test('disabled by default', async () => {
  delete process.env.ML_LOCAL_ENABLED;
  expect(await ml.personalModel(1)).toBeNull();
  expect(fs.readFile).not.toHaveBeenCalled();
});
test('other user cannot read artifacts', async () => {
  process.env.ML_LOCAL_ENABLED = 'true'; process.env.ML_OWNER_EMAIL = 'owner@example.test';
  User.findByPk.mockResolvedValue({ email: 'other@example.test' });
  expect(await ml.personalModel(2)).toBeNull();
  expect(fs.readFile).not.toHaveBeenCalled();
});
test('rejects path traversal in report version', async () => {
  process.env.ML_LOCAL_ENABLED = 'true'; process.env.ML_OWNER_EMAIL = 'owner@example.test';
  User.findByPk.mockResolvedValue({ email: 'owner@example.test' });
  fs.readFile.mockResolvedValue(JSON.stringify({ artifact_version: '../secret' }));
  await expect(ml.personalModel(1)).rejects.toThrow('Invalid local model version');
});
test('summary excludes per-ride predictions', () => {
  const result = ml.summary({ version: 'v', manifest: {}, report: {
    metrics: {}, intervals: { predictions: ['private'], evaluated_count: 0 }, significance: {},
  } });
  expect(JSON.stringify(result)).not.toContain('private');
  expect(ml.summary(null)).toEqual({ status: 'unavailable' });
});
