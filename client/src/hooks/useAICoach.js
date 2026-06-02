import { useState } from 'react';
import api from '../api';

export const useAICoach = () => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const normalizeAssistantText = (data) => (
    data?.response || data?.message || data?.text || ''
  );

  const sendMessage = async (message) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/ai-coach/message', {
        message,
        history: conversationHistory
      });

      const payload = response.data || {};
      const aiResponse = normalizeAssistantText(payload);

      if (!aiResponse) {
        setError('Réponse vide de l\'IA');
        return null;
      }

      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ].slice(-24));

      return {
        ...payload,
        response: aiResponse,
        actionProposal: payload.actionProposal || payload.pendingAction || null,
        dataSources: payload.dataSources || payload.usedData || [],
        status: payload.status || (payload.actionProposal || payload.pendingAction ? 'action_pending' : 'answered')
      };
    } catch (err) {
      let errorMessage = 'Erreur lors de l\'envoi du message';

      if (err.response) {
        errorMessage = err.response.data?.error || `Erreur ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionId, decision = 'confirm') => {
    if (!actionId) return null;

    setActionLoading(true);
    setError(null);

    try {
      const endpoint = decision === 'confirm'
        ? `/ai-coach/actions/${actionId}/confirm`
        : `/ai-coach/actions/${actionId}/cancel`;

      const response = await api.post(endpoint);
      const payload = response.data || {};
      const aiResponse = normalizeAssistantText(payload) || (
        decision === 'confirm'
          ? 'Action exécutée avec succès.'
          : 'Action annulée. Rien n’a été modifié.'
      );

      setConversationHistory(prev => [
        ...prev,
        { role: 'assistant', content: aiResponse }
      ].slice(-24));

      return { ...payload, response: aiResponse };
    } catch (err) {
      let errorMessage = decision === 'confirm'
        ? 'Impossible d’exécuter cette action pour le moment.'
        : 'Impossible d’annuler cette action pour le moment.';

      if (err.response) {
        errorMessage = err.response.data?.error || errorMessage;
      } else if (!err.request) {
        errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
      return { response: errorMessage, error: true };
    } finally {
      setActionLoading(false);
    }
  };

  const resetHistory = () => {
    setConversationHistory([]);
    setError(null);
  };

  return { sendMessage, executeAction, loading, actionLoading, error, resetHistory, conversationHistory };
};
