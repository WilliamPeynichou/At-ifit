import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Footprints, Trophy, Zap } from 'lucide-react';

const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

const paceFromSpeed = (mps) => {
  if (!mps || mps <= 0) return null;
  const secPerKm = 1000 / mps;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
};

const secPerKm = (mps) => mps ? 1000 / mps : null;

// Riegel predictor : T2 = T1 × (D2/D1)^1.06
const riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);
const formatTime = (s) => {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const RunningPerf = ({ activities }) => {
  const data = useMemo(() => {
    if (!activities?.length) return null;
    const runs = activities.filter(a => RUN_TYPES.includes(a.type));
    if (!runs.length) return null;

    // Evolution pace moyenne
    const paceEvolution = runs
      .filter(a => a.average_speed || a.averageSpeed)
      .map(a => ({
        date: new Date(a.start_date || a.startDate),
        secPerKm: secPerKm(a.average_speed || a.averageSpeed),
        pace: paceFromSpeed(a.average_speed || a.averageSpeed),
        distance: (a.distance || 0) / 1000,
        name: a.name,
      }))
      .sort((a, b) => a.date - b.date);

    // Best efforts (depuis activity.bestEfforts si enrichi)
    const bestEffortsMap = new Map();
    for (const a of runs) {
      const be = a.bestEfforts || a.best_efforts;
      if (!be || !Array.isArray(be)) continue;
      for (const eff of be) {
        if (!eff?.name || !eff?.elapsed_time) continue;
        const cur = bestEffortsMap.get(eff.name);
        if (!cur || eff.elapsed_time < cur.elapsed_time) {
          bestEffortsMap.set(eff.name, {
            ...eff,
            activityName: a.name,
            activityDate: a.start_date || a.startDate,
          });
        }
      }
    }
    const bestEfforts = Array.from(bestEffortsMap.values());

    // VO2max estimé (Daniels) à partir du meilleur 5k ou 10k
    const best5k = bestEfforts.find(e => e.name === '5k');
    const best10k = bestEfforts.find(e => e.name === '10k');
    let vo2max = null;
    if (best5k?.elapsed_time) {
      const t = best5k.elapsed_time / 60; // min
      const v = 5000 / (t * 60); // m/s vit moy
      // Approx Daniels : VDOT
      const pctMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
      const vo2 = -4.6 + 0.182258 * (60 * v) + 0.000104 * Math.pow(60 * v, 2);
      vo2max = Math.round(vo2 / pctMax);
    }

    // Predictions Riegel à partir du best 10k (sinon 5k)
    const predictions = [];
    const base = best10k || best5k;
    if (base) {
      const d1 = base.name === '10k' ? 10000 : 5000;
      const t1 = base.elapsed_time;
      [
        { name: '5k', d: 5000 },
        { name: '10k', d: 10000 },
        { name: 'Semi (21.1k)', d: 21097 },
        { name: 'Marathon (42.2k)', d: 42195 },
      ].forEach(({ name, d }) => {
        predictions.push({ name, predicted: riegel(t1, d1, d), distance: d });
      });
    }

    // Distance totale, pace global
    const totalDistance = runs.reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = runs.reduce((s, a) => s + (a.moving_time || a.movingTime || 0), 0);
    const avgSpeed = totalDistance / totalTime;

    return { runs, paceEvolution, bestEfforts, vo2max, predictions, totalDistance, totalTime, avgSpeed };
  }, [activities]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <Footprints size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Pas d'activités de course à pied détectées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Distance totale</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {(data.totalDistance / 1000).toFixed(0)}<span className="text-base opacity-70 ml-1">km</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Allure moyenne</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {paceFromSpeed(data.avgSpeed) || '—'}<span className="text-base opacity-70 ml-1">/km</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Séances</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{data.runs.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>VO₂max estimé</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.vo2max || '—'}<span className="text-base opacity-70 ml-1">ml/kg/min</span>
          </p>
        </div>
      </div>

      {/* Pace evolution */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Évolution de l'allure</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.paceEvolution.map(d => ({
              ...d,
              dateLabel: d.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="dateLabel" stroke="#a8a29e" interval="preserveStartEnd" />
              <YAxis stroke="#a855f7" reversed tickFormatter={(v) => {
                const min = Math.floor(v / 60);
                const sec = Math.round(v % 60);
                return `${min}:${String(sec).padStart(2, '0')}`;
              }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(168,85,247,0.2)', color: '#fff' }}
                formatter={(v, name, p) => name === 'secPerKm' ? p.payload.pace : v}
              />
              <Line type="monotone" dataKey="secPerKm" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="Allure" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Axe Y inversé : plus bas = plus rapide
        </p>
      </div>

      {/* Best efforts + predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Trophy size={20} style={{ color: '#eab308' }} /> Records personnels
          </h3>
          {data.bestEfforts.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Pas encore de best_efforts. L'enrichissement des détails Strava doit être terminé.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left py-2">Distance</th>
                  <th className="text-right py-2">Temps</th>
                  <th className="text-right py-2">Allure</th>
                </tr>
              </thead>
              <tbody>
                {data.bestEfforts
                  .sort((a, b) => (a.distance || 0) - (b.distance || 0))
                  .map((eff, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{eff.name}</td>
                      <td className="py-3 text-right font-mono" style={{ color: '#a855f7' }}>{formatTime(eff.elapsed_time)}</td>
                      <td className="py-3 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                        {eff.distance ? paceFromSpeed(eff.distance / eff.elapsed_time) : '—'}/km
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Zap size={20} style={{ color: '#fc4c02' }} /> Prédictions de course (Riegel)
          </h3>
          {data.predictions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Besoin d'un best 5k ou 10k pour générer les prédictions.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left py-2">Distance</th>
                  <th className="text-right py-2">Temps prédit</th>
                  <th className="text-right py-2">Allure cible</th>
                </tr>
              </thead>
              <tbody>
                {data.predictions.map((p, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td className="py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                    <td className="py-3 text-right font-mono" style={{ color: '#fc4c02' }}>{formatTime(p.predicted)}</td>
                    <td className="py-3 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                      {paceFromSpeed(p.distance / p.predicted)}/km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunningPerf;
