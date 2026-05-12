import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const FullscreenModal = ({ isOpen, onClose, title, accent = '#0055ff', children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="dark-surface fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: 'rgba(8, 6, 12, 0.85)',
        backdropFilter: 'blur(20px)',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}
      >
        <h2
          className="text-2xl font-black tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: accent }}
        >
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-all hover:bg-white/10"
          aria-label="Fermer"
        >
          <X size={24} style={{ color: 'var(--text-primary, #fff)' }} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ animation: 'slideUp 300ms ease-out' }}
      >
        {children}
      </div>
    </div>
  );
};

export default FullscreenModal;
