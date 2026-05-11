import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';

const Distribution = () => {
  const { data, loading } = useAnalyticsSummary(null);

  const computed = useMemo(() => {
    if (!data?.formCurve) return null;
    const curve = data.formCurve;

    // Monotonie semaine = moyenne / écart type sur 7 derniers jours (Foster)
    const monoStrain = [];
    for (let i = 6; i < curve.length; i++) {
      const window = curve.slice(i - 6, i + 1);
      const loads = window.map(d => d.load);
      const mean = loads.reduce((s, v) => s + v, 0) / 7;
      const variance = loads.reduce((s, v) => s + (v - mean) ** 2, 0) / 7;
      const std = Math.sqrt(variance) || 0.01;
      const monotony = mean / std;
      const strain = loads.reduce((s, v) => s + v, 0) * monotony;
      monoStrain.push({
        date: curve[i].date,
        monotony: Math.round(monotony * 100) / 100,
        strain: Math.round(strain),
      });
    }

    const last = monoStrain[monoStrain.length - 1] || {};

    // Distribution durée
    const durBuckets = [
      { range: '<30 min', min: 0, max: 1800, count: 0 },
      { range: '30-60 min', min: 1800, max: 3600, count: 0 },
      { range: '60-90 min', min: 3600, max: 5400, count: 0 },
      { range: '90-180 min', min: 5400, max: 10800, count: 0 },
      { range: '>180 min', min: 10800, max: Infinity, count: 0 },
    ];

    return { monoStrain, last, durBuckets };
  }, [data]);

  if (loading || !computed) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const { monoStrain, last } = computed;
  const monoStatus = last.monotony > 2.5 ? { label: 'HAUTE', color: '#ef4444', advice: 'Variez vos intensités' }
                  : last.monotony > 1.5 ? { label: 'MODÉRÉE', color: '#eab308', advice: 'Équilibre OK' }
                  : { label: 'BASSE', color: '#22c55e', advice: 'Bonne variété' };

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: `${monoStatus.color}10`, border: `1.5px solid ${monoStatus.color}40` }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: monoStatus.color }}>Monotonie (7j)</p>
          <p className="text-4xl font-black mb-1" style={{ color: monoStatus.color, fontFamily: 'var(--font-display)' }}>
            {last.monotony?.toFixed(2) || '—'}
          </p>
          <p className="text-sm font-bold" style={{ color: monoStatus.color }}>{monoStatus.label}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{monoStatus.advice}</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'rgba(252,76,2,0.08)', border: '1.5px solid #fc4c0240' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#fc4c02' }}>Strain (Foster)</p>
          <p className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {last.strain || '—'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Strain = charge hebdo × monotonie. {last.strain > 6000 ? '⚠️ Risque élevé' : 'Niveau correct'}
          </p>
        </div>
      </div>

      {/* Monotony chart */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
          Évolution monotonie & strain (90j)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monoStrain.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#a8a29e" interval="preserveStartEnd" />
              <YAxis yAxisId="left" stroke="#fc4c02" />
              <YAxis yAxisId="right" orientation="right" stroke="#0055ff" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
              <Bar yAxisId="right" dataKey="monotony" fill="#0055ff" name="Monotonie" />
              <Bar yAxisId="left" dataKey="strain" fill="#fc4c02" name="Strain" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Monotonie &gt; 2.5 indique un entraînement trop uniforme. Strain &gt; 6000 indique un risque de surentraînement.
        </p>
      </div>

      {/* Sport distribution */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Distribution par sport</h3>
        <div className="space-y-3">
          {data.bySport.sort((a, b) => b.movingTime - a.movingTime).map((s, i) => {
            const pct = (s.movingTime / data.totals.movingTime * 100);
            const colors = ['#fc4c02', '#0055ff', '#22c55e', '#a855f7', '#eab308', '#06b6d4', '#ec4899'];
            return (
              <div key={s.type}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{s.type}</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                    {Math.round(s.movingTime / 3600)}h · {s.count} séances · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Distribution;
