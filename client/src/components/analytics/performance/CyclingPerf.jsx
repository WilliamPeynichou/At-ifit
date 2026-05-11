import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Bike, Zap, TrendingUp } from 'lucide-react';
import api from '../../../api';

const RIDE_TYPES = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];

const formatDuration = (s) => {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${(s / 3600).toFixed(1)}h`;
};

const CyclingPerf = ({ activities }) => {
  const [powerCurve, setPowerCurve] = useState([]);
  const [loadingCurve, setLoadingCurve] = useState(true);

  useEffect(() => {
    api.get('/strava/analytics/power-curve')
      .then(res => setPowerCurve(res.data || []))
      .catch(() => setPowerCurve([]))
      .finally(() => setLoadingCurve(false));
  }, []);

  const data = useMemo(() => {
    if (!activities?.length) return null;
    const rides = activities.filter(a => RIDE_TYPES.includes(a.type));
    if (!rides.length) return null;

    const withPower = rides.filter(a => a.average_watts || a.averageWatts);

    // FTP estimée : 95% du best 20min ou meilleur normalized power
    const best20min = powerCurve.find(p => p.duration === 1200);
    const ftpEstimated = best20min ? Math.round(best20min.power * 0.95) : null;

    // TSS / IF par sortie
    const sessions = withPower.map(a => {
      const watts = a.weightedAverageWatts || a.weighted_average_watts || a.average_watts || a.averageWatts;
      const dur = a.moving_time || a.movingTime || 0;
      const if_ = ftpEstimated ? watts / ftpEstimated : null;
      const tss = ftpEstimated ? (dur * watts * (if_ || 0)) / (ftpEstimated * 3600) * 100 : null;
      return {
        date: new Date(a.start_date || a.startDate),
        name: a.name,
        watts: Math.round(watts),
        weightedWatts: Math.round(a.weightedAverageWatts || a.weighted_average_watts || 0) || null,
        if_: if_ ? Math.round(if_ * 100) / 100 : null,
        tss: tss ? Math.round(tss) : null,
        duration: dur,
        distance: (a.distance || 0) / 1000,
        kj: a.kilojoules,
      };
    }).sort((a, b) => a.date - b.date);

    const totalDistance = rides.reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = rides.reduce((s, a) => s + (a.moving_time || a.movingTime || 0), 0);
    const totalKj = rides.reduce((s, a) => s + (a.kilojoules || 0), 0);

    return { rides, withPower, ftpEstimated, sessions, totalDistance, totalTime, totalKj };
  }, [activities, powerCurve]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <Bike size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Pas d'activités vélo détectées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Distance vélo</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {(data.totalDistance / 1000).toFixed(0)}<span className="text-base opacity-70 ml-1">km</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>FTP estimée</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.ftpEstimated || '—'}<span className="text-base opacity-70 ml-1">W</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>95% du best 20min</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Sorties</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{data.rides.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{data.withPower.length} avec capteur</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Énergie totale</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {Math.round(data.totalKj / 1000)}<span className="text-base opacity-70 ml-1">MJ</span>
          </p>
        </div>
      </div>

      {/* Power curve */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Zap size={20} style={{ color: '#eab308' }} /> Mean-Max Power Curve
        </h3>
        {loadingCurve ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : powerCurve.length === 0 || powerCurve.every(p => p.power === 0) ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pas de données de puissance. Les streams Strava avec watts doivent être enrichis.
          </p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={powerCurve.map(p => ({ ...p, label: formatDuration(p.duration) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" stroke="#a8a29e" />
                  <YAxis stroke="#a855f7" unit="W" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(168,85,247,0.2)', color: '#fff' }}
                  />
                  {data.ftpEstimated && (
                    <ReferenceLine y={data.ftpEstimated} stroke="#eab308" strokeDasharray="3 3" label={{ value: `FTP ${data.ftpEstimated}W`, fill: '#eab308', position: 'right' }} />
                  )}
                  <Line type="monotone" dataKey="power" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} name="Watts max" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              Puissance maximale soutenue pour chaque durée, calculée sur l'ensemble de vos streams watts.
            </p>
          </>
        )}
      </div>

      {/* TSS evolution */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <TrendingUp size={20} style={{ color: '#0055ff' }} /> Évolution TSS / IF
        </h3>
        {data.ftpEstimated ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sessions.filter(s => s.tss).map(s => ({
                ...s,
                dateLabel: s.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dateLabel" stroke="#a8a29e" interval="preserveStartEnd" />
                <YAxis yAxisId="left" stroke="#fc4c02" />
                <YAxis yAxisId="right" orientation="right" stroke="#0055ff" domain={[0, 2]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="tss" stroke="#fc4c02" strokeWidth={2} dot={{ r: 3 }} name="TSS" />
                <Line yAxisId="right" type="monotone" dataKey="if_" stroke="#0055ff" strokeWidth={1.5} dot={false} name="IF" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>FTP requise pour calculer TSS/IF.</p>
        )}
      </div>
    </div>
  );
};

export default CyclingPerf;
