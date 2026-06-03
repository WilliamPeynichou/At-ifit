const {
  REDACTED,
  isSensitiveKey,
  sanitizeMetadata,
  sanitizeUserForSuperAdmin,
  sanitizeForSuperAdmin,
} = require('../utils/sensitiveData');

describe('sensitiveData utils', () => {
  test('detects sensitive keys', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('stravaAccessToken')).toBe(true);
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('email')).toBe(false);
  });

  test('removes sensitive keys recursively from metadata', () => {
    const sanitized = sanitizeMetadata({
      endpoint: '/athlete',
      headers: { Authorization: 'Bearer secret-token' },
      nested: { apiKey: 'secret-api-key', count: 2 },
    });

    expect(sanitized).toEqual({ endpoint: '/athlete', nested: { count: 2 } });
    expect(JSON.stringify(sanitized)).not.toMatch(/secret-token|secret-api-key|Authorization|apiKey/i);
  });

  test('redacts secret-looking strings in allowed fields', () => {
    const sanitized = sanitizeMetadata({ message: 'failed with Bearer abc.def.ghi' });
    expect(sanitized.message).toBe(REDACTED);
  });

  test('sanitizes users while preserving diagnostic Strava status', () => {
    const sanitized = sanitizeUserForSuperAdmin({
      id: 1,
      email: 'wili@example.test',
      password: 'hashed-password',
      stravaAccessToken: 'secret-access-token',
      stravaRefreshToken: 'secret-refresh-token',
      stravaAthleteId: 123,
      role: 'super_admin',
    });

    expect(sanitized).toMatchObject({
      id: 1,
      email: 'wili@example.test',
      stravaAthleteId: 123,
      role: 'super_admin',
      stravaConnected: true,
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/hashed-password|secret-access-token|secret-refresh-token|password|stravaAccessToken|stravaRefreshToken/i);
  });

  test('sanitizes arrays for super admin responses', () => {
    const sanitized = sanitizeForSuperAdmin([
      { id: 1, password: 'hash', pseudo: 'a' },
      { id: 2, metadata: { refreshToken: 'jwt' }, pseudo: 'b' },
    ]);

    expect(sanitized).toEqual([
      { id: 1, pseudo: 'a', stravaConnected: false },
      { id: 2, pseudo: 'b' },
    ]);
  });
});
