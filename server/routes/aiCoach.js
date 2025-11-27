const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const { sendMessageToAICoach } = require('../services/aiCoachService');

// POST /api/ai-coach/message
router.post('/message', auth, async (req, res) => {
  try {
    // Utiliser req.userId du middleware auth au lieu du body
    const userId = req.userId;
    const { message } = req.body;
    
    console.log('[AI Coach Route] Requête reçue:', { userId, message: message?.substring(0, 50) + '...' });
    
    // Validation
    if (!message || !message.trim()) {
      console.error('[AI Coach Route] Validation échouée:', { hasMessage: !!message });
      return res.status(400).json({
        error: 'Le message est requis'
      });
    }

    // Appel au webhook n8n avec le userId authentifié
    const result = await sendMessageToAICoach(userId, message.trim());
    
    console.log('[AI Coach Route] Résultat du service:', { 
      success: result.success, 
      hasMessage: !!result.message,
      messageLength: result.message?.length 
    });
    
    if (result.success) {
      res.json({
        response: result.message,
        sessionId: result.sessionId
      });
    } else {
      console.error('[AI Coach Route] Erreur du service:', result.error);
      res.status(500).json({
        error: result.error || 'Erreur lors de la communication avec l\'AI'
      });
    }
    
  } catch (error) {
    console.error('[AI Coach Route] Erreur serveur:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;

