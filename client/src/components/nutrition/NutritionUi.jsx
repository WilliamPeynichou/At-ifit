import React from 'react';

export const CONFIDENCE_COLORS = {
  faible: '#f97316',
  modérée: '#0055ff',
  élevée: '#22c55e',
  inconnue: 'var(--text-muted)',
};

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours > 0 ? `${hours} h ${String(mins).padStart(2, '0')}` : `${mins} min`;
}

export function Range({ range, unit, digits = 0 }) {
  if (!range) return <span>-</span>;
  const fmt = (v) => Number(v).toFixed(digits);
  return (
    <span>
      <strong>{fmt(range.target)}</strong>
      <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
        {unit} · {fmt(range.low)}–{fmt(range.high)}
      </span>
    </span>
  );
}

export function MetricCard({ icon, label, children, accent }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        {React.createElement(icon, { className: 'w-3.5 h-3.5', style: { color: accent } })}
        {label}
      </p>
      <p className="text-lg" style={{ color: 'var(--text-primary)' }}>{children}</p>
    </div>
  );
}
