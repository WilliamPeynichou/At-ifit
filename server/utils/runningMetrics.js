const { round } = require('./runningFormatting');

const RUNNING_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun', 'TrackRun']);
const MS_PER_DAY = 86400000;

function numeric(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function optionalNumber(...values) {
  const value = numeric(...values);
  return value && value > 0 ? value : undefined;
}

function getRaw(activity) {
  const plain = typeof activity?.toJSON === 'function' ? activity.toJSON() : activity;
  return plain || {};
}

function isRunningActivity(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const type = a.type || a.rawType || raw.type;
  const sportType = a.sportType || a.sport_type || raw.sport_type;
  return RUNNING_TYPES.has(type) || RUNNING_TYPES.has(sportType);
}

function calculateTrainingLoad(activity, estimatedMaxHeartRate = 190) {
  const movingTimeMinutes = numeric(activity?.movingTimeMinutes, activity?.movingTime, activity?.moving_time);
  if (!movingTimeMinutes || movingTimeMinutes <= 0) return 0;

  const averageHeartRate = numeric(activity?.averageHeartRate, activity?.averageHeartrate, activity?.average_heartrate);
  if (averageHeartRate && estimatedMaxHeartRate) {
    return round(movingTimeMinutes * (averageHeartRate / estimatedMaxHeartRate), 1) || 0;
  }

  const pace = numeric(activity?.averagePaceMinKm);
  if (!pace || pace <= 0) return round(movingTimeMinutes, 1) || 0;

  let paceIntensityFactor = 0.7;
  if (pace <= 4.5) paceIntensityFactor = 1.1;
  else if (pace <= 5.5) paceIntensityFactor = 1.0;
  else if (pace <= 6.5) paceIntensityFactor = 0.85;

  return round(movingTimeMinutes * paceIntensityFactor, 1) || 0;
}

function normalizeStravaActivity(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const id = String(a.stravaId || a.id || raw.id || '');
  const startDate = a.startDate || a.start_date || raw.start_date || raw.start_date_local || null;
  const distanceMeters = numeric(a.distance, raw.distance) || 0;
  const movingTimeSeconds = numeric(a.movingTime, a.moving_time, raw.moving_time);
  const elapsedTimeSeconds = numeric(a.elapsedTime, a.elapsed_time, raw.elapsed_time);
  const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : 0;
  const movingTimeMinutes = movingTimeSeconds ? movingTimeSeconds / 60 : 0;
  const elapsedTimeMinutes = elapsedTimeSeconds ? elapsedTimeSeconds / 60 : movingTimeMinutes;
  const averageSpeedMs = numeric(a.averageSpeed, a.average_speed, raw.average_speed);
  const maxSpeedMs = numeric(a.maxSpeed, a.max_speed, raw.max_speed);
  const averagePaceMinKm = distanceKm > 0 && movingTimeMinutes > 0 ? movingTimeMinutes / distanceKm : null;

  const normalized = {
    id,
    name: a.name || raw.name || 'Course',
    date: startDate ? new Date(startDate).toISOString().slice(0, 10) : null,
    startDate,
    distanceKm: round(distanceKm, 3) || 0,
    movingTimeMinutes: round(movingTimeMinutes, 2) || 0,
    elapsedTimeMinutes: round(elapsedTimeMinutes, 2) || 0,
    averagePaceMinKm: averagePaceMinKm ? round(averagePaceMinKm, 4) : null,
    averageSpeedKmh: averageSpeedMs ? round(averageSpeedMs * 3.6, 2) : (movingTimeMinutes > 0 ? round(distanceKm / (movingTimeMinutes / 60), 2) : null),
    maxSpeedKmh: maxSpeedMs ? round(maxSpeedMs * 3.6, 2) : undefined,
    elevationGain: round(numeric(a.totalElevationGain, a.total_elevation_gain, raw.total_elevation_gain) || 0, 1) || 0,
    averageHeartRate: optionalNumber(a.averageHeartRate, a.averageHeartrate, a.average_heartrate, raw.average_heartrate),
    maxHeartRate: optionalNumber(a.maxHeartRate, a.maxHeartrate, a.max_heartrate, raw.max_heartrate),
    calories: optionalNumber(a.calories, raw.calories),
    sufferScore: optionalNumber(a.sufferScore, a.suffer_score, raw.suffer_score),
    cadence: optionalNumber(a.averageCadence, a.average_cadence, raw.average_cadence),
    deviceName: a.deviceName || a.device_name || raw.device_name || undefined,
    sportType: a.sportType || a.sport_type || raw.sport_type || undefined,
    rawType: a.type || raw.type || undefined,
    bestEfforts: a.bestEfforts || a.best_efforts || raw.best_efforts || undefined,
    splitsMetric: a.splitsMetric || a.splits_metric || raw.splits_metric || undefined,
  };

  normalized.trainingLoad = calculateTrainingLoad(normalized);
  normalized.trainingLoadSource = normalized.averageHeartRate ? 'heart_rate' : 'estimated_without_hr';
  return normalized;
}

function filterRunningActivities(activities) {
  return (activities || [])
    .filter(isRunningActivity)
    .map(normalizeStravaActivity)
    .filter(activity => activity.startDate && activity.movingTimeMinutes > 0)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizePeriod(period = {}) {
  const preset = period.preset || period.period || '30D';
  const now = period.now ? new Date(period.now) : new Date();
  let from = null;
  let to = endOfDay(period.to || now);

  if (preset === 'CUSTOM') {
    from = period.from ? startOfDay(period.from) : null;
    to = period.to ? endOfDay(period.to) : to;
  } else if (preset === '7D') {
    from = startOfDay(addDays(to, -6));
  } else if (preset === '30D') {
    from = startOfDay(addDays(to, -29));
  } else if (preset === '90D') {
    from = startOfDay(addDays(to, -89));
  } else if (preset === '6M') {
    from = startOfDay(addMonths(to, -6));
  } else if (preset === 'YTD') {
    from = startOfDay(new Date(to.getFullYear(), 0, 1));
  } else if (preset === 'ALL') {
    to = null;
  }

  return {
    preset,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };
}

function filterActivitiesByPeriod(activities, period = {}) {
  const normalizedPeriod = normalizePeriod(period);
  const fromMs = normalizedPeriod.from ? new Date(normalizedPeriod.from).getTime() : -Infinity;
  const toMs = normalizedPeriod.to ? new Date(normalizedPeriod.to).getTime() : Infinity;
  return (activities || []).filter(activity => {
    const time = new Date(activity.startDate).getTime();
    return Number.isFinite(time) && time >= fromMs && time <= toMs;
  });
}

function getPreviousPeriod(period = {}) {
  const current = normalizePeriod(period);
  if (!current.from || !current.to || current.preset === 'ALL') return null;

  const from = new Date(current.from);
  const to = new Date(current.to);

  if (current.preset === 'YTD') {
    const prevFrom = new Date(from);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(to);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { preset: 'CUSTOM', from: prevFrom.toISOString(), to: prevTo.toISOString() };
  }

  const duration = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - duration);
  return { preset: 'CUSTOM', from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

function sum(activities, selector) {
  return activities.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function calculateAveragePace(activities) {
  const totalDistanceKm = sum(activities, a => a.distanceKm);
  const totalMovingTimeMinutes = sum(activities, a => a.movingTimeMinutes);
  return totalDistanceKm > 0 ? totalMovingTimeMinutes / totalDistanceKm : null;
}

function weightedAverageHeartRate(activities) {
  const withHr = activities.filter(a => a.averageHeartRate);
  const duration = sum(withHr, a => a.movingTimeMinutes);
  if (duration > 0) {
    return sum(withHr, a => a.averageHeartRate * a.movingTimeMinutes) / duration;
  }
  return withHr.length ? sum(withHr, a => a.averageHeartRate) / withHr.length : null;
}

function weeksBetween(activities) {
  if (!activities.length) return 0;
  const first = startOfDay(activities[0].startDate);
  const last = endOfDay(activities[activities.length - 1].startDate);
  return Math.max(1, Math.ceil((last - first + 1) / (7 * MS_PER_DAY)));
}

function calculateGlobalStats(activities) {
  const totalDistanceKm = sum(activities, a => a.distanceKm);
  const totalMovingTimeMinutes = sum(activities, a => a.movingTimeMinutes);
  const averagePaceMinKm = calculateAveragePace(activities);
  const averageSpeedKmh = totalMovingTimeMinutes > 0 ? totalDistanceKm / (totalMovingTimeMinutes / 60) : null;
  const heartRateActivities = activities.filter(a => a.averageHeartRate);
  const longestRun = activities.reduce((best, a) => !best || a.distanceKm > best.distanceKm ? a : best, null);
  const bestPaceRun = activities
    .filter(a => a.distanceKm > 1 && a.averagePaceMinKm)
    .reduce((best, a) => !best || a.averagePaceMinKm < best.averagePaceMinKm ? a : best, null);
  const weekCount = weeksBetween(activities);

  return {
    activityCount: activities.length,
    totalDistanceKm: round(totalDistanceKm, 2) || 0,
    totalMovingTimeMinutes: round(totalMovingTimeMinutes, 1) || 0,
    averagePaceMinKm: averagePaceMinKm ? round(averagePaceMinKm, 4) : null,
    averageSpeedKmh: averageSpeedKmh ? round(averageSpeedKmh, 2) : null,
    averageHeartRate: heartRateActivities.length ? Math.round(weightedAverageHeartRate(activities)) : null,
    heartRateCoverage: activities.length ? round(heartRateActivities.length / activities.length, 3) : 0,
    totalElevationGain: Math.round(sum(activities, a => a.elevationGain)),
    totalCalories: activities.some(a => a.calories) ? Math.round(sum(activities, a => a.calories)) : null,
    totalTrainingLoad: round(sum(activities, a => a.trainingLoad), 1) || 0,
    averageRunsPerWeek: weekCount ? round(activities.length / weekCount, 2) : 0,
    longestRun,
    bestPaceRun,
    weekCount,
  };
}

function relativeChange(current, previous) {
  if (!Number.isFinite(Number(current)) || !Number.isFinite(Number(previous)) || Number(previous) === 0) return null;
  return (Number(current) - Number(previous)) / Number(previous);
}

function calculateComparisonStats(currentActivities, previousActivities) {
  const current = calculateGlobalStats(currentActivities);
  const previous = calculateGlobalStats(previousActivities);
  return {
    current,
    previous,
    deltas: {
      distance: relativeChange(current.totalDistanceKm, previous.totalDistanceKm),
      activityCount: relativeChange(current.activityCount, previous.activityCount),
      movingTime: relativeChange(current.totalMovingTimeMinutes, previous.totalMovingTimeMinutes),
      paceSeconds: current.averagePaceMinKm && previous.averagePaceMinKm
        ? Math.round((current.averagePaceMinKm - previous.averagePaceMinKm) * 60)
        : null,
      speed: relativeChange(current.averageSpeedKmh, previous.averageSpeedKmh),
      heartRate: current.averageHeartRate && previous.averageHeartRate
        ? current.averageHeartRate - previous.averageHeartRate
        : null,
      elevation: relativeChange(current.totalElevationGain, previous.totalElevationGain),
      calories: relativeChange(current.totalCalories, previous.totalCalories),
      load: relativeChange(current.totalTrainingLoad, previous.totalTrainingLoad),
      runsPerWeek: relativeChange(current.averageRunsPerWeek, previous.averageRunsPerWeek),
    },
    available: previousActivities.length > 0,
  };
}

function mondayOf(dateValue) {
  const d = startOfDay(dateValue);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function calculateWeeklyStats(activities) {
  const byWeek = new Map();
  for (const activity of activities) {
    const weekStartDate = mondayOf(activity.startDate);
    const weekStart = dateKey(weekStartDate);
    const weekEnd = dateKey(addDays(weekStartDate, 6));
    if (!byWeek.has(weekStart)) {
      byWeek.set(weekStart, {
        weekStart,
        weekEnd,
        label: weekStartDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        activities: [],
        totalDistanceKm: 0,
        totalMovingTimeMinutes: 0,
        activityCount: 0,
        averageDistanceKm: 0,
        averagePaceMinKm: null,
        averageHeartRate: null,
        totalElevationGain: 0,
        trainingLoad: 0,
      });
    }
    const week = byWeek.get(weekStart);
    week.activities.push(activity);
    week.totalDistanceKm += activity.distanceKm || 0;
    week.totalMovingTimeMinutes += activity.movingTimeMinutes || 0;
    week.activityCount += 1;
    week.totalElevationGain += activity.elevationGain || 0;
    week.trainingLoad += activity.trainingLoad || 0;
  }

  return Array.from(byWeek.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(week => ({
      ...week,
      totalDistanceKm: round(week.totalDistanceKm, 2) || 0,
      totalMovingTimeMinutes: round(week.totalMovingTimeMinutes, 1) || 0,
      averageDistanceKm: week.activityCount ? round(week.totalDistanceKm / week.activityCount, 2) : 0,
      averagePaceMinKm: calculateAveragePace(week.activities),
      averageHeartRate: weightedAverageHeartRate(week.activities) ? Math.round(weightedAverageHeartRate(week.activities)) : null,
      totalElevationGain: Math.round(week.totalElevationGain),
      trainingLoad: round(week.trainingLoad, 1) || 0,
      activities: undefined,
    }));
}

function calculateHeartRateStats(activities) {
  const withHr = activities.filter(a => a.averageHeartRate);
  const byCategory = { short: [], medium: [], long: [] };
  withHr.forEach(activity => {
    if (activity.distanceKm < 6) byCategory.short.push(activity);
    else if (activity.distanceKm < 12) byCategory.medium.push(activity);
    else byCategory.long.push(activity);
  });
  return {
    coverage: activities.length ? round(withHr.length / activities.length, 3) : 0,
    count: withHr.length,
    averageHeartRate: withHr.length ? Math.round(weightedAverageHeartRate(withHr)) : null,
    maxHeartRateObserved: withHr.reduce((max, a) => Math.max(max, a.maxHeartRate || a.averageHeartRate || 0), 0) || null,
    byDistanceCategory: Object.fromEntries(Object.entries(byCategory).map(([key, list]) => [
      key,
      list.length ? Math.round(weightedAverageHeartRate(list)) : null,
    ])),
  };
}

function calculatePaceHeartRateTrend(activities) {
  const withHr = activities.filter(a => a.averageHeartRate && a.averagePaceMinKm);
  if (withHr.length < 4) return { available: false, message: 'Données insuffisantes pour comparer allure et cardio.' };
  const midpoint = Math.floor(withHr.length / 2);
  const first = withHr.slice(0, midpoint);
  const second = withHr.slice(midpoint);
  const firstPace = calculateAveragePace(first);
  const secondPace = calculateAveragePace(second);
  const firstHr = weightedAverageHeartRate(first);
  const secondHr = weightedAverageHeartRate(second);
  return {
    available: true,
    paceDeltaSeconds: firstPace && secondPace ? Math.round((secondPace - firstPace) * 60) : null,
    heartRateDelta: firstHr && secondHr ? Math.round(secondHr - firstHr) : null,
    first: { pace: firstPace, heartRate: firstHr },
    second: { pace: secondPace, heartRate: secondHr },
  };
}

function calculateTrainingLoadRatio(weeklyStats) {
  return weeklyStats.map((week, index) => {
    const previous = weeklyStats.slice(Math.max(0, index - 4), index);
    const previousAverage = previous.length ? sum(previous, w => w.trainingLoad) / previous.length : null;
    const ratio = previousAverage ? week.trainingLoad / previousAverage : null;
    let status = 'indisponible';
    if (ratio !== null) {
      if (ratio < 0.8) status = 'charge faible';
      else if (ratio <= 1.3) status = 'charge cohérente';
      else if (ratio <= 1.5) status = 'hausse importante';
      else status = 'risque de surcharge';
    }
    return {
      weekStart: week.weekStart,
      label: week.label,
      trainingLoad: week.trainingLoad,
      previousAverage: previousAverage ? round(previousAverage, 1) : null,
      ratio: ratio ? round(ratio, 2) : null,
      status,
    };
  });
}

function calculateRegularityScore(activities) {
  const weeklyStats = calculateWeeklyStats(activities);
  const totalWeeks = weeksBetween(activities);
  const activeWeeks = weeklyStats.filter(w => w.activityCount > 0).length;
  const weeksWithAtLeastTwoRuns = weeklyStats.filter(w => w.activityCount >= 2).length;
  const score = totalWeeks ? weeksWithAtLeastTwoRuns / totalWeeks : 0;
  const ordered = [...activities].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const gaps = [];
  for (let i = 1; i < ordered.length; i += 1) {
    gaps.push(Math.round((new Date(ordered[i].startDate) - new Date(ordered[i - 1].startDate)) / MS_PER_DAY));
  }
  let interpretation = 'données insuffisantes';
  if (score > 0.8) interpretation = 'très régulier';
  else if (score >= 0.6) interpretation = 'régulier';
  else if (score >= 0.4) interpretation = 'irrégulier';
  else if (totalWeeks > 0) interpretation = 'manque de régularité';

  return {
    regularityScore: round(score, 3),
    totalWeeks,
    activeWeeks,
    weeksWithAtLeastTwoRuns,
    averageDaysBetweenRuns: gaps.length ? round(sum(gaps, v => v) / gaps.length, 1) : null,
    longestGapDays: gaps.length ? Math.max(...gaps) : null,
    interpretation,
  };
}

function detectLongRuns(activities, weeklyStats) {
  return weeklyStats.map(week => {
    const weekActivities = activities.filter(activity => {
      const date = new Date(activity.startDate);
      return date >= new Date(`${week.weekStart}T00:00:00`) && date <= new Date(`${week.weekEnd}T23:59:59`);
    });
    const activity = weekActivities.reduce((best, a) => !best || a.distanceKm > best.distanceKm ? a : best, null);
    const share = activity && week.totalDistanceKm ? activity.distanceKm / week.totalDistanceKm : null;
    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      label: week.label,
      activity,
      longRunDistanceKm: activity ? activity.distanceKm : 0,
      shareOfWeeklyVolume: share ? round(share, 3) : null,
      alert: share ? share > 0.4 : false,
    };
  });
}

function bestBy(list, selector, direction = 'max') {
  return list.reduce((best, item) => {
    const value = selector(item);
    if (!Number.isFinite(Number(value))) return best;
    if (!best) return item;
    return direction === 'min'
      ? (value < selector(best) ? item : best)
      : (value > selector(best) ? item : best);
  }, null);
}

function detectPersonalBests(activities, weeklyStats) {
  const shortRuns = activities.filter(a => a.distanceKm < 6 && a.distanceKm > 1 && a.averagePaceMinKm);
  const mediumRuns = activities.filter(a => a.distanceKm >= 6 && a.distanceKm < 12 && a.averagePaceMinKm);
  const longRuns = activities.filter(a => a.distanceKm >= 12 && a.averagePaceMinKm);
  const lowHrFast = activities
    .filter(a => a.averageHeartRate && a.averagePaceMinKm && a.distanceKm > 3)
    .map(a => ({ ...a, efficiencyScore: a.averageHeartRate * a.averagePaceMinKm }))
    .sort((a, b) => a.efficiencyScore - b.efficiencyScore)[0] || null;

  return {
    longestDistance: bestBy(activities, a => a.distanceKm),
    longestDuration: bestBy(activities, a => a.movingTimeMinutes),
    bestAveragePace: bestBy(activities.filter(a => a.distanceKm > 1), a => a.averagePaceMinKm, 'min'),
    highestElevation: bestBy(activities, a => a.elevationGain),
    biggestDistanceWeek: bestBy(weeklyStats, w => w.totalDistanceKm),
    biggestLoadWeek: bestBy(weeklyStats, w => w.trainingLoad),
    efficientHeartRateRun: lowHrFast,
    bestShortRun: bestBy(shortRuns, a => a.averagePaceMinKm, 'min'),
    bestMediumRun: bestBy(mediumRuns, a => a.averagePaceMinKm, 'min'),
    bestLongRun: bestBy(longRuns, a => a.averagePaceMinKm, 'min'),
    splitRecordsAvailable: activities.some(a => Array.isArray(a.splitsMetric) || Array.isArray(a.bestEfforts)),
  };
}

function calculateElevationStats(activities) {
  const totalElevationGain = sum(activities, a => a.elevationGain);
  const ratios = activities
    .filter(a => a.distanceKm > 0)
    .map(a => ({ ...a, elevationRatio: a.elevationGain / a.distanceKm }));
  return {
    totalElevationGain: Math.round(totalElevationGain),
    averageElevationGain: activities.length ? Math.round(totalElevationGain / activities.length) : 0,
    averageElevationRatio: ratios.length ? round(sum(ratios, a => a.elevationRatio) / ratios.length, 1) : null,
    highestElevationRun: bestBy(activities, a => a.elevationGain),
  };
}

function pearson(points, xKey, yKey) {
  const clean = points
    .map(point => [Number(point[xKey]), Number(point[yKey])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (clean.length < 3) return null;
  const meanX = sum(clean, p => p[0]) / clean.length;
  const meanY = sum(clean, p => p[1]) / clean.length;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  clean.forEach(([x, y]) => {
    numerator += (x - meanX) * (y - meanY);
    denomX += (x - meanX) ** 2;
    denomY += (y - meanY) ** 2;
  });
  const denominator = Math.sqrt(denomX * denomY);
  return denominator ? round(numerator / denominator, 3) : null;
}

function calculateCorrelations(activities, weeklyStats) {
  const points = activities.map(activity => ({
    ...activity,
    elevationRatio: activity.distanceKm > 0 ? activity.elevationGain / activity.distanceKm : null,
  }));

  return {
    paceVsHeartRate: pearson(points, 'averagePaceMinKm', 'averageHeartRate'),
    distanceVsPace: pearson(points, 'distanceKm', 'averagePaceMinKm'),
    elevationVsPace: pearson(points, 'elevationGain', 'averagePaceMinKm'),
    loadVsPace: pearson(points, 'trainingLoad', 'averagePaceMinKm'),
    distanceVsHeartRate: pearson(points, 'distanceKm', 'averageHeartRate'),
    elevationRatioVsPace: pearson(points, 'elevationRatio', 'averagePaceMinKm'),
    regularityVsProgression: pearson(weeklyStats.map((week, index) => ({
      activityCount: week.activityCount,
      averagePaceMinKm: week.averagePaceMinKm,
      index,
    })), 'activityCount', 'averagePaceMinKm'),
    scatter: {
      paceHeartRate: points.filter(p => p.averageHeartRate && p.averagePaceMinKm),
      distancePace: points.filter(p => p.averagePaceMinKm),
      elevationPace: points.filter(p => p.averagePaceMinKm),
      loadPace: points.filter(p => p.averagePaceMinKm),
    },
  };
}

module.exports = {
  RUNNING_TYPES,
  normalizeStravaActivity,
  filterRunningActivities,
  filterActivitiesByPeriod,
  getPreviousPeriod,
  calculateGlobalStats,
  calculateComparisonStats,
  calculateWeeklyStats,
  calculateAveragePace,
  calculateHeartRateStats,
  calculatePaceHeartRateTrend,
  calculateTrainingLoad,
  calculateTrainingLoadRatio,
  calculateRegularityScore,
  detectLongRuns,
  detectPersonalBests,
  calculateElevationStats,
  calculateCorrelations,
  isRunningActivity,
  normalizePeriod,
};
