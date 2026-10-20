import React, { useId, useState } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import { useTemporal } from '../../context/TemporalContext';

const PRESETS = [
  { id: '3M', label: '3 mois' },
  { id: '6M', label: '6 mois' },
  { id: '12M', label: '12 mois' },
  { id: 'ALL', label: 'Tout' },
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toInputDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const TemporalSelector = () => {
  const { from, to, preset, setPreset, setCustom } = useTemporal();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(toInputDate(from));
  const [customTo, setCustomTo] = useState(toInputDate(to));

  const id = useId();
  const invalidRange = Boolean(customFrom && customTo && customFrom > customTo);
  const validDates = Boolean(customFrom && customTo && !invalidRange
    && Number.isFinite(new Date(`${customFrom}T00:00:00`).getTime())
    && Number.isFinite(new Date(`${customTo}T23:59:59`).getTime()));

  const applyCustom = () => {
    if (!validDates) return;
    setCustom(new Date(`${customFrom}T00:00:00`), new Date(`${customTo}T23:59:59.999`));
    setShowCustom(false);
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1.5px solid var(--glass-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
          <span
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Période
          </span>
          {preset !== 'CUSTOM' && preset !== 'ALL' && (
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              {formatDate(from)} → {formatDate(to)}
            </span>
          )}
          {preset === 'CUSTOM' && (
            <span className="text-xs ml-2 font-bold" style={{ color: 'var(--accent-blue)' }}>
              {formatDate(from)} → {formatDate(to)}
            </span>
          )}
          {preset === 'ALL' && (
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              toutes les activités
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              aria-pressed={preset === p.id}
              onClick={() => { setPreset(p.id); setShowCustom(false); }}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              style={preset === p.id ? {
                background: 'var(--accent-blue)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(0,85,255,0.4)',
              } : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            aria-expanded={showCustom}
            aria-controls={`${id}-custom`}
            aria-pressed={preset === 'CUSTOM'}
            onClick={() => {
              if (!showCustom) {
                setCustomFrom(toInputDate(from));
                setCustomTo(toInputDate(to));
              }
              setShowCustom(v => !v);
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            style={preset === 'CUSTOM' || showCustom ? {
              background: 'var(--accent-blue)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(0,85,255,0.4)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            Personnalisée
          </button>
        </div>
      </div>

      {showCustom && (
        <div id={`${id}-custom`} className="mt-4 pt-4 flex flex-wrap items-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-col">
            <label htmlFor={`${id}-from`} className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Du</label>
            <input
              id={`${id}-from`}
              max={customTo || undefined}
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? `${id}-error` : undefined}
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor={`${id}-to`} className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Au</label>
            <input
              id={`${id}-to`}
              min={customFrom || undefined}
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? `${id}-error` : undefined}
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={applyCustom}
            disabled={!validDates}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ background: '#22c55e' }}
          >
            <Check size={14} /> Appliquer
          </button>
          <button
            onClick={() => setShowCustom(false)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
          >
            <X size={14} /> Annuler
          </button>
          {invalidRange && <p id={`${id}-error`} role="alert" className="w-full text-xs" style={{ color: 'var(--text-secondary)' }}>La date de début doit précéder ou être égale à la date de fin.</p>}
        </div>
      )}
    </div>
  );
};

export default TemporalSelector;
