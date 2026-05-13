const { round } = require('./swimmingFormatting');

const SWIMMING_TYPES = new Set(['Swim', 'PoolSwim', 'OpenWaterSwim']);
const MS_PER_DAY = 86400000;

function numeric(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function optionalNumber(...values) {
  const n = numeric(...values);
  return n && n > 0 ? n : undefined;
}

function getRaw(activity) {
  return typeof activity?.toJSON === 'function' ? activity.toJSON() : (activity || {});
}

function isSwimmingActivity(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  return SWIMMING_TYPES.has(a.type || raw.type) || SWIMMING_TYPES.has(a.sportType || a.sport_type || raw.sport_type);
}

function classifySwimType(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const type = a.type || a.rawType || raw.type || '';
  const sportType = a.sportType || a.sport_type || raw.sport_type || '';
  const name = String(a.name || raw.name || '').toLowerCase();
  if (type === 'PoolSwim' || sportType === 'PoolSwim' || name.includes('piscine') || name.includes('pool')) return 'pool';
  if (type === 'OpenWaterSwim' || sportType === 'OpenWaterSwim' || name.includes('eau libre') || name.includes('open water')) return 'open_water';
  return 'unknown';
}

function calculateSwimTrainingLoad(activity, userProfile = {}) {
  const movingTimeMinutes = numeric(activity?.movingTimeMinutes, activity?.movingTime, activity?.moving_time);
  if (!movingTimeMinutes || movingTimeMinutes <= 0) return 0;
  const hrMax = userProfile.estimatedMaxHeartRate || userProfile.hrMax || 190;
  const averageHeartRate = numeric(activity?.averageHeartRate, activity?.averageHeartrate, activity?.average_heartrate);
  if (averageHeartRate && hrMax) return round(movingTimeMinutes * (averageHeartRate / hrMax), 1) || 0;

  const pace = numeric(activity?.averagePaceMinPer100m);
  let paceIntensityFactor = 1;
  if (pace && pace > 0) {
    if (pace <= 1.5) paceIntensityFactor = 1.15;
    else if (pace <= 2) paceIntensityFactor = 1.05;
    else if (pace >= 3) paceIntensityFactor = 0.85;
  }
  return round(movingTimeMinutes * paceIntensityFactor, 1) || 0;
}

function normalizeStravaSwimmingActivity(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const distanceMeters = numeric(a.distance, raw.distance) || 0;
  const movingSeconds = numeric(a.movingTime, a.moving_time, raw.moving_time);
  const elapsedSeconds = numeric(a.elapsedTime, a.elapsed_time, raw.elapsed_time);
  const movingTimeMinutes = movingSeconds ? movingSeconds / 60 : 0;
  const elapsedTimeMinutes = elapsedSeconds ? elapsedSeconds / 60 : movingTimeMinutes;
  const averageSpeedMs = numeric(a.averageSpeed, a.average_speed, raw.average_speed);
  const maxSpeedMs = numeric(a.maxSpeed, a.max_speed, raw.max_speed);
  const averagePaceMinPer100m = distanceMeters > 0 && movingTimeMinutes > 0
    ? movingTimeMinutes / (distanceMeters / 100)
    : null;

  const normalized = {
    id: String(a.stravaId || a.id || raw.id || ''),
    name: a.name || raw.name || 'Natation',
    date: (a.startDate || a.start_date || raw.start_date) ? new Date(a.startDate || a.start_date || raw.start_date).toISOString().slice(0, 10) : null,
    localDate: raw.start_date_local || a.startDate || a.start_date || raw.start_date || null,
    startDate: a.startDate || a.start_date || raw.start_date || raw.start_date_local || null,
    distanceMeters: round(distanceMeters, 1) || 0,
    distanceKm: round(distanceMeters / 1000, 3) || 0,
    movingTimeMinutes: round(movingTimeMinutes, 2) || 0,
    elapsedTimeMinutes: round(elapsedTimeMinutes, 2) || 0,
    averagePaceMinPer100m: averagePaceMinPer100m ? round(averagePaceMinPer100m, 4) : null,
    averageSpeedKmh: averageSpeedMs ? round(averageSpeedMs * 3.6, 2) : (movingTimeMinutes > 0 ? round((distanceMeters / 1000) / (movingTimeMinutes / 60), 2) : null),
    maxSpeedKmh: maxSpeedMs ? round(maxSpeedMs * 3.6, 2) : undefined,
    averageHeartRate: optionalNumber(a.averageHeartRate, a.averageHeartrate, a.average_heartrate, raw.average_heartrate),
    maxHeartRate: optionalNumber(a.maxHeartRate, a.maxHeartrate, a.max_heartrate, raw.max_heartrate),
    calories: optionalNumber(a.calories, raw.calories),
    sufferScore: optionalNumber(a.sufferScore, a.suffer_score, raw.suffer_score),
    strokeRate: optionalNumber(a.averageCadence, a.average_cadence, raw.average_cadence),
    swolf: optionalNumber(raw.swolf, raw.average_swolf, a.swolf, a.averageSwolf),
    poolLengthMeters: optionalNumber(raw.pool_length, raw.pool_length_meters, a.poolLengthMeters),
    laps: Array.isArray(a.laps) ? a.laps.length : optionalNumber(raw.laps_count, a.lapsCount),
    deviceName: a.deviceName || a.device_name || raw.device_name || undefined,
    sportType: a.sportType || a.sport_type || raw.sport_type || undefined,
    rawType: a.type || raw.type || undefined,
    swimType: classifySwimType(a),
    workoutType: a.workoutType || a.workout_type || raw.workout_type || undefined,
    description: raw.description || a.description || undefined,
    timezone: raw.timezone || a.timezone || undefined,
    splitsMetric: a.splitsMetric || raw.splits_metric || undefined,
    bestEfforts: a.bestEfforts || raw.best_efforts || undefined,
  };
  normalized.trainingLoad = calculateSwimTrainingLoad(normalized);
  normalized.trainingLoadSource = normalized.averageHeartRate ? 'heart_rate' : 'estimated_without_hr';
  return normalized;
}

function filterSwimmingActivities(activities) {
  return (activities || [])
    .filter(isSwimmingActivity)
    .map(normalizeStravaSwimmingActivity)
    .filter(a => a.startDate && a.movingTimeMinutes > 0)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = new Date(value);
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
  } else if (preset === '7D') from = startOfDay(addDays(to, -6));
  else if (preset === '30D') from = startOfDay(addDays(to, -29));
  else if (preset === '90D') from = startOfDay(addDays(to, -89));
  else if (preset === '6M') from = startOfDay(addMonths(to, -6));
  else if (preset === 'YTD') from = startOfDay(new Date(to.getFullYear(), 0, 1));
  else if (preset === 'ALL') to = null;
  return { preset, from: from ? from.toISOString() : null, to: to ? to.toISOString() : null };
}

function filterActivitiesByPeriod(activities, period = {}) {
  const p = normalizePeriod(period);
  const fromMs = p.from ? new Date(p.from).getTime() : -Infinity;
  const toMs = p.to ? new Date(p.to).getTime() : Infinity;
  return (activities || []).filter(a => {
    const time = new Date(a.startDate).getTime();
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
    const prevTo = new Date(to);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { preset: 'CUSTOM', from: prevFrom.toISOString(), to: prevTo.toISOString() };
  }
  const duration = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  return { preset: 'CUSTOM', from: new Date(prevTo.getTime() - duration).toISOString(), to: prevTo.toISOString() };
}

function sum(list, selector) {
  return list.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function calculateAverageSwimPace(activities) {
  const distance = sum(activities, a => a.distanceMeters);
  const time = sum(activities, a => a.movingTimeMinutes);
  return distance > 0 ? time / (distance / 100) : null;
}

function weightedAverageHeartRate(activities) {
  const withHr = activities.filter(a => a.averageHeartRate);
  const duration = sum(withHr, a => a.movingTimeMinutes);
  if (duration > 0) return sum(withHr, a => a.averageHeartRate * a.movingTimeMinutes) / duration;
  return withHr.length ? sum(withHr, a => a.averageHeartRate) / withHr.length : null;
}

function weeksBetween(activities) {
  if (!activities.length) return 0;
  const first = startOfDay(activities[0].startDate);
  const last = endOfDay(activities[activities.length - 1].startDate);
  return Math.max(1, Math.ceil((last - first + 1) / (7 * MS_PER_DAY)));
}

function calculateSwimmingGlobalStats(activities) {
  const totalDistanceMeters = sum(activities, a => a.distanceMeters);
  const totalMovingTimeMinutes = sum(activities, a => a.movingTimeMinutes);
  const averagePaceMinPer100m = calculateAverageSwimPace(activities);
  const averageSpeedKmh = totalMovingTimeMinutes ? (totalDistanceMeters / 1000) / (totalMovingTimeMinutes / 60) : null;
  const weekCount = weeksBetween(activities);
  const withHr = activities.filter(a => a.averageHeartRate);
  const pool = activities.filter(a => a.swimType === 'pool');
  const openWater = activities.filter(a => a.swimType === 'open_water');
  const bestPaceSwim = activities.filter(a => a.distanceMeters >= 100 && a.averagePaceMinPer100m)
    .reduce((best, a) => !best || a.averagePaceMinPer100m < best.averagePaceMinPer100m ? a : best, null);
  return {
    activityCount: activities.length,
    totalDistanceMeters: round(totalDistanceMeters, 1) || 0,
    totalDistanceKm: round(totalDistanceMeters / 1000, 2) || 0,
    totalMovingTimeMinutes: round(totalMovingTimeMinutes, 1) || 0,
    averagePaceMinPer100m: averagePaceMinPer100m ? round(averagePaceMinPer100m, 4) : null,
    averageSpeedKmh: averageSpeedKmh ? round(averageSpeedKmh, 2) : null,
    averageDistanceMeters: activities.length ? round(totalDistanceMeters / activities.length, 1) : 0,
    averageDurationMinutes: activities.length ? round(totalMovingTimeMinutes / activities.length, 1) : 0,
    averageHeartRate: withHr.length ? Math.round(weightedAverageHeartRate(activities)) : null,
    heartRateCoverage: activities.length ? round(withHr.length / activities.length, 3) : 0,
    totalCalories: activities.some(a => a.calories) ? Math.round(sum(activities, a => a.calories)) : null,
    totalTrainingLoad: round(sum(activities, a => a.trainingLoad), 1) || 0,
    averageSwimsPerWeek: weekCount ? round(activities.length / weekCount, 2) : 0,
    longestSwim: activities.reduce((best, a) => !best || a.distanceMeters > best.distanceMeters ? a : best, null),
    longestDurationSwim: activities.reduce((best, a) => !best || a.movingTimeMinutes > best.movingTimeMinutes ? a : best, null),
    bestPaceSwim,
    poolSessionCount: pool.length,
    openWaterSessionCount: openWater.length,
    unknownSessionCount: activities.length - pool.length - openWater.length,
    poolDistanceMeters: sum(pool, a => a.distanceMeters),
    openWaterDistanceMeters: sum(openWater, a => a.distanceMeters),
    weekCount,
  };
}

function relativeChange(current, previous) {
  if (!Number.isFinite(Number(current)) || !Number.isFinite(Number(previous)) || Number(previous) === 0) return null;
  return (Number(current) - Number(previous)) / Number(previous);
}

function calculateSwimmingComparisonStats(currentActivities, previousActivities) {
  const current = calculateSwimmingGlobalStats(currentActivities);
  const previous = calculateSwimmingGlobalStats(previousActivities);
  return {
    current,
    previous,
    available: previousActivities.length > 0,
    deltas: {
      distance: relativeChange(current.totalDistanceMeters, previous.totalDistanceMeters),
      activityCount: relativeChange(current.activityCount, previous.activityCount),
      movingTime: relativeChange(current.totalMovingTimeMinutes, previous.totalMovingTimeMinutes),
      paceSeconds: current.averagePaceMinPer100m && previous.averagePaceMinPer100m
        ? Math.round((current.averagePaceMinPer100m - previous.averagePaceMinPer100m) * 60)
        : null,
      speed: relativeChange(current.averageSpeedKmh, previous.averageSpeedKmh),
      heartRate: current.averageHeartRate && previous.averageHeartRate ? current.averageHeartRate - previous.averageHeartRate : null,
      calories: relativeChange(current.totalCalories, previous.totalCalories),
      load: relativeChange(current.totalTrainingLoad, previous.totalTrainingLoad),
      swimsPerWeek: relativeChange(current.averageSwimsPerWeek, previous.averageSwimsPerWeek),
    },
  };
}

function mondayOf(dateValue) {
  const d = startOfDay(dateValue);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function calculateWeeklySwimStats(activities) {
  const byWeek = new Map();
  for (const activity of activities) {
    const weekStartDate = mondayOf(activity.startDate);
    const weekStart = dateKey(weekStartDate);
    if (!byWeek.has(weekStart)) {
      byWeek.set(weekStart, {
        weekStart,
        weekEnd: dateKey(addDays(weekStartDate, 6)),
        label: weekStartDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        activities: [],
        totalDistanceMeters: 0,
        totalDistanceKm: 0,
        totalMovingTimeMinutes: 0,
        activityCount: 0,
        averagePaceMinPer100m: null,
        averageHeartRate: null,
        trainingLoad: 0,
        longestSwimDistanceMeters: 0,
        poolSessionCount: 0,
        openWaterSessionCount: 0,
      });
    }
    const week = byWeek.get(weekStart);
    week.activities.push(activity);
    week.totalDistanceMeters += activity.distanceMeters || 0;
    week.totalMovingTimeMinutes += activity.movingTimeMinutes || 0;
    week.activityCount += 1;
    week.trainingLoad += activity.trainingLoad || 0;
    week.longestSwimDistanceMeters = Math.max(week.longestSwimDistanceMeters, activity.distanceMeters || 0);
    if (activity.swimType === 'pool') week.poolSessionCount += 1;
    if (activity.swimType === 'open_water') week.openWaterSessionCount += 1;
  }
  return Array.from(byWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)).map(week => ({
    ...week,
    totalDistanceMeters: Math.round(week.totalDistanceMeters),
    totalDistanceKm: round(week.totalDistanceMeters / 1000, 2) || 0,
    totalMovingTimeMinutes: round(week.totalMovingTimeMinutes, 1) || 0,
    averagePaceMinPer100m: calculateAverageSwimPace(week.activities),
    averageHeartRate: weightedAverageHeartRate(week.activities) ? Math.round(weightedAverageHeartRate(week.activities)) : null,
    trainingLoad: round(week.trainingLoad, 1) || 0,
    activities: undefined,
  }));
}

function calculateSwimTrainingLoadRatio(weeklyStats) {
  return weeklyStats.map((week, index) => {
    const prev = weeklyStats.slice(Math.max(0, index - 4), index);
    const avg = prev.length ? sum(prev, w => w.trainingLoad) / prev.length : null;
    const ratio = avg ? week.trainingLoad / avg : null;
    let status = 'indisponible';
    if (ratio !== null) {
      if (ratio < 0.8) status = 'charge faible';
      else if (ratio <= 1.3) status = 'charge cohérente';
      else if (ratio <= 1.5) status = 'hausse importante';
      else status = 'risque de surcharge';
    }
    return { weekStart: week.weekStart, label: week.label, trainingLoad: week.trainingLoad, previousAverage: avg ? round(avg, 1) : null, ratio: ratio ? round(ratio, 2) : null, status };
  });
}

function calculateSwimmingRegularityScore(activities) {
  const weeklyStats = calculateWeeklySwimStats(activities);
  const totalWeeks = weeksBetween(activities);
  const activeWeeks = weeklyStats.filter(w => w.activityCount > 0).length;
  const weeksWithAtLeastTwoSwims = weeklyStats.filter(w => w.activityCount >= 2).length;
  const score = totalWeeks ? weeksWithAtLeastTwoSwims / totalWeeks : 0;
  const gaps = [];
  for (let i = 1; i < activities.length; i += 1) {
    gaps.push(Math.round((new Date(activities[i].startDate) - new Date(activities[i - 1].startDate)) / MS_PER_DAY));
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
    weeksWithAtLeastTwoSwims,
    averageDaysBetweenSwims: gaps.length ? round(sum(gaps, v => v) / gaps.length, 1) : null,
    longestGapDays: gaps.length ? Math.max(...gaps) : null,
    interpretation,
  };
}

function detectLongSwims(activities, weeklyStats) {
  const averageDistanceMeters = activities.length ? sum(activities, a => a.distanceMeters) / activities.length : 0;
  const threshold = Math.max(1500, averageDistanceMeters * 1.25);
  return weeklyStats.map(week => {
    const weekActivities = activities.filter(a => new Date(a.startDate) >= new Date(`${week.weekStart}T00:00:00`) && new Date(a.startDate) <= new Date(`${week.weekEnd}T23:59:59`));
    const longest = weekActivities.reduce((best, a) => !best || a.distanceMeters > best.distanceMeters ? a : best, null);
    const qualifying = weekActivities.filter(a => a.distanceMeters >= threshold || a.id === longest?.id);
    const longDistance = sum(qualifying, a => a.distanceMeters);
    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      label: week.label,
      thresholdMeters: Math.round(threshold),
      longestSwim: longest,
      longSwimDistanceMeters: Math.round(longDistance),
      shareOfWeeklyVolume: week.totalDistanceMeters ? round(longDistance / week.totalDistanceMeters, 3) : null,
      qualifyingCount: qualifying.length,
    };
  });
}

function bestBy(list, selector, direction = 'max') {
  return list.reduce((best, item) => {
    const value = selector(item);
    if (!Number.isFinite(Number(value))) return best;
    if (!best) return item;
    return direction === 'min' ? (value < selector(best) ? item : best) : (value > selector(best) ? item : best);
  }, null);
}

function detectSwimmingPersonalBests(activities, weeklyStats) {
  const pool = activities.filter(a => a.swimType === 'pool');
  const openWater = activities.filter(a => a.swimType === 'open_water');
  const efficient = activities
    .filter(a => a.averageHeartRate && a.averagePaceMinPer100m && a.distanceMeters >= 400)
    .map(a => ({ ...a, efficiencyScore: a.averageHeartRate * a.averagePaceMinPer100m }))
    .sort((a, b) => a.efficiencyScore - b.efficiencyScore)[0] || null;
  return {
    longestDistance: bestBy(activities, a => a.distanceMeters),
    longestDuration: bestBy(activities, a => a.movingTimeMinutes),
    bestAveragePace: bestBy(activities.filter(a => a.distanceMeters >= 100), a => a.averagePaceMinPer100m, 'min'),
    biggestDistanceWeek: bestBy(weeklyStats, w => w.totalDistanceMeters),
    biggestLoadWeek: bestBy(weeklyStats, w => w.trainingLoad),
    biggestOpenWaterDistance: bestBy(openWater, a => a.distanceMeters),
    biggestPoolDistance: bestBy(pool, a => a.distanceMeters),
    efficientHeartRateSwim: efficient,
    splitRecordsAvailable: activities.some(a => Array.isArray(a.splitsMetric) || Array.isArray(a.bestEfforts)),
  };
}

function calculatePoolVsOpenWaterStats(activities) {
  const groups = ['pool', 'open_water', 'unknown'].map(type => {
    const list = activities.filter(a => a.swimType === type);
    const distance = sum(list, a => a.distanceMeters);
    return {
      type,
      count: list.length,
      distanceMeters: Math.round(distance),
      shareOfVolume: sum(activities, a => a.distanceMeters) ? round(distance / sum(activities, a => a.distanceMeters), 3) : 0,
      averagePaceMinPer100m: calculateAverageSwimPace(list),
      averageDurationMinutes: list.length ? round(sum(list, a => a.movingTimeMinutes) / list.length, 1) : null,
    };
  });
  return groups;
}

function calculateSwimEfficiencyStats(activities) {
  const withSwolf = activities.filter(a => a.swolf);
  const withStrokeRate = activities.filter(a => a.strokeRate);
  return {
    available: withSwolf.length > 0 || withStrokeRate.length > 0,
    swolfCoverage: activities.length ? round(withSwolf.length / activities.length, 3) : 0,
    strokeRateCoverage: activities.length ? round(withStrokeRate.length / activities.length, 3) : 0,
    averageSwolf: withSwolf.length ? round(sum(withSwolf, a => a.swolf) / withSwolf.length, 1) : null,
    averageStrokeRate: withStrokeRate.length ? round(sum(withStrokeRate, a => a.strokeRate) / withStrokeRate.length, 1) : null,
    swolfSeries: withSwolf,
    strokeRateSeries: withStrokeRate,
  };
}

function pearson(points, xKey, yKey) {
  const clean = points.map(p => [Number(p[xKey]), Number(p[yKey])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
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

function calculateSwimmingCorrelations(activities, weeklyStats) {
  return {
    paceVsHeartRate: pearson(activities, 'averagePaceMinPer100m', 'averageHeartRate'),
    distanceVsPace: pearson(activities, 'distanceMeters', 'averagePaceMinPer100m'),
    durationVsPace: pearson(activities, 'movingTimeMinutes', 'averagePaceMinPer100m'),
    loadVsPace: pearson(activities, 'trainingLoad', 'averagePaceMinPer100m'),
    cadenceVsPace: pearson(activities, 'strokeRate', 'averagePaceMinPer100m'),
    swolfVsPace: pearson(activities, 'swolf', 'averagePaceMinPer100m'),
    regularityVsProgression: pearson(weeklyStats.map(w => ({ activityCount: w.activityCount, pace: w.averagePaceMinPer100m })), 'activityCount', 'pace'),
    scatter: {
      paceHeartRate: activities.filter(a => a.averageHeartRate && a.averagePaceMinPer100m),
      distancePace: activities.filter(a => a.averagePaceMinPer100m),
      durationPace: activities.filter(a => a.averagePaceMinPer100m),
      loadPace: activities.filter(a => a.averagePaceMinPer100m),
      swolfPace: activities.filter(a => a.swolf && a.averagePaceMinPer100m),
      cadencePace: activities.filter(a => a.strokeRate && a.averagePaceMinPer100m),
    },
  };
}

module.exports = {
  SWIMMING_TYPES,
  normalizeStravaSwimmingActivity,
  filterSwimmingActivities,
  filterActivitiesByPeriod,
  getPreviousPeriod,
  calculateSwimmingGlobalStats,
  calculateSwimmingComparisonStats,
  calculateWeeklySwimStats,
  calculateAverageSwimPace,
  calculateSwimTrainingLoad,
  calculateSwimTrainingLoadRatio,
  calculateSwimmingRegularityScore,
  detectLongSwims,
  detectSwimmingPersonalBests,
  calculatePoolVsOpenWaterStats,
  calculateSwimEfficiencyStats,
  calculateSwimmingCorrelations,
  classifySwimType,
  normalizePeriod,
  isSwimmingActivity,
};
