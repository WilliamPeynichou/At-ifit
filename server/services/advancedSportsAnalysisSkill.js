const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const { logAuditEvent } = require('./auditService');
const { sanitizeMetadata } = require('../utils/sensitiveData');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ANALYSIS_DAYS = 90;
const GLOBAL_MAX_ACTIVITIES_WITHOUT_DETAIL = 2000;
const DETAILED_ACTIVITY_LIMIT = 40;
const STREAM_ACTIVITY_LIMIT = 8;
const STREAM_SAMPLE_LIMIT = 120;

const SPORT_ALIASES = {
  ride: 'Ride', cycling: 'Ride', cyclisme: 'Ride', vélo: 'Ride', velo: 'Ride', bike: 'Ride',
  run: 'Run', running: 'Run', course: 'Run', courir: 'Run', footing: 'Run',
  swim: 'Swim', swimming: 'Swim', natation: 'Swim', nage: 'Swim',
  walk: 'Walk', marche: 'Walk', hike: 'Hike', randonnée: 'Hike', randonnee: 'Hike',
};

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  const d = toDate(value) || new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = toDate(value) || new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(value, days) {
  const d = toDate(value) || new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeSportType(sportType) {
  if (!sportType) return null;
  const raw = String(sportType).trim();
  return SPORT_ALIASES[raw.toLowerCase()] || raw;
}

function detectPeriodFromMessage(message = '') {
  const m = String(message).toLowerCase();
  const now = new Date();
  const year = m.match(/\b(20\d{2})\b/);
  if (/janvier.*f[eé]vrier|january.*february/.test(m) && year) return { from: new Date(`${year[1]}-01-01T00:00:00Z`), to: new Date(`${year[1]}-02-28T23:59:59Z`), explicit: true };
  if (/janvier|january/.test(m) && year) return { from: new Date(`${year[1]}-01-01T00:00:00Z`), to: new Date(`${year[1]}-01-31T23:59:59Z`), explicit: true };
  if (year) return { from: new Date(`${year[1]}-01-01T00:00:00Z`), to: new Date(`${year[1]}-12-31T23:59:59Z`), explicit: true };
  const explicitMonths = m.match(/(?:derniers?|dernières?|last)\s+(\d{1,2})\s+mois|(?:sur|depuis)\s+(\d{1,2})\s+mois/);
  if (explicitMonths) return { from: addDays(now, -30 * Number(explicitMonths[1] || explicitMonths[2])), to: now, explicit: true };
  const explicitWeeks = m.match(/(?:dernières?|derniers?|last)\s+(\d{1,2})\s+semaines?|(?:sur|depuis)\s+(\d{1,2})\s+semaines?/);
  if (explicitWeeks) return { from: addDays(now, -7 * Number(explicitWeeks[1] || explicitWeeks[2])), to: now, explicit: true };
  if (/cette semaine|semaine en cours/.test(m)) return { from: addDays(now, -7), to: now, explicit: true };
  if (/ce mois|mois en cours/.test(m)) return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, explicit: true };
  if (/trois derniers mois|3 derniers mois|trimestre/.test(m)) return { from: addDays(now, -90), to: now, explicit: true };
  if (/historique complet|tout l'historique|toute l’historique|global|globale|compl[eè]te/.test(m)) return { from: null, to: now, explicit: true, fullHistory: true };
  return { from: addDays(now, -DEFAULT_ANALYSIS_DAYS), to: now, explicit: false };
}

function detectSportFromMessage(message = '') {
  const lower = String(message).toLowerCase();
  return Object.entries(SPORT_ALIASES).find(([alias]) => lower.includes(alias))?.[1] || null;
}

function detectObjectiveFromMessage(message = '') {
  const m = String(message).toLowerCase();
  const objectives = [];
  if (/progress|progresse|tendance|évolu|evolu|compar/.test(m)) objectives.push('progression');
  if (/fatigue|récup|recup|surcharge|charge|forme/.test(m)) objectives.push('fatigue_recovery');
  if (/cardio|fréquence cardiaque|frequence cardiaque|fc|heart/.test(m)) objectives.push('heart_rate');
  if (/vitesse|allure|pace|speed/.test(m)) objectives.push('speed_pace');
  if (/puissance|power|watts?/.test(m)) objectives.push('power');
  if (/cadence/.test(m)) objectives.push('cadence');
  if (/endurance|sortie longue|longues?/.test(m)) objectives.push('endurance');
  if (/interval|fractionn|intense|intensité|intensite/.test(m)) objectives.push('intensity_structure');
  if (/course|objectif|prépa|prepa|préparation|preparation/.test(m)) objectives.push('race_preparation');
  if (/derni[eè]re sortie|détail|detail/.test(m)) objectives.push('single_activity_detail');
  return objectives;
}

function assessClarificationNeed(message = '', options = {}) {
  const period = options.period || detectPeriodFromMessage(message);
  const sportType = normalizeSportType(options.sportType) || detectSportFromMessage(message);
  const objectives = options.objectives || detectObjectiveFromMessage(message);
  const lower = String(message).toLowerCase();
  const broad = /^(analyse mes sorties|analyse mes activités|analyse mes activit[eé]s|comment je progresse|bilan|fais moi un bilan|regarde mes sorties)\??$/.test(lower.trim())
    || (/analyse|progress|bilan|sorties|activit/.test(lower) && !period.explicit && !sportType && objectives.length === 0);
  const missing = [];
  const questions = [];

  if (broad || (!period.explicit && /analyse|progress|bilan|fatigue|cardio|sorties|activit/.test(lower))) {
    missing.push('period');
    questions.push('Tu veux que j’analyse quelle période ?');
  }
  if (broad && !sportType) {
    missing.push('sport');
    questions.push('Tu veux que je regarde toutes tes activités ou un sport précis comme vélo, course ou natation ?');
  }
  if ((broad || objectives.length === 0) && /analyse|progress|bilan|sorties|activit/.test(lower)) {
    missing.push('objective');
    questions.push('Tu veux une analyse orientée performance, fatigue, progression, cardio, puissance, endurance ou préparation d’objectif ?');
  }
  if (/cardio.*haut|fréquence cardiaque.*haut|frequence cardiaque.*haut/.test(lower) && !period.explicit) {
    if (!missing.includes('period')) missing.push('period');
    questions.push('Pour le cardio haut, tu veux que je compare les dernières semaines avec des sorties comparables plus anciennes ?');
  }

  const uniqueQuestions = [...new Set(questions)].slice(0, 3);
  return {
    needsClarification: uniqueQuestions.length > 0,
    missing,
    questions: uniqueQuestions,
    detected: { period, sportType, objectives },
  };
}

function numberOrNull(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return digits > 0 ? Number(n.toFixed(digits)) : Math.round(n);
}

function km(meters) { return numberOrNull((Number(meters) || 0) / 1000, 2); }
function hours(seconds) { return numberOrNull((Number(seconds) || 0) / 3600, 2); }
function kmh(mps) { return Number.isFinite(Number(mps)) ? numberOrNull(Number(mps) * 3.6, 2) : null; }
function paceMinPerKm(mps) {
  const speed = Number(mps);
  if (!Number.isFinite(speed) || speed <= 0) return null;
  return numberOrNull(16.6666667 / speed, 2);
}

function formatPace(mps) {
  const pace = paceMinPerKm(mps);
  if (!pace) return null;
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

function publicActivityDetail(a, includeRawDetail = false) {
  const detail = {
    id: a.id,
    type: a.type,
    name: a.name,
    date: a.startDate,
    distanceKm: km(a.distance),
    movingTimeMinutes: numberOrNull((Number(a.movingTime) || 0) / 60),
    elapsedTimeMinutes: a.elapsedTime ? numberOrNull(Number(a.elapsedTime) / 60) : null,
    elevationM: numberOrNull(a.totalElevationGain),
    calories: a.calories ?? null,
    averageHeartrate: a.averageHeartrate ? numberOrNull(a.averageHeartrate) : null,
    maxHeartrate: a.maxHeartrate ? numberOrNull(a.maxHeartrate) : null,
    averageWatts: a.averageWatts ? numberOrNull(a.averageWatts) : null,
    maxWatts: a.maxWatts ? numberOrNull(a.maxWatts) : null,
    weightedAverageWatts: a.weightedAverageWatts ? numberOrNull(a.weightedAverageWatts) : null,
    averageCadence: a.averageCadence ? numberOrNull(a.averageCadence) : null,
    averageSpeedKmh: kmh(a.averageSpeed),
    maxSpeedKmh: kmh(a.maxSpeed),
    paceMinPerKm: paceMinPerKm(a.averageSpeed),
    pacePerKm: formatPace(a.averageSpeed),
    sufferScore: a.sufferScore ?? null,
    effortScore: a.sufferScore ?? null,
    kilojoules: a.kilojoules ?? null,
    gearId: a.gearId || null,
    deviceName: a.deviceName || null,
    workoutType: a.workoutType ?? null,
    detailFetchedAt: a.detailFetchedAt || null,
    streamFetchedAt: a.streamFetchedAt || null,
    hasStreams: Boolean(a.streamFetchedAt),
  };
  if (includeRawDetail) {
    detail.bestEfforts = a.bestEfforts || null;
    detail.splitsMetric = a.splitsMetric || null;
    detail.laps = a.laps || null;
  }
  return detail;
}

function summarizeLargeActivitySet(activities = [], options = {}) {
  const rows = Array.isArray(activities) ? activities : [];
  const bySport = {};
  const byMonth = {};
  const missing = { heartrate: 0, speed: 0, power: 0, cadence: 0, calories: 0, streams: 0 };
  const totals = { count: rows.length, distanceKm: 0, movingHours: 0, elapsedHours: 0, elevationM: 0, calories: 0, sufferScore: 0 };
  const sums = { hr: 0, hrCount: 0, maxHr: 0, power: 0, powerCount: 0, maxPower: 0, cadence: 0, cadenceCount: 0, speed: 0, speedCount: 0 };

  rows.forEach(a => {
    const sport = a.type || 'Other';
    const month = a.startDate ? new Date(a.startDate).toISOString().slice(0, 7) : 'unknown';
    bySport[sport] ||= { count: 0, distanceKm: 0, movingHours: 0, elevationM: 0 };
    byMonth[month] ||= { count: 0, distanceKm: 0, movingHours: 0, elevationM: 0 };
    const distanceKm = (Number(a.distance) || 0) / 1000;
    const movingHours = (Number(a.movingTime) || 0) / 3600;
    const elevation = Number(a.totalElevationGain) || 0;
    totals.distanceKm += distanceKm; totals.movingHours += movingHours; totals.elapsedHours += (Number(a.elapsedTime) || 0) / 3600; totals.elevationM += elevation;
    totals.calories += Number(a.calories) || 0; totals.sufferScore += Number(a.sufferScore) || 0;
    bySport[sport].count += 1; bySport[sport].distanceKm += distanceKm; bySport[sport].movingHours += movingHours; bySport[sport].elevationM += elevation;
    byMonth[month].count += 1; byMonth[month].distanceKm += distanceKm; byMonth[month].movingHours += movingHours; byMonth[month].elevationM += elevation;
    if (a.averageHeartrate) { sums.hr += Number(a.averageHeartrate); sums.hrCount += 1; } else missing.heartrate += 1;
    if (a.maxHeartrate) sums.maxHr = Math.max(sums.maxHr, Number(a.maxHeartrate));
    if (a.averageWatts) { sums.power += Number(a.averageWatts); sums.powerCount += 1; } else missing.power += 1;
    if (a.maxWatts) sums.maxPower = Math.max(sums.maxPower, Number(a.maxWatts));
    if (a.averageCadence) { sums.cadence += Number(a.averageCadence); sums.cadenceCount += 1; } else missing.cadence += 1;
    if (a.averageSpeed) { sums.speed += Number(a.averageSpeed); sums.speedCount += 1; } else missing.speed += 1;
    if (!a.calories) missing.calories += 1;
    if (!a.streamFetchedAt) missing.streams += 1;
  });

  const normalizeGroup = group => Object.fromEntries(Object.entries(group).map(([key, value]) => [key, {
    count: value.count,
    distanceKm: numberOrNull(value.distanceKm, 1),
    movingHours: numberOrNull(value.movingHours, 1),
    elevationM: numberOrNull(value.elevationM),
  }]));

  const sorted = rows.slice().sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
  const normalizedMonths = normalizeGroup(byMonth);
  return {
    totalActivities: rows.length,
    totalActivitiesAvailable: rows.length,
    activitiesSample: sorted.slice(0, options.maxActivitiesForAI ?? options.recentLimit ?? 30).map(a => publicActivityDetail(a)),
    periodBuckets: Object.entries(normalizedMonths).map(([period, value]) => ({ period, ...value })).sort((a, b) => a.period.localeCompare(b.period)),
    trends: {
      note: 'Tendances calculées par buckets mensuels agrégés pour éviter d’exposer toutes les données brutes.',
      bucketCount: Object.keys(normalizedMonths).length,
    },
    returnedActivityDetailLimit: options.detailLimit ?? DETAILED_ACTIVITY_LIMIT,
    totals: {
      count: totals.count,
      distanceKm: numberOrNull(totals.distanceKm, 1),
      movingHours: numberOrNull(totals.movingHours, 1),
      elapsedHours: numberOrNull(totals.elapsedHours, 1),
      elevationM: numberOrNull(totals.elevationM),
      calories: numberOrNull(totals.calories),
      averageSufferScore: totals.count ? numberOrNull(totals.sufferScore / totals.count) : null,
    },
    averages: {
      heartrate: sums.hrCount ? numberOrNull(sums.hr / sums.hrCount) : null,
      maxHeartrateObserved: sums.maxHr || null,
      speedKmh: sums.speedCount ? kmh(sums.speed / sums.speedCount) : null,
      paceMinPerKm: sums.speedCount ? paceMinPerKm(sums.speed / sums.speedCount) : null,
      powerWatts: sums.powerCount ? numberOrNull(sums.power / sums.powerCount) : null,
      maxPowerObserved: sums.maxPower || null,
      cadence: sums.cadenceCount ? numberOrNull(sums.cadence / sums.cadenceCount) : null,
    },
    bySport: normalizeGroup(bySport),
    byMonth: normalizeGroup(byMonth),
    bestActivities: {
      longest: rows.slice().sort((a, b) => (b.distance || 0) - (a.distance || 0)).slice(0, 5).map(a => publicActivityDetail(a)),
      highestElevation: rows.slice().sort((a, b) => (b.totalElevationGain || 0) - (a.totalElevationGain || 0)).slice(0, 5).map(a => publicActivityDetail(a)),
      highestLoad: rows.slice().sort((a, b) => (b.sufferScore || 0) - (a.sufferScore || 0)).slice(0, 5).map(a => publicActivityDetail(a)),
    },
    recentActivities: sorted.slice(0, options.recentLimit ?? 12).map(a => publicActivityDetail(a)),
    atypicalActivities: rows.filter(a => (a.sufferScore || 0) > 100 || (a.maxHeartrate || 0) > 190 || (a.maxSpeed || 0) > 20).slice(0, 10).map(a => publicActivityDetail(a)),
    missingData: missing,
    limits: { rawStreamsExcluded: true, rawSecretsExcluded: true, summarizedForLargeVolume: rows.length > (options.detailLimit ?? DETAILED_ACTIVITY_LIMIT) },
  };
}

function summarizeArray(values = []) {
  const nums = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  if (!nums.length) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  return { count: nums.length, min: numberOrNull(sorted[0], 2), max: numberOrNull(sorted[sorted.length - 1], 2), avg: numberOrNull(sum / nums.length, 2), first: numberOrNull(nums[0], 2), last: numberOrNull(nums[nums.length - 1], 2) };
}

function sampleArray(values = [], limit = STREAM_SAMPLE_LIMIT) {
  if (!Array.isArray(values)) return [];
  if (values.length <= limit) return values;
  const step = Math.ceil(values.length / limit);
  return values.filter((_, index) => index % step === 0).slice(0, limit);
}

function statForContract(values = []) {
  const s = summarizeArray(values);
  if (!s) return null;
  return { min: s.min, max: s.max, average: s.avg, count: s.count, first: s.first, last: s.last };
}

function summarizeOneActivityStream(stream, options = {}) {
  if (!stream) return { available: false, limitation: 'Aucun stream détaillé disponible pour cette activité.' };
  const available = ['time', 'distance', 'heartrate', 'watts', 'cadence', 'velocitySmooth', 'altitude', 'gradeSmooth', 'temp', 'moving']
    .filter(key => Array.isArray(stream?.[key]) && stream[key].length > 0);
  const maxPoints = Number(options.maxPointsForAI || options.sampleLimit || STREAM_SAMPLE_LIMIT);
  const sampled = sampleArray(stream.time, maxPoints);
  const sampleFor = key => sampleArray(stream[key], maxPoints);
  const speedStats = summarizeArray(Array.isArray(stream.velocitySmooth) ? stream.velocitySmooth.map(v => Number(v) * 3.6) : []);
  return {
    activityId: stream.activityId,
    stravaId: stream.stravaId,
    available: available.length > 0,
    streamsUsed: available,
    missingStreams: ['time', 'distance', 'heartrate', 'watts', 'cadence', 'velocitySmooth', 'altitude'].filter(key => !available.includes(key)),
    points: available.reduce((acc, key) => Math.max(acc, Array.isArray(stream[key]) ? stream[key].length : 0), 0),
    resolution: stream.resolution || null,
    heartRate: statForContract(stream.heartrate),
    speed: speedStats ? { minKmh: speedStats.min, maxKmh: speedStats.max, averageKmh: speedStats.avg, count: speedStats.count } : null,
    power: statForContract(stream.watts),
    cadence: statForContract(stream.cadence),
    altitude: statForContract(stream.altitude),
    distance: statForContract(Array.isArray(stream.distance) ? stream.distance.map(v => Number(v) / 1000) : []),
    sampledPoints: sampled.map((time, index) => ({
      time,
      distance: sampleFor('distance')[index],
      heartrate: sampleFor('heartrate')[index],
      watts: sampleFor('watts')[index],
      cadence: sampleFor('cadence')[index],
      velocitySmooth: sampleFor('velocitySmooth')[index],
      altitude: sampleFor('altitude')[index],
    })).slice(0, maxPoints),
  };
}

function summarizeActivityStreams(streams = [], options = {}) {
  if (!Array.isArray(streams)) {
    return sanitizeMetadata(summarizeOneActivityStream(streams, options), { maxArrayLength: 100 });
  }
  return streams.map(stream => sanitizeMetadata(summarizeOneActivityStream(stream, options), { maxArrayLength: 100 }));
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function buildWhere(userId, options = {}) {
  const period = options.period || detectPeriodFromMessage(options.message || '');
  const sportType = normalizeSportType(options.sportType) || detectSportFromMessage(options.message || '');
  const where = { userId };
  if (!period.fullHistory) {
    const between = [startOfDay(period.from), endOfDay(period.to || new Date())];
    const condition = { [Op.between]: between };
    Object.defineProperty(condition, 'toJSON', { value: () => ({ between: between.map(dateOnly) }), enumerable: false });
    where.startDate = condition;
  }
  else if (period.to) where.startDate = { [Op.lte]: endOfDay(period.to) };
  if (sportType) where.type = sportType;
  return { where, period, sportType };
}

async function buildAdvancedSportsAnalysisContext(userId, options = {}) {
  const numericUserId = parseInt(userId, 10);
  if (!Number.isInteger(numericUserId)) throw new Error('userId invalide');
  const clarification = assessClarificationNeed(options.message || '', options);
  const { where, period, sportType } = buildWhere(numericUserId, options);
  const objectives = options.objectives || (options.objective ? detectObjectiveFromMessage(options.objective) : null) || clarification.detected.objectives;
  const detailLimit = Math.min(Number(options.maxDetailedActivities || options.detailLimit) || DETAILED_ACTIVITY_LIMIT, 100);
  const wantsSingle = objectives.includes('single_activity_detail') || options.activityId;
  if (options.activityId) where.id = options.activityId;

  const activities = await Activity.findAll({
    where,
    order: [['startDate', 'DESC']],
    limit: wantsSingle ? 1 : (Number(options.activityLimit) || GLOBAL_MAX_ACTIVITIES_WITHOUT_DETAIL),
    attributes: { exclude: ['raw', 'summaryPolyline', 'startLatlng', 'endLatlng'] },
  });

  const detailedActivities = activities.slice(0, wantsSingle ? 1 : detailLimit).map(a => publicActivityDetail(a, wantsSingle));
  const needStreams = Boolean(options.includeStreams) || wantsSingle || objectives.some(o => ['heart_rate', 'speed_pace', 'power', 'cadence', 'intensity_structure'].includes(o));
  let streamSummaries = [];
  let streamsUsed = false;
  if (needStreams && activities.length) {
    const activityIds = activities.slice(0, Number(options.streamActivityLimit) || STREAM_ACTIVITY_LIMIT).map(a => a.id);
    const streams = await ActivityStream.findAll({ where: { activityId: { [Op.in]: activityIds } }, order: [['activityId', 'ASC']] });
    const byActivityId = new Map(streams.map(stream => [stream.activityId, stream]));
    streamSummaries = activityIds.map(activityId => byActivityId.has(activityId)
      ? summarizeActivityStreams(byActivityId.get(activityId), { maxPointsForAI: Number(options.maxPointsForAI || options.sampleLimit) || STREAM_SAMPLE_LIMIT })
      : { activityId, available: false, limitation: 'Aucun stream détaillé disponible pour cette activité.' });
    streamsUsed = streamSummaries.some(s => s.available);
  }

  const summary = summarizeLargeActivitySet(activities, { detailLimit });
  const missingCategories = Object.entries(summary.missingData).filter(([, count]) => count > 0).map(([key, count]) => ({ category: key, count }));
  const dataCategories = [
    'advanced_sports_activities',
    'activities',
    'activity_metrics',
    summary.missingData.heartrate < summary.totalActivities ? 'heartrate_metrics' : null,
    summary.missingData.speed < summary.totalActivities ? 'speed_pace_metrics' : null,
    summary.missingData.power < summary.totalActivities ? 'power_metrics' : null,
    summary.missingData.cadence < summary.totalActivities ? 'cadence_metrics' : null,
    streamsUsed ? 'activity_streams_summary' : null,
  ].filter(Boolean);
  const publicSummary = {
    count: summary.totals.count,
    distanceKm: summary.totals.distanceKm,
    movingHours: summary.totals.movingHours,
    elevationM: summary.totals.elevationM,
    averages: summary.averages,
    missing: summary.missingData,
    bySport: summary.bySport,
    byMonth: summary.byMonth,
    bestActivities: summary.bestActivities,
    recentActivities: summary.recentActivities,
    limits: summary.limits,
  };
  const periodForContext = {
    from: period.fullHistory ? null : dateOnly(period.from),
    to: dateOnly(period.to || new Date()),
    fullHistory: Boolean(period.fullHistory),
    explicit: Boolean(period.explicit),
  };
  const context = sanitizeMetadata({
    skill: 'advanced_sports_analysis',
    generatedAt: new Date().toISOString(),
    scope: { userId: numericUserId, connectedUserOnly: true },
    request: {
      period: periodForContext,
      sportType,
      objectives,
      clarification,
    },
    dataCategoriesConsulted: dataCategories,
    summary: publicSummary,
    activities: detailedActivities,
    detailedActivities,
    streams: streamSummaries,
    streamStatus: { used: streamsUsed, requested: needStreams, absenceMessage: streamsUsed ? null : 'Aucun stream détaillé disponible pour les activités sélectionnées ; analyse basée sur les métriques globales.' },
    limitations: {
      missingCategories,
      noSecrets: true,
      rawDetailedDataMinimized: true,
      medicalCaution: getMedicalSafetyGuidance(options.message || ''),
    },
  }, { maxArrayLength: 200 });

  await logAuditEvent({
    userId: numericUserId,
    actorUserId: numericUserId,
    eventType: 'advanced_sports_analysis_skill_used',
    category: 'ai',
    message: 'Advanced sports analysis skill context built',
    metadata: {
      dataCategories: context.dataCategoriesConsulted,
      period: { from: periodForContext.from, to: periodForContext.to },
      sportType,
      streamsUsed,
      clarificationAsked: clarification.needsClarification,
      missingCategories,
      activityCount: activities.length,
    },
  });

  return { context, dataUsed: context.dataCategoriesConsulted, audit: { streamsUsed, clarificationAsked: clarification.needsClarification, missingCategories } };
}

function getMedicalSafetyGuidance(message = '') {
  const urgentWarning = /douleur|thoracique|malaise|essoufflement|palpitation|vertige|urgent|urgence/i.test(String(message));
  return {
    requiresCaution: true,
    urgentWarning,
    message: 'Je peux aider à interpréter les données sportives avec prudence, mais je ne peux pas poser de diagnostic médical. En cas de douleur thoracique, malaise, essoufflement inhabituel, palpitations inquiétantes ou symptôme persistant, contacte un professionnel de santé, un médecin ou les urgences.',
  };
}

module.exports = {
  assessClarificationNeed,
  buildAdvancedSportsAnalysisContext,
  summarizeLargeActivitySet,
  summarizeActivityStreams,
  getMedicalSafetyGuidance,
  normalizeSportType,
  detectPeriodFromMessage,
  detectObjectiveFromMessage,
};
