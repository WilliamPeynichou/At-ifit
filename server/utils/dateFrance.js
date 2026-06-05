/**
 * Utilitaires de date basés sur le fuseau horaire français (Europe/Paris).
 *
 * L'agent IA hallucinait régulièrement les dates : il ne savait pas quel jour
 * on était et interprétait mal les périodes relatives ("cette semaine",
 * "le mois dernier", "ma dernière sortie"...). Toutes les références
 * temporelles destinées à l'IA doivent donc partir de la date du jour en
 * heure française, fournie explicitement dans le contexte.
 */

const TIME_ZONE = 'Europe/Paris';
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

function toDate(value = new Date()) {
  if (value === undefined) return new Date();
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Retourne les composants (année, mois, jour, heure...) de l'instant donné
 * exprimés dans le fuseau Europe/Paris.
 * @param {Date|string|number} [date]
 */
function getParisParts(date = new Date()) {
  const parsed = toDate(date);
  if (!isValidDate(parsed)) {
    return {
      year: NaN,
      month: NaN,
      day: NaN,
      hour: NaN,
      minute: NaN,
      second: NaN,
      millisecond: NaN,
      weekday: null,
      weekdayIndex: NaN,
    };
  }

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(parsed).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour === '24' ? '00' : parts.hour);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return {
    year,
    month,
    day,
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    millisecond: parsed.getUTCMilliseconds(),
    weekday: parts.weekday,
    weekdayIndex,
  };
}

/**
 * Convertit une date/heure civile Europe/Paris en instant UTC.
 * Utile pour obtenir des bornes DB stables, indépendantes du fuseau serveur.
 * @param {{year:number, month:number, day:number, hour?:number, minute?:number, second?:number, millisecond?:number}} parts
 */
function parisDateTimeToUtcDate({ year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 } = {}) {
  const numbers = [year, month, day, hour, minute, second, millisecond].map(Number);
  if (numbers.some(n => !Number.isFinite(n))) return new Date(NaN);

  const [y, m, d, h, min, s, ms] = numbers;
  const desiredAsUTC = Date.UTC(y, m - 1, d, h, min, s, ms);
  let utc = desiredAsUTC;

  // Convergence en 2 passes en temps normal ; 4 par prudence autour des changements d'heure.
  for (let i = 0; i < 4; i += 1) {
    const actual = getParisParts(new Date(utc));
    const actualAsUTC = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      actual.millisecond || 0
    );
    const diff = desiredAsUTC - actualAsUTC;
    if (diff === 0) return new Date(utc);
    utc += diff;
  }

  return new Date(utc);
}

/**
 * Date du jour en heure française au format ISO court (YYYY-MM-DD).
 * @param {Date|string|number} [date]
 */
function getParisDateISO(date = new Date()) {
  const { year, month, day } = getParisParts(date);
  if (![year, month, day].every(Number.isFinite)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formate une date au format lisible français (Europe/Paris).
 * @param {Date|string|number} value
 * @param {object} [options] - options Intl.DateTimeFormat supplémentaires.
 */
function formatParisDate(value, options = {}) {
  const date = toDate(value);
  if (!isValidDate(date)) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(date);
}

/**
 * Formate date + heure au format lisible français (Europe/Paris).
 * @param {Date|string|number} value
 */
function formatParisDateTime(value) {
  return formatParisDate(value, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Ajoute des jours calendaires en Europe/Paris en conservant l'heure locale.
 * @param {Date|string|number} value
 * @param {number} days
 */
function addParisDays(value = new Date(), days = 0) {
  const date = toDate(value);
  if (!isValidDate(date)) return new Date(NaN);
  const parts = getParisParts(date);
  return parisDateTimeToUtcDate({
    year: parts.year,
    month: parts.month,
    day: parts.day + Number(days),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: parts.millisecond,
  });
}

/**
 * Début du jour civil Europe/Paris, retourné comme instant UTC.
 * @param {Date|string|number} [value]
 */
function startOfParisDayUtc(value = new Date()) {
  const date = toDate(value);
  if (!isValidDate(date)) return new Date(NaN);
  const parts = getParisParts(date);
  return parisDateTimeToUtcDate({ year: parts.year, month: parts.month, day: parts.day });
}

/**
 * Fin du jour civil Europe/Paris, retournée comme instant UTC.
 * @param {Date|string|number} [value]
 */
function endOfParisDayUtc(value = new Date()) {
  const start = startOfParisDayUtc(value);
  if (!isValidDate(start)) return new Date(NaN);
  return new Date(addParisDays(start, 1).getTime() - 1);
}

/**
 * Début de semaine ISO/lundi en Europe/Paris, retourné comme instant UTC.
 * @param {Date|string|number} [value]
 */
function startOfParisWeekUtc(value = new Date()) {
  const date = toDate(value);
  if (!isValidDate(date)) return new Date(NaN);
  const parts = getParisParts(date);
  const daysFromMonday = (parts.weekdayIndex + 6) % 7;
  return parisDateTimeToUtcDate({ year: parts.year, month: parts.month, day: parts.day - daysFromMonday });
}

/**
 * Début du mois civil Europe/Paris, retourné comme instant UTC.
 * @param {Date|string|number} [value]
 */
function startOfParisMonthUtc(value = new Date()) {
  const date = toDate(value);
  if (!isValidDate(date)) return new Date(NaN);
  const parts = getParisParts(date);
  return parisDateTimeToUtcDate({ year: parts.year, month: parts.month, day: 1 });
}

/**
 * Fin du mois civil Europe/Paris, retournée comme instant UTC.
 * @param {Date|string|number} [value]
 */
function endOfParisMonthUtc(value = new Date()) {
  const start = startOfParisMonthUtc(value);
  if (!isValidDate(start)) return new Date(NaN);
  const parts = getParisParts(start);
  const nextMonthStart = parisDateTimeToUtcDate({ year: parts.year, month: parts.month + 1, day: 1 });
  return new Date(nextMonthStart.getTime() - 1);
}

function diffParisCalendarDays(from, to) {
  const fromIso = getParisDateISO(from);
  const toIso = getParisDateISO(to);
  if (!fromIso || !toIso) return NaN;
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

/**
 * Bloc de contexte temporel à injecter dans les prompts de l'IA.
 * Donne explicitement la date du jour en heure française pour éviter
 * les hallucinations de dates.
 * @param {Date|string|number} [date]
 */
function buildDateContext(date = new Date()) {
  const parsed = toDate(date);
  const parts = getParisParts(parsed);
  const iso = getParisDateISO(parsed);
  const weekday = parts.weekday || WEEKDAYS_FR[parts.weekdayIndex] || null;
  const human = formatParisDate(parsed, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return {
    timeZone: TIME_ZONE,
    today: iso,
    todayHuman: human,
    weekday,
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
    iso: isValidDate(parsed) ? parsed.toISOString() : null,
  };
}

module.exports = {
  TIME_ZONE,
  getParisParts,
  parisDateTimeToUtcDate,
  getParisDateISO,
  formatParisDate,
  formatParisDateTime,
  addParisDays,
  startOfParisDayUtc,
  endOfParisDayUtc,
  startOfParisWeekUtc,
  startOfParisMonthUtc,
  endOfParisMonthUtc,
  diffParisCalendarDays,
  buildDateContext,
};
