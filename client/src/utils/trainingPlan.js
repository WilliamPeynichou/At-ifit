/**
 * Plan d'entraînement semaine par semaine, dérivé de l'objectif et de
 * l'historique Strava synthétisé (getTrainingSummary). Sans historique,
 * des valeurs par défaut prudentes sont utilisées.
 */

const DEFAULT_WEEKS = 12;
const MIN_WEEKS = 4;
const MAX_WEEKS = 30;
const WEEK_MS = 7 * 86400000;
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DEFAULT_WEEKLY_KM = { running: 25, cycling: 90, swimming: 2.5 };
const DEFAULT_WEEKLY_HOURS = 5;
const MINUTES_PER_KM = { running: 6, cycling: 60 / 26, swimming: 25 };
const RACE_VOLUME_FACTOR = { running: 2.2, cycling: 0.9, swimming: 1.5 };
const MAX_RAMP = 1.5;
const STRENGTH_MINUTES = 30;
const RECOVERY_FACTOR = 0.7;
const TAPER_FACTORS = { 1: [0.5], 2: [0.6, 0.4] };

const LAYOUTS = {
  2: ['easy', 'long'],
  3: ['key', 'easy', 'long'],
  4: ['key', 'easy', 'strength', 'long'],
  5: ['key', 'easy', 'recovery', 'strength', 'long'],
  6: ['key', 'easy', 'recovery', 'key', 'strength', 'long'],
  7: ['key', 'easy', 'recovery', 'strength', 'easy', 'recovery', 'long'],
};

const VOLUME_WEIGHT = { long: 0.35, key: 0.2, easy: 0.15, recovery: 0.1 };

const TITLES = {
  running: { long: 'Sortie longue', key: 'Séance qualité', easy: 'Endurance fondamentale', recovery: 'Récupération active', strength: 'Renforcement et gainage' },
  cycling: { long: 'Sortie longue vélo', key: 'Intervalles et seuil', easy: 'Endurance vélo', recovery: 'Sortie récupération', strength: 'Renforcement et gainage' },
  swimming: { long: 'Grande série', key: 'Technique et intervalles', easy: 'Endurance natation', recovery: 'Technique légère', strength: 'Renforcement et gainage' },
  triathlon: { long: 'Brick vélo puis course', key: 'Séance seuil', easy: 'Endurance multisport', recovery: 'Récupération', strength: 'Renforcement et gainage' },
};

const KEY_DETAIL = {
  Socle: 'fractionné léger, 6 à 8 accélérations d’une minute, récupération égale',
  Spécifique: 'blocs à allure objectif, seuil progressif',
  Pic: 'répétition de la course, allure objectif sur un bloc long',
  Affûtage: 'quelques accélérations courtes, allure objectif, repos complet',
};

const INTENSITY = {
  long: 'allure très facile, nutrition testée comme en course',
  easy: 'zone 2, conversation possible',
  recovery: 'très facile, 30 à 45 min',
};

const PHASE_FOCUS = {
  Socle: 'Endurance facile, régularité, technique.',
  Spécifique: 'Allure objectif, sorties longues progressives, ravitaillement.',
  Pic: 'Séance clé contrôlée, répétition générale du matériel et de la nutrition.',
  Affûtage: 'Volume réduit, intensité entretenue, sommeil prioritaire.',
};

const pad = value => String(value).padStart(2, '0');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

const toIsoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function parseLocalDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function mondayOf(date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function countWeeks(raceDate, now) {
  const race = parseLocalDate(raceDate);
  if (!race) return { weeks: DEFAULT_WEEKS, note: 'Pas de date de course : plan indicatif sur 12 semaines.' };
  if (race <= now) return { weeks: DEFAULT_WEEKS, note: 'Date de course passée : plan indicatif sur 12 semaines.' };
  const raw = Math.floor((race - mondayOf(now)) / WEEK_MS) + 1;
  const weeks = clamp(raw, MIN_WEEKS, MAX_WEEKS);
  if (raw < MIN_WEEKS) return { weeks, note: 'Course dans moins de 4 semaines : le plan reste indicatif.' };
  if (raw > MAX_WEEKS) return { weeks, note: 'Plus de 30 semaines avant la course : plan limité à 30 semaines.' };
  return { weeks, note: null };
}

function baselineVolume(sport, summary) {
  if (sport === 'triathlon') {
    const hours = ['running', 'cycling', 'swimming']
      .reduce((sum, key) => sum + (Number(summary?.bySport?.[key]?.weeklyHours) || 0), 0);
    return hours > 0 ? hours : DEFAULT_WEEKLY_HOURS;
  }
  const km = Number(summary?.bySport?.[sport]?.weeklyKm);
  return km > 0 ? km : DEFAULT_WEEKLY_KM[sport];
}

function peakVolume({ sport, baseline, distanceKm, elevationGainM, targetMinutes }) {
  if (sport === 'triathlon') {
    const target = ((Number(targetMinutes) || 0) / 60) * 1.1;
    return Math.max(baseline, Math.min(target, baseline * MAX_RAMP));
  }
  const climbBonus = 1 + Math.min(0.3, (Number(elevationGainM) || 0) / 5000);
  const target = (Number(distanceKm) || 0) * RACE_VOLUME_FACTOR[sport] * climbBonus;
  return Math.max(baseline, Math.min(target, baseline * MAX_RAMP));
}

function minutesPerKm(sport, summary) {
  const stats = summary?.bySport?.[sport];
  if (sport === 'cycling' && stats?.avgSpeedKmh > 0) return 60 / stats.avgSpeedKmh;
  if (sport !== 'cycling' && stats?.avgPaceMinKm > 0) return stats.avgPaceMinKm;
  return MINUTES_PER_KM[sport];
}

function phaseLayout(weeks) {
  const taper = weeks >= 8 ? 2 : 1;
  const body = weeks - taper;
  const socle = Math.max(1, Math.round(body * 0.4));
  const specific = Math.max(1, Math.round(body * 0.4));
  return { taper, body, socle, specific };
}

function phaseOf(index, { body, socle, specific }) {
  if (index >= body) return 'Affûtage';
  if (index < socle) return 'Socle';
  if (index < socle + specific) return 'Spécifique';
  return 'Pic';
}

function weekVolume(index, { body, taper }, baseline, peak) {
  if (index >= body) return peak * TAPER_FACTORS[taper][index - body];
  const progress = body > 1 ? index / (body - 1) : 1;
  const raw = baseline + (peak - baseline) * progress;
  const recovery = (index + 1) % 4 === 0;
  return recovery ? raw * RECOVERY_FACTOR : raw;
}

function buildSessions({ sport, phase, volume, count, isRecovery, summary }) {
  const types = LAYOUTS[count].map(type => (isRecovery && type === 'key' ? 'easy' : type));
  const volumeTypes = types.filter(type => VOLUME_WEIGHT[type]);
  const weightSum = volumeTypes.reduce((sum, type) => sum + VOLUME_WEIGHT[type], 0) || 1;
  const isTriathlon = sport === 'triathlon';
  const strengthCount = types.filter(type => type === 'strength').length;
  const totalMinutes = isTriathlon ? volume * 60 - strengthCount * STRENGTH_MINUTES : null;
  const perKm = minutesPerKm(sport, summary);

  return types.map((type, position) => {
    const dayIndex = Math.round((position * 6) / (count - 1));
    const day = DAYS[dayIndex];
    const title = TITLES[sport][type];

    if (type === 'strength') {
      return { day, type, title, detail: `Gainage, mobilité et renforcement, ${STRENGTH_MINUTES} min`, durationMinutes: STRENGTH_MINUTES };
    }

    const intensity = type === 'key' ? KEY_DETAIL[phase] : INTENSITY[type];
    const share = (VOLUME_WEIGHT[type] / weightSum);

    if (isTriathlon) {
      const minutes = Math.max(20, Math.round((totalMinutes * share) / 5) * 5);
      return { day, type, title, detail: `${round(minutes / 60)} h · ${intensity}`, durationMinutes: minutes };
    }

    const km = round(volume * share);
    const minutes = Math.round((km * perKm) / 5) * 5;
    return { day, type, title, detail: `${km} km · ${intensity}`, durationMinutes: minutes };
  });
}

/**
 * @param {{ sport: string, raceDate?: string|null, sessionsPerWeek?: number, targetMinutes?: number|null,
 *   distanceKm?: number|null, elevationGainM?: number|null, summary?: object|null, now?: Date }} params
 * @returns {{ sport: string, weeksCount: number, note: string|null, unit: 'km'|'h', weeks: object[] }}
 */
export function buildTrainingPlan({ sport, raceDate, sessionsPerWeek = 4, targetMinutes, distanceKm, elevationGainM, summary = null, now = new Date() }) {
  const { weeks: weeksCount, note } = countWeeks(raceDate, now);
  const count = clamp(Math.round(Number(sessionsPerWeek) || 4), 2, 7);
  const baseline = baselineVolume(sport, summary);
  const peak = peakVolume({ sport, baseline, distanceKm, elevationGainM, targetMinutes });
  const layout = phaseLayout(weeksCount);
  const monday = mondayOf(now);
  const isTriathlon = sport === 'triathlon';

  const weeks = Array.from({ length: weeksCount }, (_, index) => {
    const phase = phaseOf(index, layout);
    const isRecovery = index < layout.body && (index + 1) % 4 === 0;
    const volume = round(weekVolume(index, layout, baseline, peak), 1);
    const focus = `${PHASE_FOCUS[phase]}${isRecovery ? ' Semaine allégée (−30 %).' : ''}`;
    const sessions = buildSessions({ sport, phase, volume, count, isRecovery, summary });
    return {
      index: index + 1,
      startDate: toIsoDate(addDays(monday, index * 7)),
      phase,
      isRecovery,
      ...(isTriathlon ? { volumeHours: volume } : { volumeKm: volume }),
      focus,
      sessions,
    };
  });

  return { sport, weeksCount, note, unit: isTriathlon ? 'h' : 'km', weeks };
}
