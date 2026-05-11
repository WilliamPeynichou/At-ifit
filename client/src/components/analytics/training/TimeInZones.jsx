import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import api from '../../../api';

const ZONE_COLORS = ['#22c55e', '#0055ff', '#eab308', '#f97316', '#ef4444'];
const ZONE_LABELS = ['Z1 Récup', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2max'];

const formatMin = (s) => Math.round((s || 0) / 60);

const TimeInZones = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hrMax, setHrMax] = useState(190);
  const [hrRest, setHrRest] = useState(60);

  useEffect(() => {
    setLoading(true);
    api.get(`/strava/analytics/zones?hrMax=${hrMax}&hrRest=${hrRest}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [hrMax, hrRest]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mx-auto" />
        <p style={{ color: 'var(--text-muted)' }} className="mt-4">Calcul des zones HR en cours...</p>
      </div>
    );
  }

  if (error || !data?.byActivity?.length) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-muted)' }}>
          Pas de données de zones HR disponibles.<br/>
          <span className="text-xs">L'enrichissement des streams Strava doit être terminé (POST /api/strava/sync/enrich).</span>
        </p>
      </div>
    );
  }

  // Totaux par zone (toutes activités cumulées)
  const totalsByZone = [0, 0, 0, 0, 0];
  for (const a of data.byActivity) {
    for (let z = 0; z < 5; z++) totalsByZone[z] += a.zones[z];
  }
  const totalSec = totalsByZone.reduce((s, v) => s + v, 0);

  const pieData = ZONE_LABELS.map((label, i) => ({
    name: label,
    value: totalsByZone[i],
    color: ZONE_COLORS[i],
    pct: totalSec ? (totalsByZone[i] / totalSec * 100) : 0,
  }));

  // Par semaine
  const weekBars = data.byWeek.map(w => ({
    week: w.week,
    Z1: formatMin(w.zones[0]),
    Z2: formatMin(w.zones[1]),
    Z3: formatMin(w.zones[2]),
    Z4: formatMin(w.zones[3]),
    Z5: formatMin(w.zones[4]),
  }));

  return (
    <div className="space-y-6">
      {/* HR Max / Rest config */}
      <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>HR Max</label>
          <input
            type="number"
            value={hrMax}
            onChange={e => setHrMax(parseInt(e.target.value) || 190)}
            className="w-20 px-3 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>HR Repos</label>
          <input
            type="number"
            value={hrRest}
            onChange={e => setHrRest(parseInt(e.target.value) || 60)}
            className="w-20 px-3 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Zones Karvonen — calculées sur {data.byActivity.length} activités avec stream HR
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie cumulé */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Répartition globale</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  formatter={(v) => `${formatMin(v)} min`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ background: p.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{formatMin(p.value)}min</span>
                  <span className="font-bold w-12 text-right" style={{ color: p.color }}>{p.pct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Polarized analysis */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Type d'entraînement</h3>
          {(() => {
            const easy = (totalsByZone[0] + totalsByZone[1]) / totalSec * 100;
            const mod = totalsByZone[2] / totalSec * 100;
            const hard = (totalsByZone[3] + totalsByZone[4]) / totalSec * 100;
            const polarized = easy > 75 && mod < 10 && hard > 10;
            const pyramidal = easy > 70 && mod > 10 && hard < easy && hard > 0;

            return (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold" style={{ color: '#22c55e' }}>Facile (Z1-Z2)</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{easy.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full" style={{ width: `${easy}%`, background: '#22c55e' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold" style={{ color: '#eab308' }}>Modéré (Z3)</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{mod.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full" style={{ width: `${mod}%`, background: '#eab308' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Intense (Z4-Z5)</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{hard.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full" style={{ width: `${hard}%`, background: '#ef4444' }} />
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Profil : <span className="font-bold" style={{ color: polarized ? '#22c55e' : pyramidal ? '#eab308' : '#a8a29e' }}>
                      {polarized ? 'POLARISÉ' : pyramidal ? 'PYRAMIDAL' : 'MIXTE'}
                    </span>
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Weekly stacked */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Temps en zones par semaine</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" stroke="#a8a29e" />
              <YAxis stroke="#a8a29e" unit="min" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
              <Legend />
              {ZONE_LABELS.map((label, i) => (
                <Bar key={i} dataKey={`Z${i + 1}`} stackId="a" fill={ZONE_COLORS[i]} name={label} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TimeInZones;
