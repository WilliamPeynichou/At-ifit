const { round } = require('./cyclingFormatting');

const BASE_CYCLING_TYPES = new Set(['Ride', 'RoadRide']);
const OPTIONAL_CYCLING_TYPES = new Set(['GravelRide', 'VirtualRide', 'EBikeRide']);
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

function classifyRideType(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const type = a.type || a.rawType || raw.type || '';
  const sportType = a.sportType || a.sport_type || raw.sport_type || '';
  const value = sportType || type;
  if (value === 'GravelRide') return 'gravel';
  if (value === 'VirtualRide') return 'virtual';
  if (value === 'EBikeRide') return 'ebike';
  if (value === 'Ride' || value === 'RoadRide') return 'road';
  return 'unknown';
}

function isCyclingActivity(activity) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const type = a.type || raw.type;
  const sportType = a.sportType || a.sport_type || raw.sport_type;
  return BASE_CYCLING_TYPES.has(type) || BASE_CYCLING_TYPES.has(sportType) || OPTIONAL_CYCLING_TYPES.has(type) || OPTIONAL_CYCLING_TYPES.has(sportType);
}

function shouldIncludeRide(activity, options = {}) {
  const rideType = activity.rideType || classifyRideType(activity);
  if (rideType === 'road') return true;
  if (rideType === 'gravel') return options.includeGravel !== false;
  if (rideType === 'virtual') return Boolean(options.includeVirtual);
  if (rideType === 'ebike') return Boolean(options.includeEbike);
  return false;
}

function calculateCyclingTrainingLoad(activity, userProfile = {}) {
  const movingTimeMinutes = numeric(activity?.movingTimeMinutes, activity?.movingTime, activity?.moving_time);
  if (!movingTimeMinutes || movingTimeMinutes <= 0) return 0;
  const ftp = numeric(userProfile.ftp);
  const hrMax = numeric(userProfile.estimatedMaxHeartRate, userProfile.hrMax) || 190;
  const watts = numeric(activity?.weightedAverageWatts, activity?.averageWatts, activity?.weighted_average_watts, activity?.average_watts);
  if (ftp && watts) {
    const intensityFactor = watts / ftp;
    const movingTimeHours = movingTimeMinutes / 60;
    return round(movingTimeHours * intensityFactor * intensityFactor * 100, 1) || 0;
  }
  const averageHeartRate = numeric(activity?.averageHeartRate, activity?.averageHeartrate, activity?.average_heartrate);
  if (averageHeartRate && hrMax) return round(movingTimeMinutes * (averageHeartRate / hrMax), 1) || 0;
  const speed = numeric(activity?.averageSpeedKmh);
  let speedIntensityFactor = 0.8;
  if (speed >= 32) speedIntensityFactor = 1.1;
  else if (speed >= 26) speedIntensityFactor = 1.0;
  else if (speed >= 20) speedIntensityFactor = 0.9;
  return round(movingTimeMinutes * speedIntensityFactor, 1) || 0;
}

function normalizeStravaCyclingActivity(activity, userProfile = {}) {
  const a = getRaw(activity);
  const raw = a.raw || {};
  const distanceMeters = numeric(a.distance, raw.distance) || 0;
  const movingSeconds = numeric(a.movingTime, a.moving_time, raw.moving_time);
  const elapsedSeconds = numeric(a.elapsedTime, a.elapsed_time, raw.elapsed_time);
  const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : 0;
  const movingTimeMinutes = movingSeconds ? movingSeconds / 60 : 0;
  const elapsedTimeMinutes = elapsedSeconds ? elapsedSeconds / 60 : movingTimeMinutes;
  const averageSpeedMs = numeric(a.averageSpeed, a.average_speed, raw.average_speed);
  const maxSpeedMs = numeric(a.maxSpeed, a.max_speed, raw.max_speed);
  const averageWatts = optionalNumber(a.averageWatts, a.average_watts, raw.average_watts);
  const weightedAverageWatts = optionalNumber(a.weightedAverageWatts, a.weighted_average_watts, raw.weighted_average_watts);
  const hasPowerMeter = a.deviceWatts ?? a.device_watts ?? raw.device_watts;

  const normalized = {
    id: String(a.stravaId || a.id || raw.id || ''),
    name: a.name || raw.name || 'Sortie vélo',
    date: (a.startDate || a.start_date || raw.start_date) ? new Date(a.startDate || a.start_date || raw.start_date).toISOString().slice(0, 10) : null,
    localDate: raw.start_date_local || a.startDate || a.start_date || raw.start_date || null,
    startDate: a.startDate || a.start_date || raw.start_date || raw.start_date_local || null,
    distanceKm: round(distanceKm, 3) || 0,
    movingTimeMinutes: round(movingTimeMinutes, 2) || 0,
    elapsedTimeMinutes: round(elapsedTimeMinutes, 2) || 0,
    averageSpeedKmh: averageSpeedMs ? round(averageSpeedMs * 3.6, 2) : (movingTimeMinutes > 0 ? round(distanceKm / (movingTimeMinutes / 60), 2) : null),
    maxSpeedKmh: maxSpeedMs ? round(maxSpeedMs * 3.6, 2) : undefined,
    elevationGain: round(numeric(a.totalElevationGain, a.total_elevation_gain, raw.total_elevation_gain) || 0, 1) || 0,
    elevationHigh: optionalNumber(a.elevationHigh, a.elev_high, raw.elev_high),
    elevationLow: optionalNumber(a.elevationLow, a.elev_low, raw.elev_low),
    averageHeartRate: optionalNumber(a.averageHeartRate, a.averageHeartrate, a.average_heartrate, raw.average_heartrate),
    maxHeartRate: optionalNumber(a.maxHeartRate, a.maxHeartrate, a.max_heartrate, raw.max_heartrate),
    averageWatts,
    maxWatts: optionalNumber(a.maxWatts, a.max_watts, raw.max_watts),
    weightedAverageWatts,
    kilojoules: optionalNumber(a.kilojoules, raw.kilojoules),
    hasPowerMeter: hasPowerMeter === true,
    powerSource: averageWatts || weightedAverageWatts ? (hasPowerMeter === true ? 'measured' : hasPowerMeter === false ? 'estimated' : 'unknown') : 'unknown',
    averageCadence: optionalNumber(a.averageCadence, a.average_cadence, raw.average_cadence),
    calories: optionalNumber(a.calories, raw.calories),
    sufferScore: optionalNumber(a.sufferScore, a.suffer_score, raw.suffer_score),
    deviceName: a.deviceName || a.device_name || raw.device_name || undefined,
    sportType: a.sportType || a.sport_type || raw.sport_type || undefined,
    rawType: a.type || raw.type || undefined,
    rideType: classifyRideType(a),
    workoutType: a.workoutType || a.workout_type || raw.workout_type || undefined,
    startLatlng: a.startLatlng || a.start_latlng || raw.start_latlng || undefined,
    endLatlng: a.endLatlng || a.end_latlng || raw.end_latlng || undefined,
    timezone: raw.timezone || a.timezone || undefined,
    splitsMetric: a.splitsMetric || raw.splits_metric || undefined,
    bestEfforts: a.bestEfforts || raw.best_efforts || undefined,
  };

  normalized.elevationPerKm = normalized.distanceKm > 0 ? round(normalized.elevationGain / normalized.distanceKm, 2) : null;
  normalized.elevationPer100Km = normalized.elevationPerKm ? round(normalized.elevationPerKm * 100, 1) : null;
  normalized.averagePowerToWeight = userProfile.weightKg && normalized.averageWatts ? round(normalized.averageWatts / userProfile.weightKg, 2) : null;
  normalized.weightedPowerToWeight = userProfile.weightKg && normalized.weightedAverageWatts ? round(normalized.weightedAverageWatts / userProfile.weightKg, 2) : null;
  normalized.trainingLoad = calculateCyclingTrainingLoad(normalized, userProfile);
  normalized.trainingLoadSource = userProfile.ftp && (normalized.weightedAverageWatts || normalized.averageWatts)
    ? 'power_ftp'
    : normalized.averageHeartRate ? 'heart_rate' : 'estimated_without_power_hr';
  return normalized;
}

function filterCyclingActivities(activities, options = {}, userProfile = {}) {
  return (activities || [])
    .filter(isCyclingActivity)
    .map(activity => normalizeStravaCyclingActivity(activity, userProfile))
    .filter(activity => shouldIncludeRide(activity, options))
    .filter(activity => activity.startDate && activity.movingTimeMinutes > 0)
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

function weightedAverage(activities, selector) {
  const valid = activities.filter(activity => Number.isFinite(Number(selector(activity))));
  const duration = sum(valid, a => a.movingTimeMinutes);
  if (duration > 0) return sum(valid, a => selector(a) * a.movingTimeMinutes) / duration;
  return valid.length ? sum(valid, selector) / valid.length : null;
}

function calculateAverageSpeed(activities) {
  const totalDistanceKm = sum(activities, a => a.distanceKm);
  const totalMovingTimeMinutes = sum(activities, a => a.movingTimeMinutes);
  return totalMovingTimeMinutes > 0 ? totalDistanceKm / (totalMovingTimeMinutes / 60) : null;
}

function weeksBetween(activities) {
  if (!activities.length) return 0;
  const first = startOfDay(activities[0].startDate);
  const last = endOfDay(activities[activities.length - 1].startDate);
  return Math.max(1, Math.ceil((last - first + 1) / (7 * MS_PER_DAY)));
}

function calculateElevationStats(activities) {
  const totalDistanceKm = sum(activities, a => a.distanceKm);
  const totalElevation = sum(activities, a => a.elevationGain);
  return {
    totalElevationGain: Math.round(totalElevation),
    averageElevationGain: activities.length ? Math.round(totalElevation / activities.length) : 0,
    elevationPerKm: totalDistanceKm ? round(totalElevation / totalDistanceKm, 2) : null,
    elevationPer100Km: totalDistanceKm ? round((totalElevation / totalDistanceKm) * 100, 1) : null,
    highestElevationRide: activities.reduce((best, a) => !best || a.elevationGain > best.elevationGain ? a : best, null),
    highestElevationRatioRide: activities.filter(a => a.distanceKm > 0).reduce((best, a) => !best || a.elevationPer100Km > best.elevationPer100Km ? a : best, null),
  };
}

function calculatePowerStats(activities, userProfile = {}) {
  const withPower = activities.filter(a => a.averageWatts || a.weightedAverageWatts);
  const measured = withPower.filter(a => a.powerSource === 'measured');
  const estimated = withPower.filter(a => a.powerSource === 'estimated');
  const averageWatts = withPower.length ? weightedAverage(withPower, a => a.averageWatts) : null;
  const weightedWatts = withPower.some(a => a.weightedAverageWatts) ? weightedAverage(withPower, a => a.weightedAverageWatts) : null;
  return {
    coverage: activities.length ? round(withPower.length / activities.length, 3) : 0,
    measuredCoverage: activities.length ? round(measured.length / activities.length, 3) : 0,
    estimatedCoverage: activities.length ? round(estimated.length / activities.length, 3) : 0,
    averageWatts: averageWatts ? Math.round(averageWatts) : null,
    weightedAverageWatts: weightedWatts ? Math.round(weightedWatts) : null,
    maxWatts: withPower.reduce((max, a) => Math.max(max, a.maxWatts || a.averageWatts || 0), 0) || null,
    averagePowerToWeight: userProfile.weightKg && averageWatts ? round(averageWatts / userProfile.weightKg, 2) : null,
    weightedPowerToWeight: userProfile.weightKg && weightedWatts ? round(weightedWatts / userProfile.weightKg, 2) : null,
    totalKilojoules: activities.some(a => a.kilojoules) ? Math.round(sum(activities, a => a.kilojoules)) : null,
    ftp: userProfile.ftp || null,
    ftpSource: userProfile.ftpSource || null,
    ftpConfidence: userProfile.ftpConfidence || null,
    powerZones: userProfile.powerZones || [],
  };
}

function calculateCyclingGlobalStats(activities, userProfile = {}) {
  const totalDistanceKm = sum(activities, a => a.distanceKm);
  const totalMovingTimeMinutes = sum(activities, a => a.movingTimeMinutes);
  const averageSpeedKmh = calculateAverageSpeed(activities);
  const withHr = activities.filter(a => a.averageHeartRate);
  const withCadence = activities.filter(a => a.averageCadence);
  const elevationStats = calculateElevationStats(activities);
  const powerStats = calculatePowerStats(activities, userProfile);
  const weekCount = weeksBetween(activities);
  return {
    activityCount: activities.length,
    totalDistanceKm: round(totalDistanceKm, 2) || 0,
    totalMovingTimeMinutes: round(totalMovingTimeMinutes, 1) || 0,
    averageSpeedKmh: averageSpeedKmh ? round(averageSpeedKmh, 2) : null,
    maxSpeedKmh: activities.reduce((max, a) => Math.max(max, a.maxSpeedKmh || a.averageSpeedKmh || 0), 0) || null,
    averageDistanceKm: activities.length ? round(totalDistanceKm / activities.length, 1) : 0,
    averageDurationMinutes: activities.length ? round(totalMovingTimeMinutes / activities.length, 1) : 0,
    averageHeartRate: withHr.length ? Math.round(weightedAverage(activities, a => a.averageHeartRate)) : null,
    heartRateCoverage: activities.length ? round(withHr.length / activities.length, 3) : 0,
    averageCadence: withCadence.length ? Math.round(weightedAverage(withCadence, a => a.averageCadence)) : null,
    cadenceCoverage: activities.length ? round(withCadence.length / activities.length, 3) : 0,
    totalCalories: activities.some(a => a.calories) ? Math.round(sum(activities, a => a.calories)) : null,
    totalTrainingLoad: round(sum(activities, a => a.trainingLoad), 1) || 0,
    averageRidesPerWeek: weekCount ? round(activities.length / weekCount, 2) : 0,
    longestRide: activities.reduce((best, a) => !best || a.distanceKm > best.distanceKm ? a : best, null),
    longestDurationRide: activities.reduce((best, a) => !best || a.movingTimeMinutes > best.movingTimeMinutes ? a : best, null),
    bestSpeedRide: activities.filter(a => a.distanceKm >= 5).reduce((best, a) => !best || a.averageSpeedKmh > best.averageSpeedKmh ? a : best, null),
    rideTypeCounts: {
      road: activities.filter(a => a.rideType === 'road').length,
      gravel: activities.filter(a => a.rideType === 'gravel').length,
      virtual: activities.filter(a => a.rideType === 'virtual').length,
      ebike: activities.filter(a => a.rideType === 'ebike').length,
      unknown: activities.filter(a => a.rideType === 'unknown').length,
    },
    ...elevationStats,
    powerStats,
    weekCount,
  };
}

function relativeChange(current, previous) {
  if (!Number.isFinite(Number(current)) || !Number.isFinite(Number(previous)) || Number(previous) === 0) return null;
  return (Number(current) - Number(previous)) / Number(previous);
}

function calculateCyclingComparisonStats(currentActivities, previousActivities, userProfile = {}) {
  const current = calculateCyclingGlobalStats(currentActivities, userProfile);
  const previous = calculateCyclingGlobalStats(previousActivities, userProfile);
  return {
    current,
    previous,
    available: previousActivities.length > 0,
    deltas: {
      distance: relativeChange(current.totalDistanceKm, previous.totalDistanceKm),
      activityCount: relativeChange(current.activityCount, previous.activityCount),
      movingTime: relativeChange(current.totalMovingTimeMinutes, previous.totalMovingTimeMinutes),
      speed: relativeChange(current.averageSpeedKmh, previous.averageSpeedKmh),
      elevation: relativeChange(current.totalElevationGain, previous.totalElevationGain),
      elevationPer100Km: relativeChange(current.elevationPer100Km, previous.elevationPer100Km),
      heartRate: current.averageHeartRate && previous.averageHeartRate ? current.averageHeartRate - previous.averageHeartRate : null,
      averageWatts: relativeChange(current.powerStats.averageWatts, previous.powerStats.averageWatts),
      weightedWatts: relativeChange(current.powerStats.weightedAverageWatts, previous.powerStats.weightedAverageWatts),
      cadence: current.averageCadence && previous.averageCadence ? current.averageCadence - previous.averageCadence : null,
      calories: relativeChange(current.totalCalories, previous.totalCalories),
      kilojoules: relativeChange(current.powerStats.totalKilojoules, previous.powerStats.totalKilojoules),
      load: relativeChange(current.totalTrainingLoad, previous.totalTrainingLoad),
      ridesPerWeek: relativeChange(current.averageRidesPerWeek, previous.averageRidesPerWeek),
    },
  };
}

function mondayOf(dateValue) {
  const d = startOfDay(dateValue);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function calculateWeeklyCyclingStats(activities) {
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
        totalDistanceKm: 0,
        totalMovingTimeMinutes: 0,
        activityCount: 0,
        averageSpeedKmh: null,
        averageHeartRate: null,
        averageWatts: null,
        weightedAverageWatts: null,
        elevationGain: 0,
        trainingLoad: 0,
        longestRideDistanceKm: 0,
        longestRideMinutes: 0,
      });
    }
    const week = byWeek.get(weekStart);
    week.activities.push(activity);
    week.totalDistanceKm += activity.distanceKm || 0;
    week.totalMovingTimeMinutes += activity.movingTimeMinutes || 0;
    week.activityCount += 1;
    week.elevationGain += activity.elevationGain || 0;
    week.trainingLoad += activity.trainingLoad || 0;
    week.longestRideDistanceKm = Math.max(week.longestRideDistanceKm, activity.distanceKm || 0);
    week.longestRideMinutes = Math.max(week.longestRideMinutes, activity.movingTimeMinutes || 0);
  }
  return Array.from(byWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)).map(week => ({
    ...week,
    totalDistanceKm: round(week.totalDistanceKm, 2) || 0,
    totalMovingTimeMinutes: round(week.totalMovingTimeMinutes, 1) || 0,
    averageSpeedKmh: calculateAverageSpeed(week.activities),
    averageHeartRate: weightedAverage(week.activities, a => a.averageHeartRate) ? Math.round(weightedAverage(week.activities, a => a.averageHeartRate)) : null,
    averageWatts: weightedAverage(week.activities, a => a.averageWatts) ? Math.round(weightedAverage(week.activities, a => a.averageWatts)) : null,
    weightedAverageWatts: weightedAverage(week.activities, a => a.weightedAverageWatts) ? Math.round(weightedAverage(week.activities, a => a.weightedAverageWatts)) : null,
    elevationGain: Math.round(week.elevationGain),
    trainingLoad: round(week.trainingLoad, 1) || 0,
    activities: undefined,
  }));
}

function calculateCyclingTrainingLoadRatio(weeklyStats) {
  return weeklyStats.map((week, index) => {
    const previous = weeklyStats.slice(Math.max(0, index - 4), index);
    const average = previous.length ? sum(previous, w => w.trainingLoad) / previous.length : null;
    const ratio = average ? week.trainingLoad / average : null;
    let status = 'indisponible';
    if (ratio !== null) {
      if (ratio < 0.8) status = 'charge faible';
      else if (ratio <= 1.3) status = 'charge cohérente';
      else if (ratio <= 1.5) status = 'hausse importante';
      else status = 'risque de surcharge';
    }
    return { weekStart: week.weekStart, label: week.label, trainingLoad: week.trainingLoad, previousAverage: average ? round(average, 1) : null, ratio: ratio ? round(ratio, 2) : null, status };
  });
}

function calculateCyclingRegularityScore(activities) {
  const weeklyStats = calculateWeeklyCyclingStats(activities);
  const totalWeeks = weeksBetween(activities);
  const activeWeeks = weeklyStats.filter(w => w.activityCount > 0).length;
  const weeksWithAtLeastTwoRides = weeklyStats.filter(w => w.activityCount >= 2).length;
  const score = totalWeeks ? weeksWithAtLeastTwoRides / totalWeeks : 0;
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
    weeksWithAtLeastTwoRides,
    averageDaysBetweenRides: gaps.length ? round(sum(gaps, v => v) / gaps.length, 1) : null,
    longestGapDays: gaps.length ? Math.max(...gaps) : null,
    interpretation,
  };
}

function detectLongRides(activities, weeklyStats) {
  return weeklyStats.map(week => {
    const weekActivities = activities.filter(a => new Date(a.startDate) >= new Date(`${week.weekStart}T00:00:00`) && new Date(a.startDate) <= new Date(`${week.weekEnd}T23:59:59`));
    const activity = weekActivities.reduce((best, a) => !best || a.distanceKm > best.distanceKm ? a : best, null);
    const share = activity && week.totalDistanceKm ? activity.distanceKm / week.totalDistanceKm : null;
    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      label: week.label,
      activity,
      longRideDistanceKm: activity ? activity.distanceKm : 0,
      longRideMinutes: activity ? activity.movingTimeMinutes : 0,
      shareOfWeeklyVolume: share ? round(share, 3) : null,
      alert: share ? share > 0.45 : false,
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

function detectCyclingPersonalBests(activities, weeklyStats) {
  const efficientSpeed = activities
    .filter(a => a.averageHeartRate && a.averageSpeedKmh && a.distanceKm >= 10)
    .map(a => ({ ...a, efficiencyScore: a.averageSpeedKmh / a.averageHeartRate }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0] || null;
  const efficientPower = activities
    .filter(a => a.averageHeartRate && a.averageWatts && a.distanceKm >= 10)
    .map(a => ({ ...a, efficiencyScore: a.averageWatts / a.averageHeartRate }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0] || null;
  return {
    longestDistance: bestBy(activities, a => a.distanceKm),
    longestDuration: bestBy(activities, a => a.movingTimeMinutes),
    bestAverageSpeed: bestBy(activities.filter(a => a.distanceKm >= 5), a => a.averageSpeedKmh),
    highestElevation: bestBy(activities, a => a.elevationGain),
    highestElevationPer100Km: bestBy(activities, a => a.elevationPer100Km),
    biggestDistanceWeek: bestBy(weeklyStats, w => w.totalDistanceKm),
    biggestLoadWeek: bestBy(weeklyStats, w => w.trainingLoad),
    bestAverageWatts: bestBy(activities, a => a.averageWatts),
    bestWeightedAverageWatts: bestBy(activities, a => a.weightedAverageWatts),
    biggestKilojoules: bestBy(activities, a => a.kilojoules),
    efficientHeartRateSpeedRide: efficientSpeed,
    efficientHeartRatePowerRide: efficientPower,
    streamRecordsAvailable: activities.some(a => Array.isArray(a.splitsMetric) || Array.isArray(a.bestEfforts)),
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

function calculateCyclingCorrelations(activities, weeklyStats) {
  return {
    speedVsHeartRate: pearson(activities, 'averageSpeedKmh', 'averageHeartRate'),
    speedVsPower: pearson(activities, 'averageSpeedKmh', 'averageWatts'),
    powerVsHeartRate: pearson(activities, 'averageWatts', 'averageHeartRate'),
    distanceVsSpeed: pearson(activities, 'distanceKm', 'averageSpeedKmh'),
    elevationVsSpeed: pearson(activities, 'elevationPerKm', 'averageSpeedKmh'),
    elevationVsPower: pearson(activities, 'elevationPerKm', 'averageWatts'),
    loadVsSpeed: pearson(activities, 'trainingLoad', 'averageSpeedKmh'),
    cadenceVsPower: pearson(activities, 'averageCadence', 'averageWatts'),
    regularityVsProgression: pearson(weeklyStats.map(w => ({ activityCount: w.activityCount, speed: w.averageSpeedKmh })), 'activityCount', 'speed'),
    scatter: {
      speedHeartRate: activities.filter(a => a.averageHeartRate && a.averageSpeedKmh),
      speedPower: activities.filter(a => a.averageWatts && a.averageSpeedKmh),
      powerHeartRate: activities.filter(a => a.averageWatts && a.averageHeartRate),
      distanceSpeed: activities.filter(a => a.averageSpeedKmh),
      elevationSpeed: activities.filter(a => a.elevationPerKm && a.averageSpeedKmh),
      elevationPower: activities.filter(a => a.elevationPerKm && a.averageWatts),
      cadencePower: activities.filter(a => a.averageCadence && a.averageWatts),
      cadenceSpeed: activities.filter(a => a.averageCadence && a.averageSpeedKmh),
    },
  };
}

module.exports = {
  BASE_CYCLING_TYPES,
  OPTIONAL_CYCLING_TYPES,
  normalizeStravaCyclingActivity,
  filterCyclingActivities,
  filterActivitiesByPeriod,
  getPreviousPeriod,
  calculateCyclingGlobalStats,
  calculateCyclingComparisonStats,
  calculateWeeklyCyclingStats,
  calculateAverageSpeed,
  calculateElevationStats,
  calculatePowerStats,
  calculateCyclingTrainingLoad,
  calculateCyclingTrainingLoadRatio,
  calculateCyclingRegularityScore,
  detectLongRides,
  detectCyclingPersonalBests,
  calculateCyclingCorrelations,
  classifyRideType,
  normalizePeriod,
  isCyclingActivity,
  shouldIncludeRide,
};
