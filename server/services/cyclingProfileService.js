const { Op } = require('sequelize');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const User = require('../models/User');
const Weight = require('../models/Weight');
const { getTrainingLoad } = require('./trainingLoadService');
const { getPowerCurve } = require('./stravaAnalytics');
const { resolveMaxHeartrate } = require('./userMetricsService');

const RIDE_TYPES = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];

// Bornes contiguës : Z(n).maxPct = Z(n+1).minPct, convention [min, max) via opérateur strict.
// Le label affiché conserve la nomenclature Coggan officielle (ex: "55-75%").
const POWER_ZONE_DEFS = [
  { key: 'z1', zone: 'Z1', name: 'Active Recovery', minPct: 0,    maxPct: 0.55, label: '<55%' },
  { key: 'z2', zone: 'Z2', name: 'Endurance',       minPct: 0.55, maxPct: 0.76, label: '55-75%' },
  { key: 'z3', zone: 'Z3', name: 'Tempo',           minPct: 0.76, maxPct: 0.91, label: '76-90%' },
  { key: 'z4', zone: 'Z4', name: 'Threshold',       minPct: 0.91, maxPct: 1.06, label: '91-105%' },
  { key: 'z5', zone: 'Z5', name: 'VO2max',          minPct: 1.06, maxPct: 1.21, label: '106-120%' },
  { key: 'z6', zone: 'Z6', name: 'Anaerobic',       minPct: 1.21, maxPct: 1.51, label: '121-150%' },
  { key: 'z7', zone: 'Z7', name: 'Neuromuscular',   minPct: 1.51, maxPct: null, label: '>150%' },
];

const RECENT_RIDE_SAMPLE_SIZE = 10;
const MIN_RIDE_DURATION_SEC = 20 * 60;
const MAX_AVG_WATTS_FTP_COEFFICIENT = 1.05;
const VO2MAX_MIN_WKG_VALIDITY = 2.0;

function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function median(values) {
  const sorted = values
    .map(Number)
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return null;

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function classifyCyclist(wkg) {
  if (!wkg) return 'Indéterminé';
  if (wkg < 2.0) return 'Untrained';
  if (wkg < 2.5) return 'Recreational';
  if (wkg < 3.1) return 'Cat 5';
  if (wkg < 3.7) return 'Cat 4';
  if (wkg < 4.4) return 'Cat 3';
  if (wkg < 5.1) return 'Cat 2';
  if (wkg < 5.8) return 'Cat 1';
  return 'World Class';
}

function buildPowerZones(ftp) {
  if (!ftp) {
    return POWER_ZONE_DEFS.map(def => ({
      ...def,
      minWatts: null,
      maxWatts: null,
    }));
  }

  return POWER_ZONE_DEFS.map(def => ({
    ...def,
    minWatts: Math.round(ftp * def.minPct),
    maxWatts: def.maxPct ? Math.round(ftp * def.maxPct) : null,
  }));
}

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

function calculateZoneDurations(watts, time, zones) {
  const empty = zones.map(zone => ({ key: zone.key, seconds: 0, percent: 0 }));
  if (!Array.isArray(watts) || !Array.isArray(time) || watts.length < 2 || watts.length !== time.length) return empty;

  const secondsByZone = Object.fromEntries(zones.map(zone => [zone.key, 0]));
  let total = 0;

  for (let i = 1; i < watts.length; i++) {
    const dt = Number(time[i]) - Number(time[i - 1]);
    const power = Number(watts[i]);
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(power)) continue;

    const zone = zones.find(z => {
      const aboveMin = z.minWatts === null || power >= z.minWatts;
      const belowMax = z.maxWatts === null || power < z.maxWatts;
      return aboveMin && belowMax;
    });

    if (zone) {
      secondsByZone[zone.key] += dt;
      total += dt;
    }
  }

  return zones.map(zone => ({
    key: zone.key,
    seconds: Math.round(secondsByZone[zone.key]),
    percent: total ? round((secondsByZone[zone.key] / total) * 100, 1) : 0,
  }));
}

function serializeRide(activity, ftp, zones) {
  const watts = activity.weightedAverageWatts || activity.averageWatts || null;
  const intensityFactor = ftp && watts ? watts / ftp : null;
  const tss = ftp && watts && activity.movingTime
    ? ((activity.movingTime * watts * intensityFactor) / (ftp * 3600)) * 100
    : null;
  const stream = activity.ActivityStream;
  const zoneDurations = stream ? calculateZoneDurations(stream.watts, stream.time, zones) : zones.map(zone => ({
    key: zone.key,
    seconds: 0,
    percent: 0,
  }));

  // BPM min : extrait du stream HR (Strava ne stocke pas min_heartrate au niveau activité).
  const hrStream = Array.isArray(stream?.heartrate) ? stream.heartrate.filter(v => Number(v) > 0) : null;
  const minHeartrate = hrStream && hrStream.length ? Math.min(...hrStream.map(Number)) : null;

  // Vitesse moyenne convertie de m/s vers km/h (Strava stocke en m/s).
  const averageSpeedKmh = activity.averageSpeed ? round(activity.averageSpeed * 3.6, 1) : null;
  const maxSpeedKmh = activity.maxSpeed ? round(activity.maxSpeed * 3.6, 1) : null;

  return {
    id: activity.id,
    stravaId: activity.stravaId,
    name: activity.name || 'Sortie vélo',
    date: activity.startDate,
    type: activity.type,
    distanceKm: round((activity.distance || 0) / 1000, 1),
    durationSeconds: activity.movingTime || 0,
    elevationMeters: Math.round(activity.totalElevationGain || 0),
    averageSpeedKmh,
    maxSpeedKmh,
    averageHeartrate: activity.averageHeartrate ? Math.round(activity.averageHeartrate) : null,
    maxHeartrate: activity.maxHeartrate ? Math.round(activity.maxHeartrate) : null,
    minHeartrate: minHeartrate ? Math.round(minHeartrate) : null,
    averageWatts: activity.averageWatts ? Math.round(activity.averageWatts) : null,
    weightedAverageWatts: activity.weightedAverageWatts ? Math.round(activity.weightedAverageWatts) : null,
    watts: watts ? Math.round(watts) : null,
    intensityFactor: intensityFactor ? round(intensityFactor, 2) : null,
    tss: tss ? Math.round(tss) : null,
    zoneDurations,
  };
}

async function getLatestWeight(userId) {
  return Weight.findOne({
    where: { userId },
    order: [['date', 'DESC']],
  });
}

async function getEstimatedFtp(userId, range = {}) {
  const curve = await getPowerCurve(userId, range);
  const best20 = curve.find(point => point.duration === 1200);
  if (best20?.power) {
    return {
      ftp: Math.round(best20.power * 0.95),
      best20min: best20.power,
      powerCurve: curve,
      source: 'power_curve_20min',
      confidence: 'high',
      note: null,
    };
  }

  const recentRides = await Activity.findAll({
    where: {
      userId,
      type: { [Op.in]: RIDE_TYPES },
      averageWatts: { [Op.not]: null },
      movingTime: { [Op.gte]: MIN_RIDE_DURATION_SEC },
    },
    attributes: ['id', 'stravaId', 'name', 'startDate', 'averageWatts', 'movingTime', 'distance'],
    order: [['startDate', 'DESC']],
    limit: RECENT_RIDE_SAMPLE_SIZE,
  });

  const peakRide = recentRides.reduce((best, ride) =>
    !best || Number(ride.averageWatts) > Number(best.averageWatts) ? ride : best
  , null);
  const peakAverageWatts = peakRide ? Number(peakRide.averageWatts) : null;
  const estimatedFtp = peakAverageWatts
    ? Math.round(peakAverageWatts * MAX_AVG_WATTS_FTP_COEFFICIENT)
    : null;

  const note = recentRides.length
    ? `FTP estimée depuis la sortie la plus intense de tes ${recentRides.length} dernières sorties vélo (averageWatts max × ${MAX_AVG_WATTS_FTP_COEFFICIENT}). C'est une approximation : la précision dépend du fait qu'au moins une sortie récente s'approche d'un effort soutenu de ~1 h. Pour un calcul fiable, fais un test FTP 20 min avec capteur de puissance.`
    : null;

  return {
    ftp: estimatedFtp,
    best20min: null,
    powerCurve: curve,
    source: recentRides.length ? 'max_recent_average_watts' : 'missing_power_data',
    confidence: recentRides.length >= 5 ? 'medium' : 'low',
    note,
    peakAverageWatts: peakAverageWatts ? round(peakAverageWatts, 1) : null,
    sourceRide: peakRide ? {
      id: peakRide.id,
      stravaId: peakRide.stravaId,
      name: peakRide.name,
      date: peakRide.startDate,
      averageWatts: Math.round(peakRide.averageWatts),
      durationSeconds: peakRide.movingTime,
      distanceKm: round((peakRide.distance || 0) / 1000, 1),
    } : null,
    sourceRides: recentRides.map(ride => ({
      id: ride.id,
      stravaId: ride.stravaId,
      name: ride.name,
      date: ride.startDate,
      averageWatts: Math.round(ride.averageWatts),
      durationSeconds: ride.movingTime,
      distanceKm: round((ride.distance || 0) / 1000, 1),
    })),
  };
}

async function getCyclingProfile(userId) {
  const [user, latestWeight, hrMaxResolved, ftpData, maxWattsRow] = await Promise.all([
    User.findByPk(userId, { attributes: { exclude: ['password'] } }),
    getLatestWeight(userId),
    resolveMaxHeartrate(userId),
    getEstimatedFtp(userId),
    Activity.findOne({
      where: { userId, type: { [Op.in]: RIDE_TYPES }, maxWatts: { [Op.not]: null } },
      attributes: ['maxWatts'],
      order: [['maxWatts', 'DESC']],
    }),
  ]);

  const weight = latestWeight?.weight || null;
  const ftpRelative = ftpData.ftp && weight ? ftpData.ftp / weight : null;
  const maxHeartrate = hrMaxResolved.value;

  let vo2max = null;
  let vo2maxNote = null;
  let vo2maxConfidence = null;
  if (ftpRelative) {
    vo2max = (10.8 * ftpRelative) + 7;
    if (ftpRelative >= 2.5) {
      vo2maxConfidence = 'high';
    } else if (ftpRelative >= VO2MAX_MIN_WKG_VALIDITY) {
      vo2maxConfidence = 'medium';
      vo2maxNote = `Estimation faible confiance : la formule Hawley & Noakes (10.8 × W/kg + 7) est calibrée pour les cyclistes entraînés (≥ 2.5 W/kg). Considère cette valeur comme indicative.`;
    } else {
      vo2maxConfidence = 'low';
      vo2maxNote = `Valeur extrapolée hors plage de validité (< ${VO2MAX_MIN_WKG_VALIDITY} W/kg). La formule sous-estime fortement la VO2max physiologique réelle dans cette zone — utile uniquement comme repère relatif.`;
    }
  }

  const powerZones = buildPowerZones(ftpData.ftp);

  // FTP sprint : pic 30 s issu de la courbe mean-max (haute confiance), sinon le pic instantané
  // (maxWatts) observé sur les sorties Strava (confiance moyenne, peut être un sprint < 5 s).
  const peak30sFromCurve = ftpData.powerCurve?.find(p => p.duration === 30)?.power || 0;
  let sprintPower = null;
  let sprintPowerSource = null;
  if (peak30sFromCurve > 0) {
    sprintPower = Math.round(peak30sFromCurve);
    sprintPowerSource = 'peak_30s_power_curve';
  } else if (maxWattsRow?.maxWatts) {
    sprintPower = Math.round(Number(maxWattsRow.maxWatts));
    sprintPowerSource = 'observed_max_watts';
  }
  const sprintPowerRelative = sprintPower && weight ? round(sprintPower / weight, 1) : null;

  return {
    weight: weight ? round(weight, 1) : null,
    weightDate: latestWeight?.date || null,
    ftp: ftpData.ftp,
    best20min: ftpData.best20min,
    ftpSource: ftpData.source,
    ftpConfidence: ftpData.confidence,
    ftpNote: ftpData.note || null,
    ftpSourceRide: ftpData.sourceRide || null,
    ftpSourceRides: ftpData.sourceRides || [],
    peakAverageWatts: ftpData.peakAverageWatts || null,
    ftpRelative: ftpRelative ? round(ftpRelative, 2) : null,
    level: classifyCyclist(ftpRelative),
    maxHeartrate,
    maxHeartrateSource: hrMaxResolved.source,
    maxHeartrateConfidence: hrMaxResolved.confidence,
    restHeartrate: user?.restHeartrate || null,
    bikeType: user?.bikeType || null,
    cyclingGoal: user?.cyclingGoal || null,
    vo2max: vo2max ? round(vo2max, 1) : null,
    vo2maxNote,
    vo2maxConfidence,
    sprintPower,
    sprintPowerSource,
    sprintPowerRelative,
    powerZones,
  };
}

async function getCyclingRides(userId, limit = 30) {
  const profile = await getCyclingProfile(userId);
  const zones = profile.powerZones;
  const rides = await Activity.findAll({
    where: { userId, type: { [Op.in]: RIDE_TYPES } },
    include: [{ model: ActivityStream, required: false }],
    attributes: { exclude: ['raw'] },
    order: [['startDate', 'DESC']],
    limit: Math.min(Number(limit) || 30, 100),
  });

  return rides.map(ride => serializeRide(ride, profile.ftp, zones));
}

async function getCyclingProgress(userId) {
  const [weights, streams] = await Promise.all([
    Weight.findAll({ where: { userId }, order: [['date', 'ASC']] }),
    ActivityStream.findAll({
      include: [{
        model: Activity,
        where: { userId, type: { [Op.in]: RIDE_TYPES } },
        attributes: ['id', 'startDate'],
      }],
      attributes: ['watts', 'time'],
    }),
  ]);

  const weightsByDate = weights.map(weight => ({
    date: String(weight.date),
    weight: Number(weight.weight),
  }));

  const findWeightAt = (date) => {
    const key = new Date(date).toISOString().slice(0, 10);
    let current = null;
    for (const row of weightsByDate) {
      if (row.date <= key) current = row.weight;
      if (row.date > key) break;
    }
    return current;
  };

  let best20 = 0;
  const points = [];

  const sortedStreams = streams
    .filter(stream => stream.Activity?.startDate)
    .sort((a, b) => new Date(a.Activity.startDate) - new Date(b.Activity.startDate));

  for (const stream of sortedStreams) {
    const activity = stream.Activity;
    const streamBest20 = bestAveragePower(stream.watts, stream.time, 1200);
    if (streamBest20 > best20) best20 = streamBest20;
    if (!best20) continue;

    const ftp = Math.round(best20 * 0.95);
    const weight = findWeightAt(activity.startDate);
    points.push({
      date: activity.startDate,
      ftp,
      weight: weight ? round(weight, 1) : null,
      ftpRelative: weight ? round(ftp / weight, 2) : null,
    });
  }

  if (points.length === 0 && weightsByDate.length > 0) {
    return weightsByDate.map(row => ({
      date: row.date,
      ftp: null,
      weight: round(row.weight, 1),
      ftpRelative: null,
    }));
  }

  return points;
}

async function getCyclingRecovery(userId) {
  const [load, lastRide] = await Promise.all([
    getTrainingLoad(userId, 8),
    Activity.findOne({
      where: { userId, type: { [Op.in]: RIDE_TYPES } },
      order: [['startDate', 'DESC']],
      attributes: ['startDate'],
    }),
  ]);

  const current = load[load.length - 1] || null;
  const daysOff = lastRide
    ? Math.max(0, Math.floor((Date.now() - new Date(lastRide.startDate).getTime()) / 86400000))
    : null;

  let recommendation = 'Connecte Strava et enrichis tes activités pour obtenir une lecture de récupération.';
  if (current?.status === 'overload') {
    recommendation = 'Charge élevée : privilégie une sortie facile ou un jour off.';
  } else if (current?.status === 'fresh') {
    recommendation = 'Forme positive : fenêtre favorable pour une séance qualitative si les sensations suivent.';
  } else if (current) {
    recommendation = 'Équilibre correct : maintiens le volume ou ajoute une intensité contrôlée.';
  }

  return {
    currentTsb: current?.tsb ?? null,
    atl: current?.atl ?? null,
    ctl: current?.ctl ?? null,
    status: current?.status || 'unknown',
    daysOff,
    recommendation,
    load,
  };
}

async function getCyclingInsights(userId) {
  const [profile, progress, recovery, rides] = await Promise.all([
    getCyclingProfile(userId),
    getCyclingProgress(userId),
    getCyclingRecovery(userId),
    getCyclingRides(userId, 100),
  ]);

  const insights = [];
  if (profile.ftp && profile.ftpRelative) {
    insights.push(`FTP estimée à ${profile.ftp} W, soit ${profile.ftpRelative} W/kg : niveau ${profile.level}.`);
  } else {
    insights.push('FTP non disponible : enrichis les streams de puissance Strava pour activer le profil complet.');
  }

  if (profile.restHeartrate) {
    insights.push(`FC repos renseignée à ${profile.restHeartrate} bpm, utile pour contextualiser la récupération.`);
  } else {
    insights.push('FC repos manquante : ajoute-la dans le profil pour fiabiliser les lectures cardio.');
  }

  const last = progress[progress.length - 1];
  const previous = progress.length > 1 ? progress[Math.max(0, progress.length - 6)] : null;
  if (last?.ftp && previous?.ftp) {
    const delta = last.ftp - previous.ftp;
    insights.push(delta >= 0
      ? `Progression FTP positive sur l'historique récent : +${delta} W.`
      : `FTP récente en retrait de ${Math.abs(delta)} W : surveille fatigue, volume et régularité.`);
  }

  const last28 = rides.filter(ride => Date.now() - new Date(ride.date).getTime() <= 28 * 86400000);
  const volumeHours = last28.reduce((sum, ride) => sum + ride.durationSeconds, 0) / 3600;
  insights.push(`Volume vélo des 28 derniers jours : ${round(volumeHours, 1)} h sur ${last28.length} sorties.`);

  if (recovery.currentTsb !== null) {
    insights.push(`TSB actuel ${recovery.currentTsb} (${recovery.status}) : ${recovery.recommendation}`);
  }

  return insights;
}

module.exports = {
  RIDE_TYPES,
  POWER_ZONE_DEFS,
  median,
  bestAveragePower,
  buildPowerZones,
  calculateZoneDurations,
  classifyCyclist,
  getCyclingProfile,
  getCyclingRides,
  getCyclingProgress,
  getCyclingRecovery,
  getCyclingInsights,
};
