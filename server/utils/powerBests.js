/**
 * Calculs purs de puissance (sans dépendance DB).
 * Cœur des algorithmes déplacés depuis stravaAnalytics.js (computeMeanMaxPower)
 * et cyclingProfileService.js (bestAveragePower) : ré-exportés depuis leurs
 * modules d'origine, signatures inchangées.
 */

const MMP_DURATIONS = [1, 5, 15, 30, 60, 300, 600, 1200, 1800, 3600];
const BEST20_DURATION_SEC = 1200;

/**
 * Mean-Max Power : meilleure puissance soutenue pour chaque durée.
 * À partir de tous les streams watts fournis.
 */
function computeMeanMaxPower(streamRows) {
  const durations = MMP_DURATIONS;
  const bests = new Map(durations.map(d => [d, 0]));

  for (const row of streamRows) {
    const watts = row.watts;
    const time = row.time;
    if (!watts || !time || watts.length < 5) continue;

    // Pour chaque durée cible, glissement
    for (const dur of durations) {
      let bestForRow = 0;
      let sum = 0;
      let windowStart = 0;

      for (let i = 0; i < watts.length; i++) {
        sum += watts[i] || 0;
        while (windowStart < i && time[i] - time[windowStart] > dur) {
          sum -= watts[windowStart] || 0;
          windowStart++;
        }
        const windowDur = time[i] - time[windowStart];
        if (windowDur >= dur * 0.95) {
          const avg = sum / (i - windowStart + 1);
          if (avg > bestForRow) bestForRow = avg;
        }
      }
      if (bestForRow > bests.get(dur)) bests.set(dur, bestForRow);
    }
  }

  return Array.from(bests.entries()).map(([duration, power]) => ({
    duration,
    power: Math.round(power),
  }));
}

/**
 * Meilleure moyenne glissante sur une durée donnée (secondes).
 */
function bestAveragePower(watts, time, durationSec) {
  if (!Array.isArray(watts) || !Array.isArray(time) || watts.length < 2 || watts.length !== time.length) return 0;

  let best = 0;
  let sum = 0;
  let windowStart = 0;

  for (let i = 0; i < watts.length; i++) {
    sum += Number(watts[i]) || 0;

    while (windowStart < i && time[i] - time[windowStart] > durationSec) {
      sum -= Number(watts[windowStart]) || 0;
      windowStart += 1;
    }

    const windowDur = time[i] - time[windowStart];
    if (windowDur >= durationSec * 0.95) {
      best = Math.max(best, sum / (i - windowStart + 1));
    }
  }

  return best;
}

/**
 * Pré-calcul par activité, stocké dans Activities.powerBests.
 * Retourne null si l'activité n'a pas de watts.
 *  - mmp : { '1': w, '5': w, …, '3600': w } = computeMeanMaxPower([{ watts, time }])
 *  - best20 : bestAveragePower(watts, time, 1200)
 */
function computeActivityPowerBests(watts, time) {
  if (!watts || !time) return null;
  const row = { watts, time };
  const mmp = {};
  for (const { duration, power } of computeMeanMaxPower([row])) {
    mmp[String(duration)] = power;
  }
  return {
    mmp,
    best20: bestAveragePower(watts, time, BEST20_DURATION_SEC),
  };
}

module.exports = {
  MMP_DURATIONS,
  BEST20_DURATION_SEC,
  computeMeanMaxPower,
  bestAveragePower,
  computeActivityPowerBests,
};
