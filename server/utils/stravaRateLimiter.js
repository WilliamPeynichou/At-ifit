/**
 * Limiteur de quota Strava — singleton process.
 *
 * Le quota Strava est par application (pas par user) : tous les users partagent le même budget.
 * - Lecture : 100 req / 15 min, 1 000 / jour
 * - Global  : 200 req / 15 min, 2 000 / jour
 * Valeurs par défaut prudentes, remplacées dès qu'une réponse Strava expose ses headers.
 * Compteur 15 min remis à :00 / :15 / :30 / :45 UTC, compteur jour remis à minuit UTC.
 */
const logger = require('./logger');

const QUARTER_MS = 15 * 60 * 1000;
const SAFETY_MARGIN_MS = 2000;   // marge après le quart d'heure avant de reprendre
const LIMIT_MARGIN = 5;          // foreground : attente dès qu'on approche la limite 15 min
const DAILY_MARGIN = 20;         // foreground : erreur dès qu'on approche la limite jour
const BACKGROUND_RESERVE = 20;   // background : attente 15 min dès limit - 20 (réserve pour les requêtes user)
const BACKGROUND_DAILY_RESERVE = 100; // background : erreur jour dès limit - 100 (réserve pour les requêtes user)

const emptyState = () => ({
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

let state;
let windows;

const toMs = (now) => (now instanceof Date ? now.getTime() : Number(now));

/** Prochain quart d'heure UTC strictement postérieur à `now` (timestamp ms). */
function nextQuarterHour(now = Date.now()) {
  return (Math.floor(toMs(now) / QUARTER_MS) + 1) * QUARTER_MS;
}

/** Minuit UTC suivant `now` (timestamp ms). */
function nextMidnightUtc(now = Date.now()) {
  const d = new Date(toMs(now));
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

/** Délai (ms) jusqu'au prochain quart d'heure + marge de sécurité. */
function waitMsUntilNextQuarterHour(now = Date.now()) {
  const t = toMs(now);
  return nextQuarterHour(t) - t + SAFETY_MARGIN_MS;
}

function _reset() {
  const now = Date.now();
  state = emptyState();
  windows = { reset15At: nextQuarterHour(now), resetDayAt: nextMidnightUtc(now) };
}
_reset();

/** Remet à zéro les compteurs dont la fenêtre est échue. */
function rollWindows(now) {
  if (now >= windows.reset15At) {
    state.read15 = 0;
    state.all15 = 0;
    windows.reset15At = nextQuarterHour(now);
  }
  if (now >= windows.resetDayAt) {
    state.readDay = 0;
    state.allDay = 0;
    windows.resetDayAt = nextMidnightUtc(now);
  }
}

/** Lit un header quelle que soit la casse (objet simple ou AxiosHeaders). */
function readHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    if (value != null) return value;
  }
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

/** Parse "15min,jour" → { fifteen, day } ; null si absent. */
function parsePair(value) {
  if (value == null) return null;
  const [fifteen, day] = String(value).split(',').map((part) => parseInt(part.trim(), 10));
  return {
    fifteen: Number.isFinite(fifteen) ? fifteen : null,
    day: Number.isFinite(day) ? day : null,
  };
}

/** Met à jour les limites et compteurs depuis les headers Strava. Ignore les headers absents. */
function updateFromHeaders(headers) {
  if (!headers) return;
  const now = Date.now();
  rollWindows(now);

  const readLimit = parsePair(readHeader(headers, 'x-readratelimit-limit'));
  const readUsage = parsePair(readHeader(headers, 'x-readratelimit-usage'));
  const allLimit = parsePair(readHeader(headers, 'x-ratelimit-limit'));
  const allUsage = parsePair(readHeader(headers, 'x-ratelimit-usage'));

  let touched = false;
  const assign = (key, value) => {
    if (value != null) {
      state[key] = value;
      touched = true;
    }
  };

  assign('read15Limit', readLimit?.fifteen);
  assign('readDayLimit', readLimit?.day);
  assign('read15', readUsage?.fifteen);
  assign('readDay', readUsage?.day);
  assign('all15Limit', allLimit?.fifteen);
  assign('allDayLimit', allLimit?.day);
  assign('all15', allUsage?.fifteen);
  assign('allDay', allUsage?.day);

  if (touched) state.updatedAt = new Date(now).toISOString();
}

function dailyQuotaError(scope) {
  const err = new Error('STRAVA_DAILY_QUOTA');
  err.code = 'STRAVA_DAILY_QUOTA';
  err.scope = scope; // 'read' | 'all'
  return err;
}

/**
 * Retourne le délai d'attente (ms) avant de pouvoir réserver, 0 si on peut réserver maintenant.
 * Lève STRAVA_DAILY_QUOTA si le quota jour est quasi épuisé.
 * background : seuils plus stricts (réserve pour les requêtes utilisateur).
 */
function computeWaitMs(isRead, now, background) {
  const dailyMargin = background ? BACKGROUND_DAILY_RESERVE : DAILY_MARGIN;
  if (isRead && state.readDay >= state.readDayLimit - dailyMargin) throw dailyQuotaError('read');
  if (state.allDay >= state.allDayLimit - dailyMargin) throw dailyQuotaError('all');

  const limitMargin = background ? BACKGROUND_RESERVE : LIMIT_MARGIN;
  const over15 =
    (isRead && state.read15 >= state.read15Limit - limitMargin) ||
    state.all15 >= state.all15Limit - limitMargin;
  return over15 ? waitMsUntilNextQuarterHour(now) : 0;
}

function reserve(isRead) {
  if (isRead) {
    state.read15 += 1;
    state.readDay += 1;
  }
  state.all15 += 1;
  state.allDay += 1;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Réserve 1 appel. Attend le prochain quart d'heure si la limite 15 min est proche.
 * Lève STRAVA_DAILY_QUOTA si le quota jour est proche (pas de retry possible).
 * background : true pour les appels non urgents (sync auto, enrichissement) ; false pour les requêtes user.
 */
async function acquire({ isRead = true, background = false } = {}) {
  const now = Date.now();
  rollWindows(now);
  const waitMs = computeWaitMs(isRead, now, background);
  if (waitMs > 0) {
    logger.warn('[StravaQuota] Limite 15 min proche — attente', { waitMs, isRead, background });
    await sleep(waitMs);
    // rollWindows ne remet à zéro qu'une fois par fenêtre : plusieurs appels réveillés
    // ensemble ne s'écrasent pas mutuellement leurs réservations.
    rollWindows(Date.now());
  }
  reserve(isRead);
}

/** Copie de l'état courant (usage SuperAdmin). */
function getState() {
  return { ...state };
}

module.exports = {
  acquire,
  updateFromHeaders,
  nextQuarterHour,
  nextMidnightUtc,
  waitMsUntilNextQuarterHour,
  getState,
  _reset,
};
