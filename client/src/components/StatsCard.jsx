import React from 'react';

const StatsCard = ({ title, value, subtext, color = 'blue', className }) => {
  const colorStyles = {
    blue:   { border: 'rgba(0, 85, 255, 0.22)', text: 'var(--accent-blue)', glow: 'rgba(0, 85, 255, 0.07)' },
    green:  { border: 'rgba(0, 85, 255, 0.22)', text: 'var(--accent-blue)', glow: 'rgba(0, 85, 255, 0.07)' },
    orange: { border: 'rgba(0, 85, 255, 0.12)', text: 'var(--text-primary)', glow: 'rgba(0, 0, 0, 0.03)' },
    red:    { border: 'rgba(239, 68, 68, 0.22)', text: '#dc2626', glow: 'rgba(239, 68, 68, 0.06)' },
  };

  const cs = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`glass-card p-3 sm:p-5 min-w-0 ${className}`}
      style={{ borderColor: cs.border, boxShadow: `0 2px 16px ${cs.glow}` }}
    >
      <h3
        className="text-[9px] sm:text-[10px] font-semibold mb-2 sm:mb-3 uppercase tracking-[0.1em] sm:tracking-[0.15em] truncate"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </h3>
      <div
        className="text-xl sm:text-3xl font-bold tabular-nums break-words"
        style={{ color: cs.text, letterSpacing: '0.02em', fontFamily: 'var(--font-display)' }}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
