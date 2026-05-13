import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, LineChart, Line } from 'recharts';
import { darkTooltipProps } from '../../ui/chartStyles';

const CardioFin = ({ activities }) => {
  const data = useMemo(() => {
    if (!activities?.length) return null;

    const withHR = activities.filter(a => a.average_heartrate || a.averageHeartrate);

    // Évolution HR moyen au repos approximé : prendre min HR moyenne des sorties tranquilles
    const evolution = withHR
      .map(a => ({
        date: a.start_date || a.startDate,
        avgHr: a.average_heartrate || a.averageHeartrate,
        maxHr: a.max_heartrate || a.maxHeartrate,
        sufferScore: a.suffer_score || a.sufferScore,
        type: a.type,
      }))
      .filter(d => d.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // HR Max observée
    const hrMaxObserved = Math.max(...withHR.map(a => a.max_heartrate || a.maxHeartrate || 0));

    // Effort relatif (suffer score / durée)
    const efforts = activities
      .filter(a => a.suffer_score || a.sufferScore)
      .map(a => ({
        date: a.start_date || a.startDate,
        sufferPerMin: ((a.suffer_score || a.sufferScore) / ((a.moving_time || a.movingTime || 1) / 60)),
        avgHr: a.average_heartrate || a.averageHeartrate,
        type: a.type,
        distance: (a.distance || 0) / 1000,
      }));

    return { evolution, hrMaxObserved, efforts };
  }, [activities]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-muted)' }}>Pas de données cardio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid #ef444440' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>HR Max observée</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.hrMaxObserved || '—'} <span className="text-xl opacity-70">bpm</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sur l'ensemble de vos activités</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(236,72,153,0.08)', border: '1.5px solid #ec489940' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ec4899' }}>HR moyenne globale</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.evolution.length ? Math.round(data.evolution.reduce((s, d) => s + d.avgHr, 0) / data.evolution.length) : '—'}
            <span className="text-xl opacity-70 ml-1">bpm</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tous sports confondus</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(252,76,2,0.08)', border: '1.5px solid #fc4c0240' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#fc4c02' }}>Activités avec HR</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.evolution.length}
            <span className="text-xl opacity-70 ml-1">/ {activities?.length || 0}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Capteur cardio actif</p>
        </div>
      </div>

      {/* Evolution HR over time */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Évolution HR moyenne (par activité)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.evolution.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#a8a29e" interval="preserveStartEnd" />
              <YAxis stroke="#ec4899" domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip {...darkTooltipProps} />
              <Line type="monotone" dataKey="avgHr" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} name="HR moy" />
              <Line type="monotone" dataKey="maxHr" stroke="#ef4444" strokeWidth={1.5} dot={false} name="HR max" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter effort relatif */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
          Effort relatif (suffer / min) vs HR moyenne
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="avgHr" name="HR moy" unit="bpm" stroke="#a8a29e" />
              <YAxis dataKey="sufferPerMin" name="Effort" stroke="#a8a29e" />
              <ZAxis dataKey="distance" range={[40, 300]} />
              <Tooltip {...darkTooltipProps} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={data.efforts} fill="#fc4c02" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Chaque point = une activité. Taille = distance. Plus à droite/haut = effort plus intense.
        </p>
      </div>
    </div>
  );
};

export default CardioFin;
