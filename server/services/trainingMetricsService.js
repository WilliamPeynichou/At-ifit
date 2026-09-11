const SEC_PER_DAY = 86400;
const ATL_TIME_CONSTANT_DAYS = 7;
const CTL_TIME_CONSTANT_DAYS = 42;
const ATL_DECAY = Math.exp(-1 / ATL_TIME_CONSTANT_DAYS);
const CTL_DECAY = Math.exp(-1 / CTL_TIME_CONSTANT_DAYS);
const PMC_BOOTSTRAP_DAYS = CTL_TIME_CONSTANT_DAYS * 3;

function startOfUtcDay(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDate(value) {
  return startOfUtcDay(value).toISOString().slice(0, 10);
}

/**
 * Charge cardio de Banister utilisée uniquement quand Strava ne fournit pas
 * de sufferScore. La réserve cardiaque est bornée à [0, 1] pour éviter qu'une
 * FC aberrante ne produise une charge exponentielle démesurée.
 */
function activityLoad(activity, hrMax, hrRest) {
  const sufferScore = Number(activity?.sufferScore);
  if (Number.isFinite(sufferScore) && sufferScore > 0) return sufferScore;

  const averageHeartrate = Number(activity?.averageHeartrate);
  const movingTime = Number(activity?.movingTime);
  const effectiveHrMax = Number(hrMax);
  const effectiveHrRest = Number(hrRest);
  if (
    !Number.isFinite(averageHeartrate)
    || !Number.isFinite(movingTime)
    || movingTime <= 0
    || !Number.isFinite(effectiveHrMax)
    || !Number.isFinite(effectiveHrRest)
    || effectiveHrMax <= effectiveHrRest
  ) return null;

  const heartRateReserve = Math.min(1, Math.max(0,
    (averageHeartrate - effectiveHrRest) / (effectiveHrMax - effectiveHrRest)
  ));
  if (heartRateReserve === 0) return 0;

  const durationMinutes = movingTime / 60;
  return Math.round(
    durationMinutes
    * heartRateReserve
    * 0.64
    * Math.exp(1.92 * heartRateReserve)
  );
}

/**
 * Implémentation canonique du Performance Management Chart.
 * ATL/CTL utilisent la décroissance continue exp(-1/N), avec TSB = CTL - ATL.
 */
function computePerformanceManagementChart(activities, {
  startDate,
  endDate = new Date(),
  hrMax,
  hrRest,
} = {}) {
  const end = startOfUtcDay(endDate);
  const requestedStart = startDate
    ? startOfUtcDay(startDate)
    : (activities || []).reduce((earliest, activity) => {
      if (!activity?.startDate) return earliest;
      const date = startOfUtcDay(activity.startDate);
      if (Number.isNaN(date.getTime()) || date > end) return earliest;
      return !earliest || date < earliest ? date : earliest;
    }, null);
  if (!requestedStart || requestedStart > end) return [];

  const datedActivities = (activities || []).filter(activity => {
    if (!activity?.startDate) return false;
    const date = startOfUtcDay(activity.startDate);
    return !Number.isNaN(date.getTime()) && date >= requestedStart && date <= end;
  });

  const dailyLoads = new Map();
  for (const activity of datedActivities) {
    const key = isoDate(activity.startDate);
    const load = activityLoad(activity, hrMax, hrRest) ?? 0;
    dailyLoads.set(key, (dailyLoads.get(key) || 0) + load);
  }

  let atl = 0;
  let ctl = 0;
  const curve = [];
  for (let cursor = new Date(requestedStart); cursor <= end; cursor = new Date(cursor.getTime() + SEC_PER_DAY * 1000)) {
    const date = isoDate(cursor);
    const load = dailyLoads.get(date) || 0;
    atl = (atl * ATL_DECAY) + (load * (1 - ATL_DECAY));
    ctl = (ctl * CTL_DECAY) + (load * (1 - CTL_DECAY));
    curve.push({
      date,
      load,
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
  }

  return curve;
}

module.exports = {
  ATL_DECAY,
  CTL_DECAY,
  PMC_BOOTSTRAP_DAYS,
  ATL_TIME_CONSTANT_DAYS,
  CTL_TIME_CONSTANT_DAYS,
  activityLoad,
  computePerformanceManagementChart,
  isoDate,
  startOfUtcDay,
};
