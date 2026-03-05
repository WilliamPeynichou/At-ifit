const { getUserContext } = require('./userContextService');
const logger = require('../utils/logger');

// Configurable via .env — supporte Ollama (local) et Mistral cloud
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';
// CPU local : 120s. Cloud : 30s
const MISTRAL_TIMEOUT_MS = parseInt(process.env.MISTRAL_TIMEOUT_MS || '120000', 10);

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
 * Envoie un message à Mistral AI et retourne la réponse
 * @param {number} userId - ID utilisateur (vérifié par middleware auth)
 * @param {string} message - Message courant de l'utilisateur
 * @param {Array} history - Historique de la conversation [{role, content}]
 * @returns {Promise<Object>} { success, message } ou { success: false, error }
 */
async function sendMessageToAICoach(userId, message, history = []) {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey || (apiKey === 'your_mistral_api_key_here' && MISTRAL_API_URL.includes('mistral.ai'))) {
    logger.error('[AI Coach] MISTRAL_API_KEY non configurée');
    return {
      success: false,
      error: 'Le service IA n\'est pas configuré. Veuillez contacter l\'administrateur.'
    };
  }

  try {
    const userContext = await getUserContext(parseInt(userId));
    const systemPrompt = buildSystemPrompt(userContext);

    // Limite l'historique aux 4 derniers messages (2 échanges) pour éviter le timeout sur CPU
    const MAX_HISTORY = parseInt(process.env.MISTRAL_MAX_HISTORY || '4', 10);
    const trimmedHistory = history.slice(-MAX_HISTORY);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message }
    ];

    logger.info('[AI Coach] Requête Mistral', {
      userId,
      historyLength: history.length,
      messageLength: message.length,
      hasContext: !!userContext
    });

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: parseInt(process.env.MISTRAL_MAX_TOKENS || '256', 10)
      }),
      signal: AbortSignal.timeout(MISTRAL_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('[AI Coach] Erreur API Mistral', { status: response.status, body: errorBody });
      return {
        success: false,
        error: 'Le service IA est temporairement indisponible. Réessayez dans quelques instants.'
      };
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      logger.error('[AI Coach] Réponse Mistral vide', { data });
      return { success: false, error: 'Réponse vide du service IA.' };
    }

    logger.info('[AI Coach] Réponse reçue', { userId, responseLength: aiMessage.length });

    return { success: true, message: aiMessage };

  } catch (error) {
    if (error.name === 'TimeoutError') {
      logger.error('[AI Coach] Timeout Mistral', { userId });
      return { success: false, error: 'Le service IA met trop de temps à répondre. Réessayez.' };
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

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || (apiKey === 'your_mistral_api_key_here' && MISTRAL_API_URL.includes('mistral.ai'))) {
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

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Génère mon bilan de la semaine.' },
        ],
        temperature: 0.7,
        max_tokens: parseInt(process.env.MISTRAL_MAX_TOKENS || '512', 10),
      }),
      signal: AbortSignal.timeout(MISTRAL_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('[WeeklyReport] Erreur API', { status: response.status, body: errorBody });
      return { success: false, error: 'Service IA temporairement indisponible.' };
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;
    if (!report) return { success: false, error: 'Réponse vide du service IA.' };

    const generatedAt = Date.now();
    reportCache.set(userId, { report, generatedAt });
    logger.info('[WeeklyReport] Rapport généré', { userId, length: report.length });

    return { success: true, report, cached: false, generatedAt };
  } catch (err) {
    if (err.name === 'TimeoutError') {
      logger.error('[WeeklyReport] Timeout', { userId });
      return { success: false, error: 'Le service IA met trop de temps à répondre.' };
    }
    logger.error('[WeeklyReport] Erreur inattendue', { userId, error: err.message });
    return { success: false, error: 'Erreur lors de la génération du bilan.' };
  }
}

module.exports = { sendMessageToAICoach, generateWeeklyReport };
