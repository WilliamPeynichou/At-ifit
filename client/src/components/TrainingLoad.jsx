import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import api from '../api';
import { Zap } from 'lucide-react';
import { useTemporal } from '../context/TemporalContext';

const STATUS = {
  fresh:    { label: 'Frais', color: '#16a34a', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)' },
  optimal:  { label: 'Optimal', color: '#0055ff', bg: 'rgba(0,85,255,0.08)', border: 'rgba(0,85,255,0.2)' },
  overload: { label: 'Surcharge', color: '#dc2626', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

const tooltipStyle = {
  backgroundColor: 'rgba(19,16,20,0.97)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '12px',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name} : <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const TrainingLoad = () => {
  const { from, to, fromISO, toISO } = useTemporal();
  const weeks = from && to
    ? Math.max(2, Math.min(20, Math.ceil((new Date(to) - new Date(from)) / (7 * 24 * 3600 * 1000))))
    : 10;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setData([]);
    setLoading(true);
    const params = [];
    params.push(`weeks=${weeks}`);
    if (fromISO) params.push(`from=${encodeURIComponent(fromISO)}`);
    if (toISO) params.push(`to=${encodeURIComponent(toISO)}`);
    api.get(`/stats/training-load?${params.join('&')}`)
      .then(res => { if (!cancelled) setData(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [weeks, fromISO, toISO]);

  const latest = data[data.length - 1];
  const currentStatus = latest ? STATUS[latest.status] : null;
  const hasData = data.some(d => d.totalLoad > 0);

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.2)' }}>
            <Zap className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Charge d'entraînement
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
               ATL · CTL · Fraîcheur (TSB) — {data.length || weeks} semaines{weeks === 20 ? ' maximum' : ''} · tous sports
            </p>
          </div>
        </div>

        {currentStatus && (
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: currentStatus.bg, border: `1px solid ${currentStatus.border}`, color: currentStatus.color }}
          >
            {currentStatus.label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
       ) : error ? (
         <div role="alert" className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Impossible de charger la charge d’entraînement. Réessayez en changeant de période ou en rechargeant la page.</div>
       ) : !hasData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <Zap className="w-8 h-8" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pas encore de données d'effort.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Les activités Strava avec "effort relatif" alimenteront ce graphique.</p>
        </div>
      ) : (
        <>
          {/* Métriques actuelles */}
          {latest && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Fatigue (ATL)', value: latest.atl, desc: 'Charge 7j', color: '#dc2626' },
                { label: 'Forme (CTL)', value: latest.ctl, desc: 'Charge 42j', color: '#0055ff' },
                { label: 'Fraîcheur (TSB)', value: latest.tsb, desc: 'CTL − ATL', color: latest.tsb > 0 ? '#16a34a' : '#f97316' },
              ].map(({ label, value, desc, color }) => (
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>{value}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Graphique */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs" aria-label="Légende de la charge d’entraînement" style={{ color: 'var(--text-secondary)' }}>
            <span>▰ Charge hebdomadaire</span>
            <span style={{ color: '#dc2626' }}>━ Fatigue ATL (7 jours)</span>
            <span style={{ color: '#0055ff' }}>━ Forme CTL (42 jours)</span>
            <span style={{ color: '#16a34a' }}>┄ Fraîcheur TSB (CTL − ATL)</span>
          </div>
          <ResponsiveContainer width="100%" height={220} debounce={150}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalLoad" name="Charge" fill="rgba(0,85,255,0.15)" stroke="rgba(0,85,255,0.3)" strokeWidth={1} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="atl" name="Fatigue ATL" stroke="#dc2626" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="ctl" name="Forme CTL" stroke="#0055ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tsb" name="Fraîcheur TSB" stroke="#16a34a" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>

          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            TSB &gt; 5 = frais · TSB &lt; −10 = risque surcharge · Zone optimale entre −5 et +5
          </p>
        </>
      )}
    </div>
  );
};

export default TrainingLoad;
