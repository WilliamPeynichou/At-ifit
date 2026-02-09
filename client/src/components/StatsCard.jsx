import React from 'react';

const StatsCard = ({ title, value, subtext, color = 'green', className }) => {
  const colorStyles = {
    green: { border: 'rgba(0, 85, 255, 0.3)', text: 'var(--accent-blue)', glow: 'rgba(0, 85, 255, 0.08)' },
    orange: { border: 'rgba(249, 115, 22, 0.4)', text: 'var(--accent-orange)', glow: 'rgba(249, 115, 22, 0.08)' },
    red: { border: 'rgba(239, 68, 68, 0.35)', text: '#dc2626', glow: 'rgba(239, 68, 68, 0.08)' },
  };

  const cs = colorStyles[color] || colorStyles.green;

  return (
    <div
      className={`glass-card rounded-xl p-5 ${className}`}
      style={{ borderColor: cs.border, boxShadow: `0 0 15px ${cs.glow}, inset 0 1px 0 rgba(255,255,255,0.3)` }}
    >
      <h3 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      <div className="text-2xl font-bold drop-shadow-sm" style={{ color: cs.text }}>{value}</div>
      {subtext && <div className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>{subtext}</div>}
    </div>
  );
};

export default StatsCard;
