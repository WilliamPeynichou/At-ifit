import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ChevronDown, Timer, X } from 'lucide-react';

const toMinutes = (hours, minutes, seconds = 0) => Number(hours) * 60 + Number(minutes) + Number(seconds) / 60;

const formatClock = totalMinutes => {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—';
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} h ${String(minutes).padStart(2, '0')} min ${String(seconds).padStart(2, '0')} s`;
};

const formatPace = minutesPerKm => {
  if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return '—';
  const totalSeconds = Math.round(minutesPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const SPLIT_REFERENCES = [
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
  { label: 'Semi', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
];

const STORAGE_KEY = 'atifit:race-pace-calculator:v1';

const readSavedState = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

/**
 * Calculette persistante : allure, vitesse et splits.
 * Elle vit à côté du formulaire (colonne collante) ou en panneau repliable sur mobile,
 * afin de ne jamais recouvrir les champs ni les résultats du plan.
 */
export default function RacePaceCalculator({ distanceKm, targetMinutes, onApplyTarget }) {
  const saved = useMemo(() => readSavedState(), []);
  const [mode, setMode] = useState(saved.mode === 'pace' ? 'pace' : 'time');
  const [open, setOpen] = useState(false);
  const [distance, setDistance] = useState(saved.distance ?? distanceKm ?? 42.195);
  const [hours, setHours] = useState(saved.hours ?? Math.floor((targetMinutes || 240) / 60));
  const [minutes, setMinutes] = useState(saved.minutes ?? Math.round((targetMinutes || 240) % 60));
  const [paceMinutes, setPaceMinutes] = useState(saved.paceMinutes ?? 5);
  const [paceSeconds, setPaceSeconds] = useState(saved.paceSeconds ?? 0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, distance, hours, minutes, paceMinutes, paceSeconds }));
    } catch {
      // Le calcul reste fonctionnel si le stockage local est indisponible.
    }
  }, [mode, distance, hours, minutes, paceMinutes, paceSeconds]);

  const computed = useMemo(() => {
    const km = Number(distance);
    if (!Number.isFinite(km) || km <= 0) return null;

    if (mode === 'time') {
      const total = toMinutes(hours, minutes);
      if (total <= 0) return null;
      return { totalMinutes: total, pace: total / km, speed: km / (total / 60), km };
    }

    const pace = Number(paceMinutes) + Number(paceSeconds) / 60;
    if (pace <= 0) return null;
    const total = pace * km;
    return { totalMinutes: total, pace, speed: 60 / pace, km };
  }, [mode, distance, hours, minutes, paceMinutes, paceSeconds]);

  const body = (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Mode de calcul">
        {[['time', 'Temps → allure'], ['pace', 'Allure → temps']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold"
            style={{
              background: mode === id ? 'var(--accent-blue)' : 'var(--bg-secondary)',
              color: mode === id ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="block text-xs font-bold uppercase">Distance (km)
        <input className="input-cyber mt-2" type="number" min="0.1" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} />
      </label>

      {mode === 'time' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold uppercase">Heures
            <input className="input-cyber mt-2" type="number" min="0" max="99" value={hours} onChange={e => setHours(e.target.value)} />
          </label>
          <label className="block text-xs font-bold uppercase">Minutes
            <input className="input-cyber mt-2" type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold uppercase">Allure min
            <input className="input-cyber mt-2" type="number" min="1" max="20" value={paceMinutes} onChange={e => setPaceMinutes(e.target.value)} />
          </label>
          <label className="block text-xs font-bold uppercase">Allure sec
            <input className="input-cyber mt-2" type="number" min="0" max="59" value={paceSeconds} onChange={e => setPaceSeconds(e.target.value)} />
          </label>
        </div>
      )}

      <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Temps</span>
          <strong className="text-lg font-display">{formatClock(computed?.totalMinutes)}</strong>
        </div>
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Allure</span>
          <strong className="text-lg font-display">{formatPace(computed?.pace)}</strong>
        </div>
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Vitesse</span>
          <strong className="text-lg font-display">{computed ? `${computed.speed.toFixed(1)} km/h` : '—'}</strong>
        </div>
      </div>

      {computed && (
        <div>
          <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>À cette allure</p>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {SPLIT_REFERENCES.map(split => (
              <li key={split.label} className="flex justify-between gap-3">
                <span>{split.label}</span>
                <span className="font-mono">{formatClock(computed.pace * split.km)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {computed && onApplyTarget && (
        <button
          type="button"
          onClick={() => onApplyTarget(computed.totalMinutes)}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
        >
          <Timer size={15} /> Utiliser comme objectif
        </button>
      )}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tes valeurs sont conservées sur cet appareil. Rien n’est envoyé tant que tu ne cliques pas.</p>
    </div>
  );

  return (
    <>
      {/* Colonne collante — écrans larges */}
      <aside className="hidden lg:block">
        <div className="glass-panel p-5 sticky top-20">
          <h2 className="text-xl flex items-center gap-2 mb-1"><Calculator size={19} style={{ color: 'var(--accent-blue)' }} /> Calculette</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Allure, vitesse et temps de passage, toujours visibles.</p>
          {body}
        </div>
      </aside>

      {/* Panneau repliable — mobile et tablette, fermé par défaut */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          aria-controls="race-calculator-sheet"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg"
          style={{ background: 'var(--accent-blue)', color: '#fff' }}
        >
          {open ? <ChevronDown size={17} /> : <Calculator size={17} />}
          Calculette
        </button>

        {open && (
          <div
            id="race-calculator-sheet"
            className="fixed inset-x-0 bottom-0 z-40 max-h-[72vh] overflow-y-auto rounded-t-2xl p-5"
            style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)', boxShadow: '0 -12px 40px rgba(20,20,19,0.25)', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl flex items-center gap-2"><Calculator size={19} style={{ color: 'var(--accent-blue)' }} /> Calculette</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer la calculette" className="p-2 rounded-lg" style={{ border: '1px solid var(--glass-border)' }}>
                <X size={18} />
              </button>
            </div>
            {body}
          </div>
        )}
      </div>
    </>
  );
}
