const { getUserContext } = require('./userContextService');
const logger = require('../utils/logger');

// Configurable via .env — supporte Anthropic (Claude), Mistral cloud et Ollama (compatible OpenAI)
const AI_PROVIDER = (process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'mistral')).toLowerCase();

const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';
const ANTHROPIC_API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';
// CPU local : 120s. Cloud : 30s
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || process.env.MISTRAL_TIMEOUT_MS || process.env.ANTHROPIC_TIMEOUT_MS || '120000', 10);

/**
 * Construit le system prompt à partir du contexte utilisateur
 */
function buildSystemPrompt(context) {
  if (!context) {
    return `Tu es un coach sportif et nutritionnel expert et bienveillant.
Réponds en français, de façon concise et motivante.
Adapte tes conseils selon ce que l'utilisateur partage avec toi.

Format de réponse OBLIGATOIRE :
Écris en paragraphes courts et aérés, séparés par une ligne vide.
N'utilise PAS de tirets (-), de listes à puces (*), ni de titres en gras (**Titre :**).
Si tu dois énumérer des éléments, intègre-les dans le texte de façon fluide ou sépare chaque point par un saut de ligne simple.
Chaque idée importante = un paragraphe distinct.
Ton naturel, direct, comme un coach qui parle à son athlète.`;
  }

  const lines = [
    `Tu es un coach sportif et nutritionnel expert et bienveillant.`,
    `Voici le profil de l'utilisateur avec qui tu discutes :`,
    ``,
    `Identité :`,
    `- Pseudo : ${context.pseudo || 'Utilisateur'}`,
  ];

  if (context.age) lines.push(`- Âge : ${context.age} ans`);
  if (context.height) lines.push(`- Taille : ${context.height} cm`);
  if (context.gender) lines.push(`- Genre : ${context.gender}`);
  if (context.country) lines.push(`- Pays : ${context.country}`);

  if (context.weightStats?.current) {
    lines.push(``, `Suivi du poids :`);
    lines.push(`- Poids actuel : ${context.weightStats.current} kg`);
    if (context.targetWeight) lines.push(`- Objectif : ${context.targetWeight} kg`);
    if (context.weightStats.trend) lines.push(`- Tendance (30j) : ${context.weightStats.trend}`);
  }

  if (context.consoKcal) {
    lines.push(``, `Nutrition :`);
    lines.push(`- TDEE estimé : ${context.consoKcal} kcal/jour`);
    if (context.weeksToGoal) lines.push(`- Semaines estimées pour l'objectif : ${context.weeksToGoal}`);
  }

  if (context.recentActivities?.length > 0) {
    lines.push(``, `Activités récentes (Strava) :`);
    context.recentActivities.slice(0, 5).forEach(a => {
      const parts = [a.type];
      if (a.distance) parts.push(a.distance);
      if (a.duration) parts.push(a.duration);
      if (a.date) parts.push(new Date(a.date).toLocaleDateString('fr-FR'));
      lines.push(`- ${parts.join(' | ')}`);
    });
  } else if (!context.stravaConnected) {
    lines.push(``, `Strava : non connecté`);
  }

  lines.push(
    ``,
    `Instructions :`,
    `- Réponds toujours en français, de façon concise et motivante.`,
    `- Utilise le prénom de l'utilisateur quand c'est naturel.`,
    `- Base tes conseils sur les données ci-dessus quand c'est pertinent.`,
    `- Si tu n'as pas assez de données pour répondre précisément, dis-le et demande les informations manquantes.`,
    ``,
    `Format de réponse OBLIGATOIRE :`,
    `- Écris en paragraphes courts et aérés, séparés par une ligne vide.`,
    `- N'utilise PAS de tirets (-), de listes à puces (*), ni de titres en gras (**Titre :**).`,
    `- Si tu dois énumérer des éléments, intègre-les dans le texte de façon fluide ou sépare chaque point par un saut de ligne simple.`,
    `- Chaque idée importante = un paragraphe distinct.`,
    `- Ton naturel, direct, comme un coach qui parle à son athlète.`
  );

  return lines.join('\n');
}

/**
 * Retourne la configuration active du fournisseur IA.
 */
function getAIProviderConfig() {
  if (AI_PROVIDER === 'anthropic') {
    return {
      provider: 'anthropic',
      label: 'Anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      missingKey: !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here',
      maxHistory: parseInt(process.env.ANTHROPIC_MAX_HISTORY || process.env.AI_MAX_HISTORY || '4', 10),
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || process.env.AI_MAX_TOKENS || '512', 10),
    };
  }

  return {
    provider: 'mistral',
    label: MISTRAL_API_URL.includes('mistral.ai') ? 'Mistral' : 'Ollama',
    apiKey: process.env.MISTRAL_API_KEY,
    missingKey: !process.env.MISTRAL_API_KEY || (process.env.MISTRAL_API_KEY === 'your_mistral_api_key_here' && MISTRAL_API_URL.includes('mistral.ai')),
    maxHistory: parseInt(process.env.MISTRAL_MAX_HISTORY || process.env.AI_MAX_HISTORY || '4', 10),
    maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS || process.env.AI_MAX_TOKENS || '256', 10),
  };
}

function normalizeMessages(history, message) {
  return [
    ...history
      .filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];
}

async function callAnthropic(systemPrompt, messages, options = {}) {
  const config = getAIProviderConfig();

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system: systemPrompt,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || config.maxTokens,
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('[AI Coach] Erreur API Anthropic', { status: response.status, body: errorBody });
    return { success: false, error: 'Le service IA est temporairement indisponible. Réessayez dans quelques instants.' };
  }

  const data = await response.json();
  const text = data.content
    ?.filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim();

  if (!text) {
    logger.error('[AI Coach] Réponse Anthropic vide', { data });
    return { success: false, error: 'Réponse vide du service IA.' };
  }

  return { success: true, message: text };
}

async function callMistral(systemPrompt, messages, options = {}) {
  const config = getAIProviderConfig();

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || config.maxTokens
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('[AI Coach] Erreur API Mistral', { status: response.status, body: errorBody });
    return { success: false, error: 'Le service IA est temporairement indisponible. Réessayez dans quelques instants.' };
  }

  const data = await response.json();
  const aiMessage = data.choices?.[0]?.message?.content;

  if (!aiMessage) {
    logger.error('[AI Coach] Réponse Mistral vide', { data });
    return { success: false, error: 'Réponse vide du service IA.' };
  }

  return { success: true, message: aiMessage };
}

async function callAI(systemPrompt, messages, options = {}) {
  if (AI_PROVIDER === 'anthropic') {
    return callAnthropic(systemPrompt, messages, options);
  }

  return callMistral(systemPrompt, messages, options);
}

async function sendMessageToAICoach(userId, message, history = []) {
  const config = getAIProviderConfig();

  if (config.missingKey) {
    logger.error(`[AI Coach] Clé API ${config.label} non configurée`);
    return {
      success: false,
      error: 'Le service IA n\'est pas configuré. Veuillez contacter l\'administrateur.'
    };
  }

  try {
    const userContext = await getUserContext(parseInt(userId));
    const systemPrompt = buildSystemPrompt(userContext);

    // Limite l'historique aux derniers messages pour maîtriser le coût/temps de réponse.
    const trimmedHistory = history.slice(-config.maxHistory);
    const messages = normalizeMessages(trimmedHistory, message);

    logger.info(`[AI Coach] Requête ${config.label}`, {
      userId,
      provider: config.provider,
      historyLength: history.length,
      messageLength: message.length,
      hasContext: !!userContext
    });

    const result = await callAI(systemPrompt, messages);

    if (!result.success) return result;

    logger.info('[AI Coach] Réponse reçue', { userId, provider: config.provider, responseLength: result.message.length });
    return result;

  } catch (error) {
    if (error.name === 'TimeoutError') {
      logger.error(`[AI Coach] Timeout ${config.label}`, { userId });
      return { success: false, error: 'Le service IA met trop de temps à répondre. Réessayez.' };
    }
    if (error.message === 'fetch failed' || error.cause?.code === 'ECONNREFUSED') {
      logger.error(`[AI Coach] ${config.label} non joignable`, { userId });
      return { success: false, error: 'Le service IA est temporairement indisponible.' };
    }
    logger.error('[AI Coach] Erreur inattendue', { userId, error: error.message });
    return { success: false, error: 'Erreur lors de la communication avec le service IA.' };
  }
}

// ── Cache mémoire pour le rapport hebdomadaire (24h) ────────────────────────
const reportCache = new Map(); // userId → { report, generatedAt }
const REPORT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Génère ou retourne depuis le cache le rapport hebdomadaire IA
 * @param {number} userId
 * @param {boolean} force - Ignore le cache si true
 */
async function generateWeeklyReport(userId, force = false) {
  const cached = reportCache.get(userId);
  if (!force && cached && Date.now() - cached.generatedAt < REPORT_TTL_MS) {
    return { success: true, report: cached.report, cached: true, generatedAt: cached.generatedAt };
  }

  const config = getAIProviderConfig();
  if (config.missingKey) {
    return { success: false, error: 'Service IA non configuré.' };
  }

  try {
    const userContext = await getUserContext(parseInt(userId));
    const pseudo = userContext?.pseudo || 'Athlète';

    const actsSummary = (userContext?.recentActivities || []).slice(0, 10).map(a => {
      const parts = [a.type];
      if (a.distance) parts.push(a.distance);
      if (a.duration) parts.push(a.duration);
      if (a.date) parts.push(new Date(a.date).toLocaleDateString('fr-FR'));
      return `  - ${parts.join(' | ')}`;
    }).join('\n') || '  (aucune activité récente)';

    const weightInfo = userContext?.weightStats?.current
      ? `Poids actuel : ${userContext.weightStats.current} kg${userContext.weightStats.trend ? ` (tendance : ${userContext.weightStats.trend})` : ''}`
      : 'Poids non renseigné.';

    const systemPrompt = `Tu es un coach sportif et nutritionnel expert.
Tu dois rédiger un bilan hebdomadaire structuré en exactement 3 paragraphes.

Profil de l'athlète :
- Pseudo : ${pseudo}
${userContext?.age ? `- Âge : ${userContext.age} ans` : ''}
${userContext?.consoKcal ? `- TDEE estimé : ${userContext.consoKcal} kcal/jour` : ''}

${weightInfo}

Activités de la semaine :
${actsSummary}

Format de réponse OBLIGATOIRE :
Paragraphe 1 : Bilan des activités (volume, fréquence, types).
Paragraphe 2 : Analyse du poids et de la nutrition si données disponibles.
Paragraphe 3 : Conseil motivant et recommandation concrète pour la semaine suivante.

N'utilise PAS de tirets (-), de listes à puces (*), ni de titres en gras (**Titre :**).
Chaque paragraphe doit être séparé par une ligne vide.
Ton naturel et motivant, comme un coach qui parle directement à son athlète.`;

    const result = await callAI(
      systemPrompt,
      [{ role: 'user', content: 'Génère mon bilan de la semaine.' }],
      { maxTokens: parseInt(process.env.AI_WEEKLY_REPORT_MAX_TOKENS || process.env.ANTHROPIC_MAX_TOKENS || process.env.MISTRAL_MAX_TOKENS || '512', 10) }
    );

    if (!result.success) {
      logger.error('[WeeklyReport] Erreur API', { provider: config.provider, error: result.error });
      return { success: false, error: result.error || 'Service IA temporairement indisponible.' };
    }

    const report = result.message;
    if (!report) return { success: false, error: 'Réponse vide du service IA.' };

    const generatedAt = Date.now();
    reportCache.set(userId, { report, generatedAt });
    logger.info('[WeeklyReport] Rapport généré', { userId, length: report.length });

    return { success: true, report, cached: false, generatedAt };
  } catch (err) {
    if (err.name === 'TimeoutError') {
      logger.error(`[WeeklyReport] Timeout ${config.label}`, { userId });
      return { success: false, error: 'Le service IA met trop de temps à répondre. Réessayez.' };
    }
    if (err.message === 'fetch failed' || err.cause?.code === 'ECONNREFUSED') {
      logger.error(`[WeeklyReport] ${config.label} non joignable`, { userId });
      return { success: false, error: 'Le service IA est temporairement indisponible.' };
    }
    logger.error('[WeeklyReport] Erreur inattendue', { userId, error: err.message });
    return { success: false, error: 'Erreur lors de la génération du bilan.' };
  }
}

module.exports = { sendMessageToAICoach, generateWeeklyReport };
