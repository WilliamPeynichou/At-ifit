import { useState } from 'react';
import api from '../api';

export const useAICoach = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (userId, message) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Frontend] Envoi du message:', { userId, message });
      
      const response = await api.post('/ai-coach/message', {
        userId,
        message
      });

      console.log('[Frontend] Réponse reçue:', response.data);
      
      const aiResponse = response.data?.response;
      
      if (!aiResponse) {
        console.error('[Frontend] Réponse vide ou invalide:', response.data);
        setError('Réponse vide de l\'AI');
        setLoading(false);
        return null;
      }
      
      setLoading(false);
      return aiResponse;
      
    } catch (err) {
      console.error('[Frontend] Erreur complète:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        fullError: err
      });
      
      let errorMessage = 'Erreur lors de l\'envoi du message';
      
      if (err.response) {
        // Erreur HTTP avec réponse
        errorMessage = err.response.data?.error || `Erreur ${err.response.status}: ${err.response.statusText}`;
      } else if (err.request) {
        // Requête envoyée mais pas de réponse
        errorMessage = 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
      } else {
        // Erreur lors de la configuration de la requête
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  return { sendMessage, loading, error };
};

