const { Op, fn, col } = require('sequelize');
const Activity = require('../models/Activity');
const Goal = require('../models/Goal');
const User = require('../models/User');
const Weight = require('../models/Weight');
const logger = require('../utils/logger');
const { syncUserActivities } = require('./stravaSync');
const {
  assessClarificationNeed,
  buildAdvancedSportsAnalysisContext,
  getMedicalSafetyGuidance,
} = require('./advancedSportsAnalysisSkill');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 370;
const MAX_RECENT_ACTIVITIES = 12;

const VALID_GOAL_TYPES = ['distance_monthly', 'sessions_weekly', 'calories_weekly', 'elevation_monthly'];
const VALID_PERIODS = ['week', 'month'];

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

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const daysFromMonday = (day + 6) % 7;
  d.setDate(d.getDate() - daysFromMonday);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function clampDateRange({ from, to, defaultDays = 28 } = {}) {
  const now = new Date();
  let end = to ? endOfDay(to) : endOfDay(now);
  let start = from ? startOfDay(from) : startOfDay(addDays(end, -defaultDays + 1));

  if (Number.isNaN(start.getTime())) start = startOfDay(addDays(now, -defaultDays + 1));
  if (Number.isNaN(end.getTime())) end = endOfDay(now);
  if (start > end) [start, end] = [startOfDay(end), endOfDay(start)];

  const spanDays = Math.ceil((end - start) / DAY_MS) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    start = startOfDay(addDays(end, -MAX_RANGE_DAYS + 1));
  }
  return { from: start, to: end };
}

function formatKm(meters) {
  return Number(((Number(meters) || 0) / 1000).toFixed(1));
}

function formatHours(seconds) {
  return Number(((Number(seconds) || 0) / 3600).toFixed(1));
}

function summarizeActivities(rows) {
  const totals = rows.reduce((acc, a) => {
    acc.count += 1;
    acc.distanceKm += formatKm(a.distance);
    acc.durationHours += formatHours(a.movingTime);
    acc.elevationM += Number(a.totalElevationGain) || 0;
    acc.calories += Number(a.calories) || 0;
    if (a.averageHeartrate) {
      acc.hrSum += Number(a.averageHeartrate);
      acc.hrCount += 1;
    }
    if (a.averageWatts) {
      acc.powerSum += Number(a.averageWatts);
      acc.powerCount += 1;
    }
    if (a.averageCadence) {
      acc.cadenceSum += Number(a.averageCadence);
      acc.cadenceCount += 1;
    }
    return acc;
  }, { count: 0, distanceKm: 0, durationHours: 0, elevationM: 0, calories: 0, hrSum: 0, hrCount: 0, powerSum: 0, powerCount: 0, cadenceSum: 0, cadenceCount: 0 });

  return {
    count: totals.count,
    distanceKm: Number(totals.distanceKm.toFixed(1)),
    durationHours: Number(totals.durationHours.toFixed(1)),
    elevationM: Math.round(totals.elevationM),
    calories: Math.round(totals.calories),
    averageHeartrate: totals.hrCount ? Math.round(totals.hrSum / totals.hrCount) : null,
    averageWatts: totals.powerCount ? Math.round(totals.powerSum / totals.powerCount) : null,
    averageCadence: totals.cadenceCount ? Math.round(totals.cadenceSum / totals.cadenceCount) : null,
    missing: {
      heartrate: rows.filter(a => !a.averageHeartrate).length,
      power: rows.filter(a => !a.averageWatts).length,
      cadence: rows.filter(a => !a.averageCadence).length,
      calories: rows.filter(a => !a.calories).length,
    }
  };
}

function publicActivity(a) {
  return {
    id: a.id,
    type: a.type,
    name: a.name,
    date: a.startDate,
    distanceKm: formatKm(a.distance),
    durationMinutes: Math.round((Number(a.movingTime) || 0) / 60),
    elevationM: Math.round(Number(a.totalElevationGain) || 0),
    calories: a.calories || null,
    averageHeartrate: a.averageHeartrate ? Math.round(a.averageHeartrate) : null,
    maxHeartrate: a.maxHeartrate ? Math.round(a.maxHeartrate) : null,
    averageWatts: a.averageWatts ? Math.round(a.averageWatts) : null,
    averageCadence: a.averageCadence ? Math.round(a.averageCadence) : null,
    sufferScore: a.sufferScore || null,
  };
}

function detectIntent(message = '') {
  const m = message.toLowerCase();
  const intents = new Set(['profile']);
  if (/récen|recent|derni[eè]res?|meilleures?|sorties?|activit/.test(m)) intents.add('recent_activities');
  if (/semaine|hebdo|weekly|volume|charg|fatigue|trop|bilan/.test(m)) intents.add('weekly_volume');
  if (/mois|mensuel|monthly/.test(m)) intents.add('monthly_volume');
  if (/compare|comparaison|pr[eé]c[eé]dent|progress|tendance|progresse|baisse|hausse/.test(m)) intents.add('compare_periods');
  if (/objectif|goal/.test(m)) intents.add('goals');
  if (/poids|nutrition|calorie|kcal|imc/.test(m)) intents.add('profile');
  if (/bilan/.test(m)) intents.add('weekly_report');
  if (/cr[eé]e|ajoute|pr[eé]pare|lance|synchronis|sync|programme|planifie/.test(m)) intents.add('action_request');
  if (/(v[eé]lo|ride|cycling|cyclisme)/.test(m)) intents.add('sport_ride');
  if (/(course|run|running|courir)/.test(m)) intents.add('sport_run');
  if (/(natation|swim|nage)/.test(m)) intents.add('sport_swim');
  if (intents.size === 1) intents.add('recent_activities');
  return [...intents];
}

function sportFromIntents(intents) {
  if (intents.includes('sport_ride')) return 'Ride';
  if (intents.includes('sport_run')) return 'Run';
  if (intents.includes('sport_swim')) return 'Swim';
  return null;
}

async function getStravaStatus(userId) {
  const user = await User.findByPk(userId, { attributes: ['id', 'stravaAccessToken', 'lastSyncAt', 'fullSyncCompletedAt'] });
  return {
    connected: Boolean(user?.stravaAccessToken),
    lastSyncAt: user?.lastSyncAt || user?.fullSyncCompletedAt || null,
    dataSynced: Boolean(user?.lastSyncAt || user?.fullSyncCompletedAt),
  };
}

async function getActivitiesForPeriod(userId, { from, to, sportType = null } = {}) {
  const range = clampDateRange({ from, to });
  const where = { userId, startDate: { [Op.between]: [range.from, range.to] } };
  if (sportType) where.type = sportType;
  const rows = await Activity.findAll({ where, order: [['startDate', 'DESC']], limit: 500 });
  return {
    range,
    sportType,
    summary: summarizeActivities(rows),
    topActivities: rows
      .slice()
      .sort((a, b) => ((b.sufferScore || 0) - (a.sufferScore || 0)) || ((b.movingTime || 0) - (a.movingTime || 0)))
      .slice(0, 5)
      .map(publicActivity),
    recentActivities: rows.slice(0, MAX_RECENT_ACTIVITIES).map(publicActivity),
  };
}

async function getCurrentWeek(userId, sportType = null) {
  return getActivitiesForPeriod(userId, { from: startOfWeek(), to: new Date(), sportType });
}

async function compareRecentWeeks(userId, sportType = null) {
  const thisStart = startOfWeek();
  const prevStart = addDays(thisStart, -7);
  const prevEnd = addDays(thisStart, -1);
  const [current, previous] = await Promise.all([
    getActivitiesForPeriod(userId, { from: thisStart, to: new Date(), sportType }),
    getActivitiesForPeriod(userId, { from: prevStart, to: prevEnd, sportType }),
  ]);
  const diff = {
    sessions: current.summary.count - previous.summary.count,
    distanceKm: Number((current.summary.distanceKm - previous.summary.distanceKm).toFixed(1)),
    durationHours: Number((current.summary.durationHours - previous.summary.durationHours).toFixed(1)),
    elevationM: current.summary.elevationM - previous.summary.elevationM,
    calories: current.summary.calories - previous.summary.calories,
  };
  return { current, previous, diff };
}

async function getMonthlyVolume(userId, sportType = null) {
  const now = new Date();
  return getActivitiesForPeriod(userId, { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, sportType });
}

async function getProfileAndGoals(userId) {
  const [user, latestWeights, goals] = await Promise.all([
    User.findByPk(userId, { attributes: ['id', 'pseudo', 'age', 'height', 'gender', 'targetWeight', 'consoKcal', 'weeksToGoal', 'country', 'imc', 'bikeType', 'cyclingGoal'] }),
    Weight.findAll({ where: { userId }, order: [['date', 'DESC']], limit: 10, attributes: ['date', 'weight'] }),
    Goal.findAll({ where: { userId, active: true }, order: [['createdAt', 'DESC']], limit: 10 }),
  ]);
  return {
    profile: user ? {
      pseudo: user.pseudo,
      age: user.age,
      height: user.height,
      gender: user.gender,
      country: user.country,
      targetWeight: user.targetWeight,
      estimatedDailyCalories: user.consoKcal,
      weeksToGoal: user.weeksToGoal,
      imc: user.imc,
      bikeType: user.bikeType,
      cyclingGoal: user.cyclingGoal,
    } : null,
    weights: latestWeights.map(w => ({ date: w.date, weight: w.weight })),
    goals: goals.map(g => ({ id: g.id, type: g.type, sportType: g.sportType, targetValue: g.targetValue, period: g.period, active: g.active })),
  };
}

async function getPersonalRecords(userId, sportType = null) {
  const where = { userId };
  if (sportType) where.type = sportType;
  const [longest, highest, hardest] = await Promise.all([
    Activity.findOne({ where, order: [['distance', 'DESC']], attributes: ['id', 'type', 'name', 'startDate', 'distance', 'movingTime', 'totalElevationGain', 'averageWatts', 'averageHeartrate'] }),
    Activity.findOne({ where, order: [['totalElevationGain', 'DESC']], attributes: ['id', 'type', 'name', 'startDate', 'distance', 'movingTime', 'totalElevationGain', 'averageWatts', 'averageHeartrate'] }),
    Activity.findOne({ where, order: [['sufferScore', 'DESC'], ['movingTime', 'DESC']], attributes: ['id', 'type', 'name', 'startDate', 'distance', 'movingTime', 'totalElevationGain', 'sufferScore', 'averageWatts', 'averageHeartrate'] }),
  ]);
  return {
    longest: longest ? publicActivity(longest) : null,
    mostElevation: highest ? publicActivity(highest) : null,
    highestLoad: hardest ? publicActivity(hardest) : null,
  };
}

function shouldUseAdvancedSportsAnalysis(message = '') {
  return /(analyse|progress|progresse|bilan|sorties?|activit|cardio|fréquence cardiaque|frequence cardiaque|vitesse|allure|puissance|watts?|cadence|endurance|fatigue|récup|recup|stream|intervalles?|derni[eè]re sortie|prépa|prepa|course|vélo|velo|running|natation)/i.test(String(message));
}

async function buildTargetedAgentContext(userId, message) {
  const intents = detectIntent(message);
  const sportType = sportFromIntents(intents);
  const dataUsed = [];
  const [status, profile] = await Promise.all([getStravaStatus(userId), getProfileAndGoals(userId)]);
  const context = { generatedAt: new Date().toISOString(), intents, strava: status, profile: profile.profile, weights: profile.weights, goals: profile.goals };
  dataUsed.push('profile_without_secrets', 'active_goals', 'strava_connection_status');

  if (shouldUseAdvancedSportsAnalysis(message)) {
    const clarification = assessClarificationNeed(message);
    context.advancedSportsAnalysis = {
      clarification,
      instructions: {
        askClarificationBeforeDeepAnalysis: clarification.needsClarification,
        doNotInventMissingMetrics: true,
        useStreamsOnlyWhenUseful: true,
        medicalSafety: getMedicalSafetyGuidance(message),
      },
    };
    dataUsed.push('advanced_sports_analysis_skill', 'clarification_assessment');

    if (!clarification.needsClarification) {
      const advanced = await buildAdvancedSportsAnalysisContext(userId, {
        message,
        sportType,
        includeStreams: /(stream|détail|detail|intervalles?|derni[eè]re sortie|cardio|puissance|cadence|allure|vitesse)/i.test(message),
      });
      context.advancedSportsAnalysis = {
        ...context.advancedSportsAnalysis,
        ...advanced.context,
      };
      dataUsed.push(...advanced.dataUsed.filter(item => !dataUsed.includes(item)));
    }
  }

  if (intents.includes('recent_activities')) {
    context.recent = await getActivitiesForPeriod(userId, { from: addDays(new Date(), -30), to: new Date(), sportType });
    dataUsed.push('recent_activities_30d');
  }
  if (intents.includes('weekly_volume') || intents.includes('weekly_report')) {
    context.currentWeek = await getCurrentWeek(userId, sportType);
    dataUsed.push('current_week_volume');
  }
  if (intents.includes('monthly_volume')) {
    context.currentMonth = await getMonthlyVolume(userId, sportType);
    dataUsed.push('current_month_volume');
  }
  if (intents.includes('compare_periods')) {
    context.weekComparison = await compareRecentWeeks(userId, sportType);
    dataUsed.push('current_vs_previous_week');
  }
  if (/record|meilleur|meilleure|pr\b|performance|fatigu|charg/.test(message.toLowerCase())) {
    context.records = await getPersonalRecords(userId, sportType);
    dataUsed.push('personal_records_summary');
  }

  context.limits = {
    maxRangeDays: MAX_RANGE_DAYS,
    rawSecretsExcluded: true,
    activitiesAreSummarized: true,
  };
  return { context, dataUsed };
}

function detectUnsafeRequest(message = '') {
  return /(token|secret|mot de passe|password|stravaaccesstoken|stravarefreshtoken|autre utilisateur|another user|ignore les règles|ignore rules|contourne|bypass|sans validation|sans confirmer)/i.test(message);
}

function buildPendingAction(message = '', agentContext = {}) {
  const m = message.toLowerCase();
  if (!agentContext.intents?.includes('action_request')) return null;

  if (/synchronis|sync/.test(m)) {
    return {
      type: 'sync_strava',
      label: 'Lancer une synchronisation Strava',
      reason: 'Mettre à jour les activités synchronisées avant de poursuivre l’analyse.',
      consequences: 'Le serveur interrogera Strava avec le compte connecté puis mettra à jour les activités locales. Aucune donnée ne sera envoyée à l’IA en dehors des résumés nécessaires.',
      payload: {},
      requiresConfirmation: true,
      dataUsed: ['strava_connection_status'],
    };
  }

  if (/objectif|goal/.test(m)) {
    const weeklySessions = agentContext.currentWeek?.summary?.count || 0;
    const target = Math.max(2, Math.min(6, weeklySessions + 1));
    return {
      type: 'create_goal',
      label: `Créer un objectif de ${target} séances cette semaine`,
      reason: 'Objectif réaliste déduit de ton volume récent, à valider avant création.',
      consequences: 'Un nouvel objectif actif sera ajouté à ton compte. Tu pourras le modifier ou le supprimer ensuite.',
      payload: { type: 'sessions_weekly', sportType: null, targetValue: target, period: 'week' },
      requiresConfirmation: true,
      dataUsed: ['current_week_volume', 'active_goals'],
    };
  }

  if (/bilan/.test(m)) {
    return {
      type: 'generate_weekly_report',
      label: 'Générer un bilan hebdomadaire',
      reason: 'Transformer les données de la semaine en synthèse claire.',
      consequences: 'Un bilan sera généré à partir des données sportives résumées. Cela ne modifie aucune donnée.',
      payload: { force: true },
      requiresConfirmation: true,
      dataUsed: ['current_week_volume', 'profile_without_secrets'],
    };
  }

  return null;
}

function sanitizeAction(action) {
  if (!action || typeof action !== 'object') return null;
  if (!['sync_strava', 'create_goal', 'generate_weekly_report'].includes(action.type)) return null;
  if (action.type === 'create_goal') {
    const payload = action.payload || {};
    if (!VALID_GOAL_TYPES.includes(payload.type) || !VALID_PERIODS.includes(payload.period)) return null;
    const targetValue = Number(payload.targetValue);
    if (!Number.isFinite(targetValue) || targetValue <= 0 || targetValue > 100000) return null;
    return {
      type: 'create_goal',
      payload: {
        type: payload.type,
        sportType: payload.sportType || null,
        targetValue,
        period: payload.period,
      }
    };
  }
  return { type: action.type, payload: action.payload || {} };
}

async function executeConfirmedAction(userId, action) {
  const safe = sanitizeAction(action);
  if (!safe) return { success: false, error: 'Action invalide ou non autorisée.' };

  if (safe.type === 'sync_strava') {
    const status = await getStravaStatus(userId);
    if (!status.connected) return { success: false, error: 'Strava n’est pas connecté pour cet utilisateur.' };
    syncUserActivities(userId, { enrich: true }).catch(err => logger.error('[AgentAction] Sync Strava échouée', { userId, error: err.message }));
    return { success: true, message: 'Synchronisation Strava lancée. Les nouvelles données apparaîtront dès la fin du traitement.', status: 'queued' };
  }

  if (safe.type === 'create_goal') {
    const goal = await Goal.create({ userId, ...safe.payload, active: true });
    logger.info('[AgentAction] Objectif créé après validation', { userId, goalId: goal.id, type: goal.type });
    return { success: true, message: 'Objectif créé avec succès.', goal };
  }

  if (safe.type === 'generate_weekly_report') {
    const { generateWeeklyReport } = require('./aiCoachService');
    const report = await generateWeeklyReport(userId, Boolean(safe.payload.force));
    if (!report.success) return report;
    return { success: true, message: 'Bilan hebdomadaire généré.', report: report.report, generatedAt: report.generatedAt };
  }

  return { success: false, error: 'Action non prise en charge.' };
}

module.exports = {
  buildTargetedAgentContext,
  buildPendingAction,
  detectIntent,
  detectUnsafeRequest,
  executeConfirmedAction,
  shouldUseAdvancedSportsAnalysis,
  summarizeActivities,
  clampDateRange,
};
