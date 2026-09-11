jest.mock('../models/Activity', () => ({ findOne: jest.fn() }));
jest.mock('../models/User', () => ({ findByPk: jest.fn() }));

const Activity = require('../models/Activity');
const User = require('../models/User');
const {
  resolveMaxHeartrate,
  resolveHrLimits,
} = require('../services/userMetricsService');

describe('userMetricsService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('priorise la FC max saisie par l’athlète', async () => {
    User.findByPk.mockResolvedValue({ maxHeartrate: 168, age: 55 });

    await expect(resolveMaxHeartrate(1)).resolves.toEqual({
      value: 168,
      source: 'user_input',
      confidence: 'high',
    });
    expect(Activity.findOne).not.toHaveBeenCalled();
  });

  test('conserve une FC max observée inférieure à 180 sans plancher', async () => {
    User.findByPk.mockResolvedValue({ maxHeartrate: null, age: 55 });
    Activity.findOne.mockResolvedValue({ maxHr: 169 });

    await expect(resolveMaxHeartrate(1)).resolves.toEqual({
      value: 169,
      source: 'observed_max',
      confidence: 'medium',
    });
  });

  test('utilise Tanaka quand aucune observation fiable n’existe', async () => {
    User.findByPk.mockResolvedValue({ maxHeartrate: null, age: 40 });
    Activity.findOne.mockResolvedValue({ maxHr: 130 });

    await expect(resolveMaxHeartrate(1)).resolves.toEqual({
      value: 180,
      source: 'tanaka_formula',
      confidence: 'medium',
    });
  });

  test('ignore des overrides hors plage', async () => {
    User.findByPk
      .mockResolvedValueOnce({ maxHeartrate: 175, age: 45 })
      .mockResolvedValueOnce({ restHeartrate: 55 });

    const limits = await resolveHrLimits(1, { hrMax: 999, hrRest: -1 });
    expect(limits).toMatchObject({
      hrMax: 175,
      hrRest: 55,
      hrMaxSource: 'user_input',
      hrRestSource: 'user_input',
    });
  });
});
