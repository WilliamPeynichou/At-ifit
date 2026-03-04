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
Adapte tes conseils selon ce que l'utilisateur partage avec toi.`;
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
    `- Si tu n'as pas assez de données pour répondre précisément, dis-le et demande les informations manquantes.`
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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
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
        max_tokens: 1024
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

module.exports = { sendMessageToAICoach };
