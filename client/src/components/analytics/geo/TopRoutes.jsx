import React, { useMemo } from 'react';
import { MapPin, Repeat } from 'lucide-react';

const TopRoutes = ({ activities }) => {
  const clusters = useMemo(() => {
    if (!activities?.length) return [];

    // On regroupe par "signature" : start_latlng arrondi + distance arrondie
    const groups = new Map();
    for (const a of activities) {
      const start = a.start_latlng || a.startLatlng;
      if (!Array.isArray(start) || start.length < 2) continue;
      if (!a.distance) continue;

      // arrondi à 0.01° lat/lng (~1km) et 1km de distance
      const lat = Math.round(start[0] * 100) / 100;
      const lng = Math.round(start[1] * 100) / 100;
      const distKm = Math.round((a.distance / 1000));
      const key = `${lat}_${lng}_${distKm}`;

      const existing = groups.get(key) || {
        key,
        startLat: lat,
        startLng: lng,
        distance: distKm,
        count: 0,
        firstDate: null,
        lastDate: null,
        type: a.type,
        names: new Set(),
        bestTime: Infinity,
      };
      existing.count += 1;
      const date = new Date(a.start_date || a.startDate);
      if (!existing.firstDate || date < existing.firstDate) existing.firstDate = date;
      if (!existing.lastDate || date > existing.lastDate) existing.lastDate = date;
      existing.names.add(a.name);
      const t = a.moving_time || a.movingTime;
      if (t && t < existing.bestTime) existing.bestTime = t;
      groups.set(key, existing);
    }

    return Array.from(groups.values())
      .filter(g => g.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [activities]);

  if (!clusters.length) {
    return (
      <div className="text-center py-20">
        <Repeat size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>
          Pas d'itinéraires récurrents détectés.<br/>
          <span className="text-xs">Il faut au moins 2 sorties similaires (même départ, même distance).</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Top 10 itinéraires identifiés par regroupement (même point de départ ±1km, même distance ±1km).
      </p>

      {clusters.map((c, i) => (
        <div
          key={c.key}
          className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.01]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
        >
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl"
            style={{
              background: i < 3 ? 'linear-gradient(135deg, #22c55e, #84cc16)' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: i < 3 ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            #{i + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {c.distance} km · {c.type}
              </span>
              <span className="text-xs uppercase font-bold" style={{ color: '#22c55e' }}>
                × {c.count} fois
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              Du {c.firstDate?.toLocaleDateString('fr-FR')} au {c.lastDate?.toLocaleDateString('fr-FR')}
              {' · '}
              <span className="flex items-center gap-1 inline-flex">
                <MapPin size={10} />
                {c.startLat.toFixed(3)}, {c.startLng.toFixed(3)}
              </span>
            </p>
            <p className="text-xs truncate mt-1" style={{ color: 'var(--text-muted)' }}>
              Noms : {Array.from(c.names).slice(0, 3).join(' · ')}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Best time</p>
            <p className="text-lg font-mono font-bold" style={{ color: '#22c55e' }}>
              {c.bestTime !== Infinity ? `${Math.floor(c.bestTime / 60)}:${String(c.bestTime % 60).padStart(2, '0')}` : '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopRoutes;
