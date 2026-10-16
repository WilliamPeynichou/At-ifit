/**
 * Tests unitaires — stravaRateLimiter.js
 * Fake timers jest : aucune attente réelle. _reset() avant chaque test.
 */

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const limiter = require('../utils/stravaRateLimiter');

const QUARTER_MS = 15 * 60 * 1000;
const SAFETY_MS = 2000;

// setImmediate est mocké par les fake timers : on vide les microtasks via advanceTimersByTimeAsync(0)
const flushPromises = () => jest.advanceTimersByTimeAsync(0);

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2025-03-10T10:07:30Z') });
  limiter._reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('updateFromHeaders', () => {
  test('parse les headers lecture et global au format "15min,jour"', () => {
    limiter.updateFromHeaders({
      'x-readratelimit-limit': '100,1000',
      'x-readratelimit-usage': '42,310',
      'x-ratelimit-limit': '200,2000',
      'x-ratelimit-usage': '50,600',
    });
    const state = limiter.getState();
    expect(state).toMatchObject({
      read15Limit: 100,
      readDayLimit: 1000,
      read15: 42,
      readDay: 310,
      all15Limit: 200,
      allDayLimit: 2000,
      all15: 50,
      allDay: 600,
    });
    expect(state.updatedAt).toBe('2025-03-10T10:07:30.000Z');
  });

  test('accepte les noms de headers en casse quelconque', () => {
    limiter.updateFromHeaders({ 'X-ReadRateLimit-Usage': '7,8', 'X-RateLimit-Limit': '200,2000' });
    const state = limiter.getState();
    expect(state.read15).toBe(7);
    expect(state.readDay).toBe(8);
    expect(state.all15Limit).toBe(200);
  });

  test('ignore les headers absents sans modifier l\'état', () => {
    const before = limiter.getState();
    limiter.updateFromHeaders({});
    limiter.updateFromHeaders(undefined);
    limiter.updateFromHeaders(null);
    expect(limiter.getState()).toEqual(before);
  });

  test('ignore une valeur non numérique', () => {
    limiter.updateFromHeaders({ 'x-readratelimit-usage': 'abc,def' });
    const state = limiter.getState();
    expect(state.read15).toBe(0);
    expect(state.readDay).toBe(0);
  });
});

describe('calcul de fenêtres', () => {
  test('nextQuarterHour renvoie le prochain quart d\'heure UTC', () => {
    expect(limiter.nextQuarterHour(Date.UTC(2025, 2, 10, 10, 7, 30))).toBe(Date.UTC(2025, 2, 10, 10, 15, 0));
    expect(limiter.nextQuarterHour(Date.UTC(2025, 2, 10, 10, 59, 59))).toBe(Date.UTC(2025, 2, 10, 11, 0, 0));
  });

  test('nextQuarterHour est strictement postérieur à now sur une frontière', () => {
    expect(limiter.nextQuarterHour(Date.UTC(2025, 2, 10, 10, 15, 0))).toBe(Date.UTC(2025, 2, 10, 10, 30, 0));
  });

  test('nextMidnightUtc renvoie minuit UTC suivant', () => {
    expect(limiter.nextMidnightUtc(Date.UTC(2025, 2, 10, 23, 30, 0))).toBe(Date.UTC(2025, 2, 11, 0, 0, 0));
    expect(limiter.nextMidnightUtc(Date.UTC(2025, 2, 10, 0, 0, 0))).toBe(Date.UTC(2025, 2, 11, 0, 0, 0));
  });

  test('waitMsUntilNextQuarterHour ajoute la marge de 2 s', () => {
    // 10:07:30 → 10:15:00 = 7 min 30 s, + 2 s
    expect(limiter.waitMsUntilNextQuarterHour(Date.UTC(2025, 2, 10, 10, 7, 30)))
      .toBe(7 * 60 * 1000 + 30 * 1000 + SAFETY_MS);
  });
});

describe('acquire', () => {
  test('incrémente les compteurs lecture et global', async () => {
    await limiter.acquire({ isRead: true });
    const state = limiter.getState();
    expect(state).toMatchObject({ read15: 1, readDay: 1, all15: 1, allDay: 1 });
  });

  test('un appel écriture n\'incrémente que le compteur global', async () => {
    await limiter.acquire({ isRead: false });
    const state = limiter.getState();
    expect(state).toMatchObject({ read15: 0, readDay: 0, all15: 1, allDay: 1 });
  });

  test('attend le prochain quart d\'heure quand la limite 15 min lecture est proche', async () => {
    // 95 utilisés / 100 → seuil d'attente atteint (marge 5)
    limiter.updateFromHeaders({ 'x-readratelimit-usage': '95,95', 'x-readratelimit-limit': '100,1000' });

    let resolved = false;
    const pending = limiter.acquire({ isRead: true }).then(() => { resolved = true; });

    await flushPromises();
    expect(resolved).toBe(false);

    // 10:07:30 + 7 min 31 s = 10:15:01 : pas encore (délai = 7 min 30 s + 2 s de marge)
    await jest.advanceTimersByTimeAsync(7 * 60 * 1000 + 31 * 1000);
    expect(resolved).toBe(false);

    // 10:15:02 : réservé
    await jest.advanceTimersByTimeAsync(1000);
    await pending;
    expect(resolved).toBe(true);
    expect(limiter.getState()).toMatchObject({ read15: 1, all15: 1 });
  });

  test('n\'attend pas quand la limite est encore loin', async () => {
    limiter.updateFromHeaders({ 'x-readratelimit-usage': '10,10' });
    let resolved = false;
    limiter.acquire({ isRead: true }).then(() => { resolved = true; });
    await flushPromises();
    expect(resolved).toBe(true);
  });

  test('lève STRAVA_DAILY_QUOTA quand le quota lecture jour est proche', async () => {
    limiter.updateFromHeaders({ 'x-readratelimit-usage': '0,985', 'x-readratelimit-limit': '100,1000' });
    await expect(limiter.acquire({ isRead: true })).rejects.toMatchObject({ code: 'STRAVA_DAILY_QUOTA' });
  });

  test('lève STRAVA_DAILY_QUOTA quand le quota global jour est proche', async () => {
    limiter.updateFromHeaders({ 'x-ratelimit-usage': '0,1985', 'x-ratelimit-limit': '200,2000' });
    await expect(limiter.acquire({ isRead: false })).rejects.toMatchObject({ code: 'STRAVA_DAILY_QUOTA' });
  });

  test('l\'erreur quota jour n\'incrémente pas les compteurs', async () => {
    limiter.updateFromHeaders({ 'x-readratelimit-usage': '0,985', 'x-readratelimit-limit': '100,1000' });
    await expect(limiter.acquire({ isRead: true })).rejects.toThrow('STRAVA_DAILY_QUOTA');
    expect(limiter.getState().readDay).toBe(985);
  });

  test('les compteurs 15 min repartent à zéro au quart d\'heure suivant', async () => {
    limiter.updateFromHeaders({ 'x-readratelimit-usage': '40,40' });
    await limiter.acquire({ isRead: true });
    expect(limiter.getState().read15).toBe(41);

    // passe à 10:15:00 (les compteurs 15 min repartent à zéro)
    await jest.advanceTimersByTimeAsync(7 * 60 * 1000 + 30 * 1000);
    await limiter.acquire({ isRead: true });
    expect(limiter.getState()).toMatchObject({ read15: 1, readDay: 42 });
  });
});

describe('_reset', () => {
  test('remet l\'état par défaut', async () => {
    limiter.updateFromHeaders({ 'x-readratelimit-usage': '50,500', 'x-ratelimit-limit': '300,3000' });
    await limiter.acquire({ isRead: true });
    limiter._reset();
    expect(limiter.getState()).toMatchObject({
      read15: 0,
      readDay: 0,
      read15Limit: 100,
      readDayLimit: 1000,
      all15: 0,
      allDay: 0,
      all15Limit: 200,
      allDayLimit: 2000,
      updatedAt: null,
    });
  });
});
