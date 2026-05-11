import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';

const formatDateShort = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const FormCurve = () => {
  const { data, loading } = useAnalyticsSummary(null);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const curve = data?.formCurve || [];
  const last = curve[curve.length - 1] || { ctl: 0, atl: 0, tsb: 0 };

  // Statut forme
  const formStatus = () => {
    const tsb = last.tsb;
    if (tsb > 10) return { label: 'FRAIS', color: '#22c55e', sub: 'Prêt pour une compétition ou un gros bloc' };
    if (tsb > -10) return { label: 'NEUTRE', color: '#0055ff', sub: 'Équilibre charge/récupération' };
    if (tsb > -30) return { label: 'CHARGÉ', color: '#eab308', sub: 'Sweet spot — gain de fitness en cours' };
    return { label: 'OVERREACHING', color: '#ef4444', sub: 'Risque de surmenage, prévoyez de la récup' };
  };
  const status = formStatus();

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 col-span-2" style={{ background: `${status.color}10`, border: `1.5px solid ${status.color}40` }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: status.color }}>Forme actuelle</p>
          <p className="text-3xl font-black" style={{ color: status.color, fontFamily: 'var(--font-display)' }}>{status.label}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{status.sub}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#0055ff' }}>CTL (Fitness)</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{last.ctl?.toFixed(0) || '—'}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Charge chronique 42j</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>ATL (Fatigue)</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{last.atl?.toFixed(0) || '—'}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Charge aiguë 7j</p>
        </div>
      </div>

      {/* Form curve chart */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
          Courbe CTL / ATL / TSB (90 jours)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={curve.map(d => ({ ...d, date: formatDateShort(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#a8a29e" interval="preserveStartEnd" />
              <YAxis yAxisId="left" stroke="#a8a29e" />
              <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(0,85,255,0.2)', color: '#fff' }}
              />
              <ReferenceLine y={0} yAxisId="right" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
              <Line yAxisId="left" type="monotone" dataKey="ctl" stroke="#0055ff" strokeWidth={3} dot={false} name="CTL (fitness)" />
              <Line yAxisId="left" type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} dot={false} name="ATL (fatigue)" />
              <Area yAxisId="right" type="monotone" dataKey="tsb" stroke="#22c55e" strokeWidth={2} fill="#22c55e" fillOpacity={0.15} name="TSB (forme)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <p><span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ background: '#0055ff' }}></span>CTL = fitness accumulé (charge chronique 42j)</p>
          <p><span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ background: '#ef4444' }}></span>ATL = fatigue récente (charge aiguë 7j)</p>
          <p><span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ background: '#22c55e' }}></span>TSB = forme (CTL − ATL)</p>
        </div>
      </div>

      {/* Daily load bars */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
          Charge quotidienne (TRIMP / suffer score)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve.map(d => ({ ...d, date: formatDateShort(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#a8a29e" interval="preserveStartEnd" />
              <YAxis stroke="#a8a29e" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(252,76,2,0.2)', color: '#fff' }} />
              <Area type="monotone" dataKey="load" stroke="#fc4c02" strokeWidth={1.5} fill="#fc4c02" fillOpacity={0.3} name="Charge" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FormCurve;
