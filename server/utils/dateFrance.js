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

const WEEKDAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

/**
 * Retourne les composants (année, mois, jour, heure...) de l'instant donné
 * exprimés dans le fuseau Europe/Paris.
 * @param {Date} [date]
 */
function getParisParts(date = new Date()) {
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

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '00' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

/**
 * Date du jour en heure française au format ISO court (YYYY-MM-DD).
 * @param {Date} [date]
 */
function getParisDateISO(date = new Date()) {
  const { year, month, day } = getParisParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formate une date au format lisible français (Europe/Paris).
 * @param {Date|string|number} value
 * @param {object} [options] - options Intl.DateTimeFormat supplémentaires.
 */
function formatParisDate(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
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
 * Bloc de contexte temporel à injecter dans les prompts de l'IA.
 * Donne explicitement la date du jour en heure française pour éviter
 * les hallucinations de dates.
 * @param {Date} [date]
 */
function buildDateContext(date = new Date()) {
  const parts = getParisParts(date);
  const iso = getParisDateISO(date);
  const weekday = parts.weekday || WEEKDAYS_FR[date.getUTCDay()];
  const human = formatParisDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return {
    timeZone: TIME_ZONE,
    today: iso,
    todayHuman: human,
    weekday,
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
    iso: date.toISOString(),
  };
}

module.exports = {
  TIME_ZONE,
  getParisParts,
  getParisDateISO,
  formatParisDate,
  formatParisDateTime,
  buildDateContext,
};
