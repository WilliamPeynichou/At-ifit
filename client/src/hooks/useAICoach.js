import { useState } from 'react';
import api from '../api';

export const useAICoach = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Historique au format Mistral [{role: 'user'|'assistant', content: string}]
  const [conversationHistory, setConversationHistory] = useState([]);

  const sendMessage = async (message) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/ai-coach/message', {
        message,
        history: conversationHistory
      });

      const aiResponse = response.data?.response;

      if (!aiResponse) {
        setError('Réponse vide de l\'IA');
        setLoading(false);
        return null;
      }

      // Ajouter l'échange à l'historique de conversation
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]);

      setLoading(false);
      return aiResponse;

    } catch (err) {
      let erroouirMessage = 'Erreur lors de l\'envoi du message';

      if (err.response) {
        errorMessage = err.response.data?.error || `Erreur ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  const resetHistory = () => setConversationHistory([]);

  return { sendMessage, loading, error, resetHistory };
};
