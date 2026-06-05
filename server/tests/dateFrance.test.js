const {
  getParisDateISO,
  formatParisDate,
  buildDateContext,
  TIME_ZONE,
  parisDateTimeToUtcDate,
  addParisDays,
  startOfParisDayUtc,
  endOfParisDayUtc,
  startOfParisWeekUtc,
  startOfParisMonthUtc,
  endOfParisMonthUtc,
  diffParisCalendarDays,
} = require('../utils/dateFrance');

describe('dateFrance (référence temporelle heure française)', () => {
  test('getParisDateISO retourne la date au format YYYY-MM-DD', () => {
    expect(getParisDateISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('formatParisDate utilise le fuseau Europe/Paris (décalage UTC pris en compte)', () => {
    // 23h30 UTC le 15 janvier => déjà le 16 janvier à Paris (UTC+1)
    expect(formatParisDate('2026-01-15T23:30:00Z')).toBe('16/01/2026');
  });

  test('formatParisDate retourne null sur une date invalide', () => {
    expect(formatParisDate('pas-une-date')).toBeNull();
  });

  test('buildDateContext expose la date du jour pour le prompt IA', () => {
    const ctx = buildDateContext(new Date('2026-07-14T10:00:00Z'));
    expect(ctx.timeZone).toBe(TIME_ZONE);
    expect(ctx.today).toBe('2026-07-14');
    expect(ctx.weekday).toBe('mardi');
    expect(ctx.todayHuman).toContain('14 juillet 2026');
    expect(ctx.time).toBe('12:00');
  });

  test('buildDateContext bascule sur le lendemain après minuit à Paris en hiver', () => {
    const ctx = buildDateContext(new Date('2026-01-15T23:30:00Z'));
    expect(ctx.today).toBe('2026-01-16');
    expect(ctx.weekday).toBe('vendredi');
    expect(ctx.time).toBe('00:30');
  });

  test('buildDateContext bascule sur le lendemain après minuit à Paris en été', () => {
    const ctx = buildDateContext(new Date('2026-07-14T22:30:00Z'));
    expect(ctx.today).toBe('2026-07-15');
    expect(ctx.weekday).toBe('mercredi');
    expect(ctx.time).toBe('00:30');
  });

  test('parisDateTimeToUtcDate convertit une date civile Paris en instant UTC hiver/été', () => {
    expect(parisDateTimeToUtcDate({ year: 2026, month: 1, day: 16 }).toISOString()).toBe('2026-01-15T23:00:00.000Z');
    expect(parisDateTimeToUtcDate({ year: 2026, month: 7, day: 15 }).toISOString()).toBe('2026-07-14T22:00:00.000Z');
  });

  test('startOfParisDayUtc et endOfParisDayUtc renvoient les bornes UTC du jour Paris en hiver', () => {
    const date = new Date('2026-01-15T12:00:00Z');
    expect(startOfParisDayUtc(date).toISOString()).toBe('2026-01-14T23:00:00.000Z');
    expect(endOfParisDayUtc(date).toISOString()).toBe('2026-01-15T22:59:59.999Z');
  });

  test('startOfParisDayUtc et endOfParisDayUtc renvoient les bornes UTC du jour Paris en été', () => {
    const date = new Date('2026-07-14T12:00:00Z');
    expect(startOfParisDayUtc(date).toISOString()).toBe('2026-07-13T22:00:00.000Z');
    expect(endOfParisDayUtc(date).toISOString()).toBe('2026-07-14T21:59:59.999Z');
  });

  test('les bornes du jour Paris gèrent le passage à l’heure d’été (journée de 23h)', () => {
    const date = new Date('2026-03-29T12:00:00Z');
    expect(startOfParisDayUtc(date).toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(endOfParisDayUtc(date).toISOString()).toBe('2026-03-29T21:59:59.999Z');
  });

  test('les bornes du jour Paris gèrent le passage à l’heure d’hiver (journée de 25h)', () => {
    const date = new Date('2026-10-25T12:00:00Z');
    expect(startOfParisDayUtc(date).toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(endOfParisDayUtc(date).toISOString()).toBe('2026-10-25T22:59:59.999Z');
  });

  test('startOfParisWeekUtc retourne le lundi 00:00 Paris même quand UTC est encore dimanche', () => {
    const date = new Date('2026-07-14T22:30:00Z'); // mercredi 15 juillet 00:30 à Paris
    expect(buildDateContext(date).today).toBe('2026-07-15');
    expect(startOfParisWeekUtc(date).toISOString()).toBe('2026-07-12T22:00:00.000Z');
  });

  test('startOfParisMonthUtc et endOfParisMonthUtc retournent les bornes du mois Paris', () => {
    const date = new Date('2026-07-14T12:00:00Z');
    expect(startOfParisMonthUtc(date).toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(endOfParisMonthUtc(date).toISOString()).toBe('2026-07-31T21:59:59.999Z');
  });

  test('addParisDays conserve le calendrier Paris à travers le changement d’heure', () => {
    const start = new Date('2026-03-28T23:00:00Z'); // 29 mars 00:00 Paris
    const next = addParisDays(start, 1);
    expect(next.toISOString()).toBe('2026-03-29T22:00:00.000Z'); // 30 mars 00:00 Paris
    expect(diffParisCalendarDays(start, next)).toBe(1);
  });
});
