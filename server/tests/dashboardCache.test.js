const cache = require('../utils/memoryCache');
const {
  dashKey,
  getOrCompute,
  invalidateUserDashboards,
  DASHBOARD_TTL_SECONDS,
} = require('../services/dashboardCache');

beforeEach(() => {
  cache.clear();
});

describe('dashboardCache', () => {
  test('dashKey : préfixe dash:<userId>: et paramètres sérialisés', () => {
    const key = dashKey(7, 'running', { view: 'analysis', preset: '30D' });
    expect(key.startsWith('dash:7:running:')).toBe(true);
    expect(key).toContain('"view":"analysis"');
    expect(key).toContain('"preset":"30D"');
  });

  test('dashKey : paramètres différents → clés différentes', () => {
    expect(dashKey(1, 'running', { preset: '7D' })).not.toBe(dashKey(1, 'running', { preset: '30D' }));
    expect(dashKey(1, 'running', {})).not.toBe(dashKey(1, 'cycling', {}));
  });

  test('getOrCompute : 2e appel servi depuis le cache, fn non rappelée', async () => {
    const fn = jest.fn(async () => ({ value: 42 }));
    const key = dashKey(1, 'running', { view: 'x' });
    const first = await getOrCompute(key, DASHBOARD_TTL_SECONDS, fn);
    const second = await getOrCompute(key, DASHBOARD_TTL_SECONDS, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  test('getOrCompute : le TTL est transmis au cache (en secondes)', async () => {
    const spy = jest.spyOn(cache, 'set');
    await getOrCompute(dashKey(1, 'running', {}), 600, async () => 'v');
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'v', 600);
    spy.mockRestore();
  });

  test('invalidateUserDashboards : le calcul suivant est refait', async () => {
    const fn = jest.fn(async () => 'v');
    const key = dashKey(1, 'running', {});
    await getOrCompute(key, 600, fn);
    invalidateUserDashboards(1);
    await getOrCompute(key, 600, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('invalidateUserDashboards(1) ne touche pas les clés de l\'user 12', async () => {
    const key1 = dashKey(1, 'running', {});
    const key12 = dashKey(12, 'running', {});
    await getOrCompute(key1, 600, async () => 'a');
    await getOrCompute(key12, 600, async () => 'b');
    invalidateUserDashboards(1);
    expect(cache.get(key1)).toBeNull();
    expect(cache.get(key12)).toBe('b');
  });

  test('invalidation pendant un calcul : résultat périmé non mis en cache', async () => {
    const key = dashKey(3, 'swimming', {});
    let finish;
    const pending = getOrCompute(key, 600, () => new Promise(resolve => { finish = resolve; }));
    invalidateUserDashboards(3);
    finish('périmé');
    await expect(pending).resolves.toBe('périmé');
    expect(cache.get(key)).toBeNull();
  });

  test('erreur de fn : rien n\'est mis en cache et l\'erreur remonte', async () => {
    const key = dashKey(4, 'cycling', {});
    await expect(getOrCompute(key, 600, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(cache.get(key)).toBeNull();
  });
});
