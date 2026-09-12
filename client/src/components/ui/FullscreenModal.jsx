import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FullscreenModal = ({ isOpen, onClose, title, accent = '#0055ff', children }) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previousFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="dark-surface fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: 'rgba(8, 6, 12, 0.94)',
        backdropFilter: 'blur(20px)',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.55)' }}>
        <h2 className="text-2xl font-black tracking-widest" style={{ fontFamily: 'var(--font-display)', color: accent }}>
          {title}
        </h2>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border transition-all hover:scale-105 hover:bg-white/20"
          style={{ background: '#17191f', borderColor: accent, boxShadow: `0 0 0 3px ${accent}35` }}
          aria-label={`Fermer ${title || 'la fenêtre'}`}
          title="Fermer (Échap)"
        >
          <X size={24} color="#fff" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ animation: 'slideUp 300ms ease-out' }}>
        {children}
      </div>
    </div>
  );
};

export default FullscreenModal;
