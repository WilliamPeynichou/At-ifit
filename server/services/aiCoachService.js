const AI_COACH_WEBHOOK_URL = 'https://williampeynichou.app.n8n.cloud/webhook/34393d88-7535-40f2-a32b-8b12196ffc55/chat';
const { getUserContext } = require('./userContextService');

/**
 * Envoie un message au coach AI et récupère la réponse
 * @param {string} userId - ID unique de l'utilisateur (vérifié par le middleware auth)
 * @param {string} message - Message de l'utilisateur
 * @param {string} token - Token JWT pour vérification dans n8n
 * @returns {Promise<Object>} Réponse de l'AI
 */
async function sendMessageToAICoach(userId, message, token) {
  try {
    // Convertir userId en string si nécessaire
    const sessionId = String(userId);
    
    // Récupérer le contexte utilisateur pour enrichir la requête
    // Le userId est déjà vérifié par le middleware auth
    const userContext = await getUserContext(parseInt(userId));
    
    if (!userContext) {
      console.warn('[AI Coach] Contexte utilisateur non trouvé pour userId:', userId);
      // Continuer quand même, mais avec un contexte minimal
    }
    
    const requestBody = {
      action: 'sendMessage',
      sessionId: sessionId,
      chatInput: message,
      userContext: userContext || { userId: parseInt(userId) }, // Contexte utilisateur ou minimal
      authToken: token, // Token JWT pour vérification dans n8n
      authenticatedUserId: parseInt(userId) // ID vérifié par le backend
    };
    
    console.log('[AI Coach] Envoi de la requête au webhook n8n:', {
      url: AI_COACH_WEBHOOK_URL,
      body: requestBody
    });
    
    const response = await fetch(AI_COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[AI Coach] Statut de la réponse:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Coach] Erreur HTTP:', errorText);
      
      let errorMessage = `Erreur HTTP ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code === 404 && errorData.message?.includes('not registered')) {
          errorMessage = 'Le workflow n8n n\'est pas activé. Veuillez activer le workflow dans n8n pour utiliser le chatbot.';
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Si ce n'est pas du JSON, utiliser le texte brut
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[AI Coach] Réponse complète du webhook:', JSON.stringify(data, null, 2));
    
    // La réponse de l'AI se trouve dans data.output
    if (!data.output) {
      console.error('[AI Coach] Structure de réponse inattendue:', data);
      throw new Error(`Réponse invalide du webhook n8n: champ "output" manquant. Réponse reçue: ${JSON.stringify(data)}`);
    }
    
    console.log('[AI Coach] Réponse de l\'AI extraite:', data.output.substring(0, 100) + '...');
    
    return {
      success: true,
      message: data.output,
      sessionId: data.sessionId || sessionId
    };
    
  } catch (error) {
    console.error('[AI Coach] Erreur lors de la communication avec l\'AI Coach:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { sendMessageToAICoach };

