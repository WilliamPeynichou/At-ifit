const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const { sendMessageToAICoach } = require('../services/aiCoachService');

// POST /api/ai-coach/message
router.post('/message', auth, async (req, res) => {
  try {
    // Utiliser req.userId du middleware auth (vérifié par le token JWT)
    const userId = req.userId;
    const { message } = req.body;
    
    // Récupérer le token pour le transmettre à n8n pour vérification
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('[AI Coach Route] Requête reçue:', { 
      userId, 
      authenticatedUserId: req.userId,
      hasToken: !!token,
      message: message?.substring(0, 50) + '...' 
    });
    
    // Validation
    if (!message || !message.trim()) {
      console.error('[AI Coach Route] Validation échouée:', { hasMessage: !!message });
      return res.status(400).json({
        error: 'Le message est requis'
      });
    }

    // Vérification de sécurité : s'assurer que le userId correspond bien à l'utilisateur authentifié
    if (!userId || userId !== req.userId) {
      console.error('[AI Coach Route] Erreur de sécurité: userId mismatch', { 
        providedUserId: userId, 
        authenticatedUserId: req.userId 
      });
      return res.status(403).json({
        error: 'Accès non autorisé'
      });
    }

    // Appel au webhook n8n avec le userId authentifié et le token pour vérification
    const result = await sendMessageToAICoach(userId, message.trim(), token);
    
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

