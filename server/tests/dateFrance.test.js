const {
  getParisDateISO,
  formatParisDate,
  buildDateContext,
  TIME_ZONE,
} = require('../utils/dateFrance');

describe('dateFrance (référence temporelle heure française)', () => {
  test('getParisDateISO retourne la date au format YYYY-MM-DD', () => {
    expect(getParisDateISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('formatParisDate utilise le fuseau Europe/Paris (décalage UTC pris en compte)', () => {
    // 23h30 UTC le 15 janvier => déjà le 16 janvier à Paris (UTC+1)
    expect(formatParisDate('2024-01-15T23:30:00Z')).toBe('16/01/2024');
  });

  test('formatParisDate retourne null sur une date invalide', () => {
    expect(formatParisDate('pas-une-date')).toBeNull();
  });

  test('buildDateContext expose la date du jour pour le prompt IA', () => {
    const ctx = buildDateContext(new Date('2024-07-14T10:00:00Z'));
    expect(ctx.timeZone).toBe(TIME_ZONE);
    expect(ctx.today).toBe('2024-07-14');
    expect(ctx.weekday).toBe('dimanche');
    expect(ctx.todayHuman).toContain('14 juillet 2024');
  });
});
