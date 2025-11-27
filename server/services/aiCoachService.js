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
      userId: userId,
      messageLength: message.length,
      hasUserContext: !!userContext,
      userContextKeys: userContext ? Object.keys(userContext) : []
    });
    
    const response = await fetch(AI_COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      timeout: 60000 // 60 secondes de timeout
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
    
    // La réponse de l'AI peut être dans data.output, data.response, ou directement dans data
    let aiMessage = null;
    
    if (data.output) {
      aiMessage = data.output;
    } else if (data.response) {
      aiMessage = data.response;
    } else if (typeof data === 'string') {
      aiMessage = data;
    } else if (data.message) {
      aiMessage = data.message;
    } else if (data.text) {
      aiMessage = data.text;
    }
    
    if (!aiMessage || (typeof aiMessage === 'string' && !aiMessage.trim())) {
      console.error('[AI Coach] Structure de réponse inattendue:', data);
      throw new Error(`Réponse invalide du webhook n8n: aucun message trouvé. Réponse reçue: ${JSON.stringify(data)}`);
    }
    
    // S'assurer que c'est une string
    const messageText = typeof aiMessage === 'string' ? aiMessage : JSON.stringify(aiMessage);
    
    console.log('[AI Coach] Réponse de l\'AI extraite:', messageText.substring(0, 100) + '...');
    
    return {
      success: true,
      message: messageText,
      sessionId: data.sessionId || sessionId
    };
    
  } catch (error) {
    console.error('[AI Coach] Erreur lors de la communication avec l\'AI Coach:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    return {
      success: false,
      error: error.message || 'Erreur inconnue lors de la communication avec l\'AI'
    };
  }
}

module.exports = { sendMessageToAICoach };

