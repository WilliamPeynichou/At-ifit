import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { useAICoach } from '../hooks/useAICoach';
import { useAuth } from '../context/AuthContext';

const EXAMPLE_QUESTIONS = [
  'Quel est mon volume cette semaine ?',
  'Compare ma semaine actuelle avec la précédente.',
  'Ai-je trop chargé ces derniers jours ?',
  'Quelles sont mes meilleures sorties récentes ?',
  'Prépare-moi un bilan de la semaine.'
];

const makeMessage = (type, text, extras = {}) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type,
  text,
  ...extras
});

const AgentStatus = ({ loading, pendingAction }) => {
  if (pendingAction) {
    return {
      label: 'Action en attente de validation',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      color: '#d97706',
      bg: 'rgba(245,158,11,0.12)'
    };
  }

  if (loading) {
    return {
      label: 'Analyse des données sportives...',
      icon: <BarChart3 className="w-3.5 h-3.5 animate-pulse" />,
      color: 'var(--accent-blue)',
      bg: 'rgba(0,85,255,0.10)'
    };
  }

  return {
    label: 'Assistant sécurisé en ligne',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    color: '#16a34a',
    bg: 'rgba(34,197,94,0.10)'
  };
};

const Chatbot = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const { sendMessage, executeAction, loading, actionLoading, error, resetHistory } = useAICoach();
  const [messages, setMessages] = useState([
    makeMessage(
      'bot',
      'Bonjour ! Je suis votre assistant sportif agentique. Je peux analyser vos données synchronisées dans l’application, comparer vos périodes, expliquer vos tendances et proposer des actions uniquement après votre validation.'
    )
  ]);
  const [inputValue, setInputValue] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);

  const status = AgentStatus({ loading, pendingAction });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const canSend = useMemo(() => (
    Boolean(inputValue.trim()) && !loading && !actionLoading && Boolean(user?.id)
  ), [inputValue, loading, actionLoading, user?.id]);

  const addAssistantError = (fallback) => {
    setMessages(prev => [...prev, makeMessage('bot', error ? `Désolé, une erreur s’est produite : ${error}` : fallback, { tone: 'error' })]);
  };

  const handleSubmit = async (e, forcedQuestion = null) => {
    e?.preventDefault?.();
    const question = (forcedQuestion || inputValue).trim();
    if (!question || !user?.id || loading || actionLoading) return;

    setMessages(prev => [...prev, makeMessage('user', question)]);
    setInputValue('');

    const result = await sendMessage(question);

    if (result?.response?.trim()) {
      const actionProposal = result.actionProposal || null;
      if (actionProposal) setPendingAction(actionProposal);

      setMessages(prev => [...prev, makeMessage('bot', result.response, {
        dataSources: result.dataSources,
        actionProposal,
        tone: actionProposal ? 'action' : 'info'
      })]);
    } else {
      addAssistantError('Désolé, aucune réponse n’a été reçue de l’assistant IA.');
    }
  };

  const handleActionDecision = async (decision) => {
    if (!pendingAction?.id || actionLoading) return;

    const action = pendingAction;
    const label = decision === 'confirm' ? 'Je valide cette action.' : 'J’annule cette action.';
    setMessages(prev => [...prev, makeMessage('user', label)]);

    const result = await executeAction(action.id, decision);
    setPendingAction(null);

    if (result?.response) {
      setMessages(prev => [...prev, makeMessage('bot', result.response, {
        tone: result.error ? 'error' : decision === 'confirm' ? 'success' : 'info'
      })]);
    }
  };

  const handleReset = () => {
    resetHistory();
    setPendingAction(null);
    setMessages([
      makeMessage('bot', 'Conversation réinitialisée. Posez-moi une question sur vos activités, votre charge, votre progression ou vos objectifs.')
    ]);
  };

  const renderActionProposal = (actionProposal) => {
    if (!actionProposal) return null;

    const title = actionProposal.title || actionProposal.action || 'Action proposée';
    const reason = actionProposal.reason || actionProposal.rationale;
    const consequences = actionProposal.consequences || actionProposal.impact;
    const usedData = actionProposal.dataUsed || actionProposal.usedData || [];
    const isCurrent = pendingAction?.id === actionProposal.id;

    return (
      <div className="mt-3 rounded-xl p-3 space-y-2" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#b45309' }}>
          <Sparkles className="w-4 h-4" />
          {title}
        </div>
        {reason && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pourquoi : {reason}</p>}
        {consequences && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Conséquence : {consequences}</p>}
        {usedData.length > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Données utilisées : {usedData.join(', ')}</p>
        )}
        {isCurrent && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleActionDecision('confirm')}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d', border: '1px solid rgba(34,197,94,0.35)' }}
            >
              {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Valider
            </button>
            <button
              onClick={() => handleActionDecision('cancel')}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.10)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <X className="w-3 h-3" />
              Annuler
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 bottom-6 z-50 p-4 rounded-full transition-all hover:scale-110 group"
          style={{
            background: pendingAction ? 'rgba(245,158,11,0.18)' : 'rgba(0,85,255,0.15)',
            border: pendingAction ? '1.5px solid rgba(245,158,11,0.45)' : '1.5px solid rgba(0,85,255,0.35)',
            color: pendingAction ? '#d97706' : 'var(--accent-blue)',
            boxShadow: '0 0 20px rgba(0,85,255,0.2)'
          }}
          aria-label="Ouvrir le chat"
        >
          <MessageSquare className="w-6 h-6 animate-pulse group-hover:animate-none" />
        </button>
      )}

      <div
        className={`fixed top-0 right-0 h-full shadow-2xl transition-transform duration-300 ease-out z-50 flex flex-col ${isOpen ? 'translate-x-0 w-full md:w-[430px]' : 'translate-x-full w-full md:w-[430px] pointer-events-none'}`}
        style={{
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.06)'
        }}
      >
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.74)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.3)' }}>
                <Bot className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Assistant sportif IA</h3>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : pendingAction ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{loading ? 'Analyse...' : pendingAction ? 'Validation requise' : 'En ligne'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} title="Réinitialiser la conversation">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Fermer le chat">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: status.bg, color: status.color, border: '1px solid rgba(0,0,0,0.04)' }}>
            {status.icon}
            {status.label}
          </div>

          {!user?.id && (
            <div className="text-xs rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.18)' }}>
              Connectez-vous pour utiliser l’assistant avec vos données personnelles.
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] p-3 text-sm leading-relaxed whitespace-pre-line ${msg.type === 'user' ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl rounded-tl-none'}`}
                style={msg.type === 'user'
                  ? { background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.2)', color: 'var(--text-primary)' }
                  : { background: msg.tone === 'error' ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.86)', border: msg.tone === 'error' ? '1px solid rgba(239,68,68,0.20)' : '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
              >
                {msg.text}
                {Array.isArray(msg.dataSources) && msg.dataSources.length > 0 && (
                  <div className="mt-3 text-[11px] rounded-lg px-2 py-1" style={{ background: 'rgba(0,85,255,0.07)', color: 'var(--text-muted)' }}>
                    Données consultées : {msg.dataSources.join(', ')}
                  </div>
                )}
                {renderActionProposal(msg.actionProposal)}
              </div>
            </div>
          ))}

          {messages.length <= 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Exemples de questions utiles</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map(question => (
                  <button
                    key={question}
                    onClick={(e) => handleSubmit(e, question)}
                    disabled={loading || actionLoading || !user?.id}
                    className="text-xs px-3 py-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(0,85,255,0.07)', color: 'var(--accent-blue)', border: '1px solid rgba(0,85,255,0.16)' }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[88%] p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-sm" style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-blue)' }} />
                Analyse ciblée de vos données...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.74)' }}>
          {pendingAction && (
            <div className="text-xs rounded-xl p-2" style={{ background: 'rgba(245,158,11,0.10)', color: '#92400e', border: '1px solid rgba(245,158,11,0.22)' }}>
              Une action est prête. Validez ou annulez-la avant une nouvelle exécution.
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Posez une question sur vos stats..."
              disabled={loading || actionLoading || !user?.id}
              className="w-full rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none transition-all disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,85,255,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,85,255,0.5)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(0,85,255,0.15)', color: 'var(--accent-blue)' }}
            >
              <Send className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
