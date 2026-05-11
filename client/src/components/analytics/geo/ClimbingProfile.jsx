import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, BarChart, Bar } from 'recharts';
import { Mountain } from 'lucide-react';

const TYPE_COLOR = {
  Run: '#fc4c02',
  Ride: '#a855f7',
  Hike: '#22c55e',
  TrailRun: '#fb923c',
  default: '#0055ff',
};

const ClimbingProfile = ({ activities }) => {
  const data = useMemo(() => {
    if (!activities?.length) return null;

    const valid = activities.filter(a => (a.distance || 0) > 0 && a.total_elevation_gain != null || a.totalElevationGain != null);

    const scatter = valid.map(a => {
      const dist = (a.distance || 0) / 1000;
      const elev = a.total_elevation_gain ?? a.totalElevationGain ?? 0;
      return {
        distance: dist,
        elevation: elev,
        ratio: dist > 0 ? elev / dist : 0,
        type: a.type,
        name: a.name,
        color: TYPE_COLOR[a.type] || TYPE_COLOR.default,
      };
    });

    // Distribution ratios (D+/km)
    const buckets = [
      { range: '0-10', min: 0, max: 10, count: 0, color: '#22c55e' },
      { range: '10-20', min: 10, max: 20, count: 0, color: '#84cc16' },
      { range: '20-30', min: 20, max: 30, count: 0, color: '#eab308' },
      { range: '30-40', min: 30, max: 40, count: 0, color: '#f97316' },
      { range: '40+', min: 40, max: Infinity, count: 0, color: '#ef4444' },
    ];
    for (const s of scatter) {
      const b = buckets.find(b => s.ratio >= b.min && s.ratio < b.max);
      if (b) b.count++;
    }

    const totalElev = valid.reduce((s, a) => s + (a.total_elevation_gain ?? a.totalElevationGain ?? 0), 0);
    const maxClimb = Math.max(...valid.map(a => a.total_elevation_gain ?? a.totalElevationGain ?? 0));
    const climbiest = scatter.sort((a, b) => b.ratio - a.ratio)[0];

    return { scatter, buckets, totalElev, maxClimb, climbiest };
  }, [activities]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <Mountain size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Pas de données de dénivelé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid #22c55e40' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>D+ total</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {Math.round(data.totalElev)}<span className="text-xl opacity-70 ml-1">m</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {(data.totalElev / 8849).toFixed(2)} fois l'Everest
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid #22c55e40' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>Plus gros D+</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {Math.round(data.maxClimb)}<span className="text-xl opacity-70 ml-1">m</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sur une seule sortie</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid #22c55e40' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>Sortie la + raide</p>
          <p className="text-2xl font-black truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.climbiest?.ratio.toFixed(1) || '—'}<span className="text-lg opacity-70 ml-1">m/km</span>
          </p>
          <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
            {data.climbiest?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>D+ vs Distance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" dataKey="distance" name="Distance" unit="km" stroke="#a8a29e" />
                <YAxis type="number" dataKey="elevation" name="D+" unit="m" stroke="#22c55e" />
                <ZAxis dataKey="ratio" range={[40, 200]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(34,197,94,0.2)', color: '#fff' }}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Scatter data={data.scatter} fill="#22c55e" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Chaque point = une activité. Taille = ratio m/km
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Distribution du ratio m/km</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="range" stroke="#a8a29e" />
                <YAxis stroke="#a8a29e" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(34,197,94,0.2)', color: '#fff' }} />
                <Bar dataKey="count" name="Sorties">
                  {data.buckets.map((b, i) => <Bar key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Plus haut = plus de sorties de grimpeur
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClimbingProfile;
