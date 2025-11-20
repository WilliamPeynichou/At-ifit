import React from 'react';

const StatsCard = ({ title, value, subtext, color = 'green', className }) => {
  const colorStyles = {
    green: 'border-emerald-500/30 text-emerald-400',
    orange: 'border-amber-500/30 text-amber-400',
    red: 'border-rose-500/30 text-rose-400',
  };

  const glowStyles = {
    green: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    orange: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    red: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  };

  return (
    <div className={`glass-card rounded-xl p-5 border ${colorStyles[color].split(' ')[0]} ${glowStyles[color]} ${className}`}>
      <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{title}</h3>
      <div className={`text-2xl font-bold ${colorStyles[color].split(' ')[1]} drop-shadow-sm`}>{value}</div>
      {subtext && <div className="text-xs mt-2 text-slate-500 font-medium">{subtext}</div>}
    </div>
  );
};

export default StatsCard;
