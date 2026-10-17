jest.mock('../models/Activity', () => ({ findAll: jest.fn(), update: jest.fn() }));
jest.mock('../models/ActivityStream', () => ({ findAll: jest.fn() }));
jest.mock('../models/Weight', () => ({ findAll: jest.fn() }));
jest.mock('../models/User', () => ({}));
jest.mock('../database', () => ({ authenticate: jest.fn(), close: jest.fn() }));
jest.mock('../services/trainingLoadService', () => ({ getTrainingLoad: jest.fn() }));
jest.mock('../services/userMetricsService', () => ({
  resolveMaxHeartrate: jest.fn(),
  resolveHrLimits: jest.fn(),
}));

const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const Weight = require('../models/Weight');
const {
  computeMeanMaxPower,
  bestAveragePower,
  computeActivityPowerBests,
} = require('../utils/powerBests');
const { getPowerCurve, computeMeanMaxPower: reExportedMmp } = require('../services/stravaAnalytics');
const { getCyclingProgress, bestAveragePower: reExportedBest } = require('../services/cyclingProfileService');
const { backfillPowerBests } = require('../scripts/backfillPowerBests');

// Générateur déterministe (LCG) : fixtures reproductibles sans dépendance aléatoire
function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Stream de 4000 s, pas de 1 s avec trous (time non uniforme) pour exercer les fenêtres
function makeStream(seed, length = 4000) {
  const rnd = lcg(seed);
  const time = [];
  const watts = [];
  let t = 0;
  for (let i = 0; i < length; i++) {
    t += rnd() < 0.05 ? 2 : 1;
    time.push(t);
    watts.push(Math.round(120 + rnd() * 300));
  }
  return { time, watts };
}

const RIDES = [
  { id: 1, stravaId: 101, startDate: '2026-01-05T08:00:00Z', seed: 11 },
  { id: 2, stravaId: 102, startDate: '2026-02-10T08:00:00Z', seed: 22 },
  { id: 3, stravaId: 103, startDate: '2026-03-15T08:00:00Z', seed: 33 },
  { id: 4, stravaId: 104, startDate: '2026-04-20T08:00:00Z', seed: 44 },
];

const STREAMS = RIDES.map(r => ({ activityId: r.id, ...makeStream(r.seed) }));
const WEIGHTS = [
  { date: '2026-01-01', weight: 72.4 },
  { date: '2026-03-01', weight: 71.9 },
];

// Lignes Activity telles que renvoyées par les requêtes : powerBests selon le scénario
function activityRows(withPowerBests) {
  return RIDES.map(r => ({
    id: r.id,
    startDate: r.startDate,
    powerBests: withPowerBests(r) ? computeActivityPowerBests(
      STREAMS.find(s => s.activityId === r.id).watts,
      STREAMS.find(s => s.activityId === r.id).time,
    ) : null,
  }));
}

function mockDb({ activities, streams = STREAMS }) {
  Activity.findAll.mockImplementation(async () => activities);
  ActivityStream.findAll.mockImplementation(async ({ where } = {}) => {
    const ids = where?.activityId;
    return streams
      .filter(s => !ids || ids.includes(s.activityId))
      .map(s => ({ activityId: s.activityId, watts: s.watts, time: s.time }));
  });
  Weight.findAll.mockResolvedValue(WEIGHTS);
}

beforeEach(() => jest.clearAllMocks());

describe('utils/powerBests', () => {
  test('computeActivityPowerBests renvoie null sans watts', () => {
    expect(computeActivityPowerBests(null, null)).toBeNull();
    expect(computeActivityPowerBests([100, 200], undefined)).toBeNull();
  });

  test('mmp = computeMeanMaxPower([{ watts, time }]) et best20 = bestAveragePower(…, 1200)', () => {
    const { watts, time } = makeStream(7);
    const result = computeActivityPowerBests(watts, time);

    const expectedMmp = {};
    for (const { duration, power } of computeMeanMaxPower([{ watts, time }])) {
      expectedMmp[String(duration)] = power;
    }
    expect(result.mmp).toEqual(expectedMmp);
    expect(Object.keys(result.mmp)).toEqual(['1', '5', '15', '30', '60', '300', '600', '1200', '1800', '3600']);
    expect(result.best20).toBe(bestAveragePower(watts, time, 1200));
  });

  test('les ré-exports depuis stravaAnalytics / cyclingProfileService sont les mêmes fonctions', () => {
    expect(reExportedMmp).toBe(computeMeanMaxPower);
    expect(reExportedBest).toBe(bestAveragePower);
  });
});

describe('getPowerCurve : powerBests vs streams (deepEqual)', () => {
  test('sans powerBests (ancien calcul sur streams) == avec powerBests pour tous', async () => {
    mockDb({ activities: activityRows(() => false) });
    const legacy = await getPowerCurve(42, {});

    mockDb({ activities: activityRows(() => true) });
    const fromBests = await getPowerCurve(42, {});

    expect(fromBests).toEqual(legacy);
    expect(fromBests).toEqual(computeMeanMaxPower(STREAMS));
  });

  test('mélange powerBests / null : même courbe que l\'ancien calcul', async () => {
    mockDb({ activities: activityRows(() => false) });
    const legacy = await getPowerCurve(42, {});

    mockDb({ activities: activityRows(r => r.id % 2 === 0) });
    const mixed = await getPowerCurve(42, {});

    expect(mixed).toEqual(legacy);
  });

  test('ne lit les streams que pour les activités sans powerBests', async () => {
    mockDb({ activities: activityRows(r => r.id !== 3) });
    await getPowerCurve(42, {});
    expect(ActivityStream.findAll).toHaveBeenCalledTimes(1);
    expect(ActivityStream.findAll.mock.calls[0][0].where).toEqual({ activityId: [3] });
  });

  test('aucun stream lu quand toutes les activités ont powerBests', async () => {
    mockDb({ activities: activityRows(() => true) });
    await getPowerCurve(42, {});
    expect(ActivityStream.findAll).not.toHaveBeenCalled();
  });
});

describe('getCyclingProgress : powerBests vs streams (deepEqual)', () => {
  test('sans powerBests == avec powerBests pour tous', async () => {
    mockDb({ activities: activityRows(() => false) });
    const legacy = await getCyclingProgress(42);

    mockDb({ activities: activityRows(() => true) });
    const fromBests = await getCyclingProgress(42);

    expect(fromBests).toEqual(legacy);
    expect(legacy.length).toBeGreaterThan(0);
  });

  test('mélange powerBests / null : même progression que l\'ancien calcul', async () => {
    mockDb({ activities: activityRows(() => false) });
    const legacy = await getCyclingProgress(42);

    mockDb({ activities: activityRows(r => r.id === 1 || r.id === 4) });
    const mixed = await getCyclingProgress(42);

    expect(mixed).toEqual(legacy);
  });

  test('best20 de powerBests utilisé : pas de lecture de streams quand tout est pré-calculé', async () => {
    mockDb({ activities: activityRows(() => true) });
    await getCyclingProgress(42);
    expect(ActivityStream.findAll).not.toHaveBeenCalled();
  });
});

describe('scripts/backfillPowerBests', () => {
  test('remplit powerBests par lots, idempotent via powerBests IS NULL', async () => {
    const candidates = activityRows(() => false).map(a => ({ id: a.id }));
    Activity.findAll
      .mockResolvedValueOnce(candidates)
      .mockResolvedValueOnce([]);
    ActivityStream.findAll.mockResolvedValueOnce(
      STREAMS.map(s => ({ activityId: s.activityId, watts: s.watts, time: s.time })),
    );
    Activity.update.mockResolvedValue([1]);

    const result = await backfillPowerBests();

    expect(result).toEqual({ scanned: 4, updated: 4 });
    expect(Activity.findAll.mock.calls[0][0].where.powerBests).toBeDefined();
    expect(Activity.findAll.mock.calls[0][0].limit).toBe(50);
    expect(Activity.update).toHaveBeenCalledTimes(4);
    const [payload, opts] = Activity.update.mock.calls[0];
    expect(payload.powerBests).toEqual(computeActivityPowerBests(STREAMS[0].watts, STREAMS[0].time));
    expect(opts).toEqual({ where: { id: 1 } });
  });

  test('sans stream : compté dans scanned, pas dans updated', async () => {
    Activity.findAll
      .mockResolvedValueOnce([{ id: 9 }])
      .mockResolvedValueOnce([]);
    ActivityStream.findAll.mockResolvedValueOnce([]);

    expect(await backfillPowerBests()).toEqual({ scanned: 1, updated: 0 });
    expect(Activity.update).not.toHaveBeenCalled();
  });
});
