import React, { useState } from 'react';
import { MessageSquare, Send, ChevronRight, Bot, Loader2 } from 'lucide-react';
import { useAICoach } from '../hooks/useAICoach';
import { useAuth } from '../context/AuthContext';

const Chatbot = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const { sendMessage, loading, error } = useAICoach();
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui ?' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !user?.id) return;

    // Add user message
    const userMsg = { id: Date.now(), type: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputValue;
    setInputValue('');

    // userId extrait automatiquement du token JWT par le backend
    const aiResponse = await sendMessage(currentInput.trim());

    if (aiResponse && aiResponse.trim()) {
      // Add AI response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        text: aiResponse
      }]);
    } else {
      // Show error message or empty response warning
      const errorMsg = error
        ? `Désolé, une erreur s'est produite : ${error}`
        : 'Désolé, aucune réponse n\'a été reçue de l\'assistant IA.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        text: errorMsg
      }]);
    }
  };

  return (
    <>
      {/* Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 bottom-6 z-50 p-4 rounded-full transition-all hover:scale-110 group"
          style={{
            background: 'rgba(0,85,255,0.15)',
            border: '1.5px solid rgba(0,85,255,0.35)',
            color: 'var(--accent-blue)',
            boxShadow: '0 0 20px rgba(0,85,255,0.2)'
          }}
          aria-label="Ouvrir le chat"
        >
          <MessageSquare className="w-6 h-6 animate-pulse group-hover:animate-none" />
        </button>
      )}

      {/* Chatbot Panel */}
      <div
        className={`fixed top-0 right-0 h-full shadow-2xl transition-transform duration-300 ease-out z-50 flex flex-col
          ${isOpen ? 'translate-x-0 w-full md:w-[400px]' : 'translate-x-full w-full md:w-[400px] pointer-events-none'}`}
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.06)'
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.7)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: 'rgba(0,85,255,0.1)',
                border: '1.5px solid rgba(0,85,255,0.3)'
              }}
            >
              <Bot className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Assistant IA</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{loading ? 'En cours...' : 'En ligne'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'rounded-2xl rounded-tr-none'
                    : 'rounded-2xl rounded-tl-none'
                }`}
                style={
                  msg.type === 'user'
                    ? {
                        background: 'rgba(0,85,255,0.08)',
                        border: '1px solid rgba(0,85,255,0.2)',
                        color: 'var(--text-primary)'
                      }
                    : {
                        background: 'rgba(255,255,255,0.8)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)'
                      }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] p-3 rounded-2xl rounded-tl-none"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-blue)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          className="p-4"
          style={{
            borderTop: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.7)'
          }}
        >
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Posez une question..."
              className="w-full rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(0,0,0,0.1)',
                color: 'var(--text-primary)'
              }}
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
              disabled={!inputValue.trim() || loading || !user?.id}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(0,85,255,0.15)',
                color: 'var(--accent-blue)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = 'rgba(0,85,255,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,85,255,0.15)';
              }}
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
