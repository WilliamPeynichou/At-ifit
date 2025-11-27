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

    // Send to AI backend (userId sera extrait automatiquement du token par le backend)
    console.log('[Chatbot] Envoi du message avec userId:', user.id);
    const aiResponse = await sendMessage(user.id, currentInput.trim());
    console.log('[Chatbot] Réponse reçue:', { aiResponse, error, hasResponse: !!aiResponse });

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
          className="fixed right-6 bottom-6 z-50 p-4 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 rounded-full text-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all hover:scale-110 group"
          aria-label="Ouvrir le chat"
        >
          <MessageSquare className="w-6 h-6 animate-pulse group-hover:animate-none" />
        </button>
      )}

      {/* Chatbot Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-black/95 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out z-50 flex flex-col
          ${isOpen ? 'translate-x-0 w-full md:w-[400px]' : 'translate-x-full w-full md:w-[400px] pointer-events-none'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30">
              <Bot className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h3 className="font-bold text-white">Assistant IA</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="text-xs text-slate-400">{loading ? 'En cours...' : 'En ligne'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
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
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'bg-neon-cyan/20 border border-neon-cyan/30 text-white rounded-tr-none'
                    : 'bg-white/10 border border-white/5 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] p-3 rounded-2xl bg-white/10 border border-white/5 text-slate-200 rounded-tl-none">
                <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Posez une question..."
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading || !user?.id}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-neon-cyan/20 hover:bg-neon-cyan/40 text-neon-cyan rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

