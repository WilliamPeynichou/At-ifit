/**
 * Tests unitaires — stravaHelpers.js
 * Mock axios pour simuler les réponses Strava sans appels réseau réels.
 */

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../models/User', () => ({
  update: jest.fn().mockResolvedValue([1]),
}));

// Mock axios : la fonction principale ET ses méthodes (post, get…)
const mockAxios = jest.fn();
mockAxios.post = jest.fn();
jest.mock('axios', () => mockAxios);

const axios = require('axios');
const { stravaFetch, getValidStravaToken } = require('../utils/stravaHelpers');
const User = require('../models/User');

// Réduit les délais de retry pour que les tests passent rapidement
jest.spyOn(global, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });

describe('stravaFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.mockReset && axios.mockReset();
    axios.post.mockReset && axios.post.mockReset();
  });

  test('retourne data sur réponse 200', async () => {
    axios.mockResolvedValueOnce({ data: { id: 1, name: 'Run' } });
    const result = await stravaFetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: { Authorization: 'Bearer token123' },
    });
    expect(result).toEqual({ id: 1, name: 'Run' });
    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('lève STRAVA_TOKEN_REVOKED sur 401 et efface les tokens en DB', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401, headers: {} };
    axios.mockRejectedValueOnce(error);

    await expect(
      stravaFetch('https://www.strava.com/api/v3/athlete', {}, { userId: 42 })
    ).rejects.toMatchObject({ code: 'STRAVA_TOKEN_REVOKED', status: 401 });

    expect(User.update).toHaveBeenCalledWith(
      { stravaAccessToken: null, stravaRefreshToken: null, stravaExpiresAt: null },
      { where: { id: 42 } }
    );
  });

  test('ne tente pas d\'effacer les tokens si userId absent sur 401', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401, headers: {} };
    axios.mockRejectedValueOnce(error);

    await expect(
      stravaFetch('https://www.strava.com/api/v3/athlete', {})
    ).rejects.toMatchObject({ code: 'STRAVA_TOKEN_REVOKED' });

    expect(User.update).not.toHaveBeenCalled();
  });

  test('réessaie sur 5xx et réussit au 2e essai', async () => {
    const serverError = new Error('Internal Server Error');
    serverError.response = { status: 500, headers: {} };

    axios
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ data: { id: 2 } });

    const result = await stravaFetch('https://www.strava.com/api/v3/athlete', {});
    expect(result).toEqual({ id: 2 });
    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('lève une erreur définitive après MAX_RETRIES tentatives sur 5xx', async () => {
    const serverError = new Error('Internal Server Error');
    serverError.response = { status: 500, headers: {} };
    axios.mockRejectedValue(serverError);

    await expect(stravaFetch('https://www.strava.com/api/v3/athlete', {})).rejects.toThrow();
    expect(axios).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  test('gère le rate limit 429 — attend et réessaie', async () => {
    const rateLimitError = new Error('Too Many Requests');
    rateLimitError.response = {
      status: 429,
      headers: { 'x-ratelimit-reset': '1' }, // 1 seconde (mocké)
    };

    axios
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ data: { id: 3 } });

    const result = await stravaFetch('https://www.strava.com/api/v3/athlete', {});
    expect(result).toEqual({ id: 3 });
    expect(axios).toHaveBeenCalledTimes(2);
  });
});

describe('getValidStravaToken', () => {
  const now = Math.floor(Date.now() / 1000);

  test('retourne le token existant s\'il n\'est pas expiré', async () => {
    const user = {
      id: 1,
      stravaAccessToken: 'valid_token',
      stravaRefreshToken: 'refresh_token',
      stravaExpiresAt: now + 3600,
      update: jest.fn(),
    };
    const token = await getValidStravaToken(user);
    expect(token).toBe('valid_token');
    expect(user.update).not.toHaveBeenCalled();
  });

  test('retourne null si le token est expiré et qu\'il n\'y a pas de refresh token', async () => {
    const user = {
      id: 2,
      stravaAccessToken: 'expired_token',
      stravaRefreshToken: null,
      stravaExpiresAt: now - 100,
      update: jest.fn(),
    };
    const token = await getValidStravaToken(user);
    expect(token).toBeNull();
  });

  test('rafraîchit le token si expiré et refresh token présent', async () => {
    const user = {
      id: 3,
      stravaAccessToken: 'old_token',
      stravaRefreshToken: 'refresh_token',
      stravaExpiresAt: now - 100,
      update: jest.fn().mockResolvedValue(true),
    };

    process.env.STRAVA_CLIENT_ID = 'test_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';

    axios.post.mockResolvedValueOnce({
      data: {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: now + 7200,
      },
    });

    const token = await getValidStravaToken(user);
    expect(token).toBe('new_access_token');
    expect(user.update).toHaveBeenCalledWith({
      stravaAccessToken: 'new_access_token',
      stravaRefreshToken: 'new_refresh_token',
      stravaExpiresAt: now + 7200,
    });
  });

  test('retourne null si le rafraîchissement échoue', async () => {
    const user = {
      id: 4,
      stravaAccessToken: 'old_token',
      stravaRefreshToken: 'bad_refresh',
      stravaExpiresAt: now - 100,
      update: jest.fn(),
    };

    axios.post.mockRejectedValueOnce(new Error('Refresh failed'));
    const token = await getValidStravaToken(user);
    expect(token).toBeNull();
  });
});
