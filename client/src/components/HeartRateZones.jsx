import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';
import { Heart } from 'lucide-react';

// Couleurs zones FC : Z1 bleu → Z5 rouge
const ZONE_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f97316', '#ef4444'];
const ZONE_LABELS = ['Z1 Récup', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Seuil', 'Z5 Max'];

const tooltipStyle = {
  backgroundColor: 'rgba(19,16,20,0.97)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '12px',
};

const HeartRateZones = () => {
  const [zones, setZones] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/strava/athlete/zones').catch(() => null),
      api.get('/strava/activities?limit=500').catch(() => null),
    ]).then(([zonesRes, actsRes]) => {
      const hrZones = zonesRes?.data?.heart_rate?.zones;
      if (!hrZones || hrZones.length === 0) return;

      setZones(hrZones);

      // Calcule la répartition des activités par zone (sur avg_heartrate)
      const acts = Array.isArray(actsRes?.data) ? actsRes.data : [];
      const actsWithHR = acts.filter(a => (a.averageHeartrate || a.average_heartrate));

      if (actsWithHR.length === 0) return;

      const counts = new Array(hrZones.length).fill(0);
      actsWithHR.forEach(a => {
        const hr = a.averageHeartrate || a.average_heartrate;
        for (let i = hrZones.length - 1; i >= 0; i--) {
          if (hr >= hrZones[i].min) {
            counts[i]++;
            break;
          }
        }
      });

      const total = counts.reduce((s, c) => s + c, 0);
      setDistribution(
        hrZones.map((z, i) => ({
          name: ZONE_LABELS[i] || `Z${i + 1}`,
          value: counts[i],
          pct: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
          range: `${z.min}–${z.max === -1 ? '∞' : z.max} bpm`,
        })).filter(d => d.value > 0)
      );
    }).finally(() => setLoading(false));
  }, []);

  const hasData = distribution.length > 0;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.2)' }}>
          <Heart className="w-5 h-5" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Zones de fréquence cardiaque
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Répartition des activités par intensité
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
      ) : !zones ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <Heart className="w-8 h-8" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Zones FC non configurées sur Strava.
            <br />
            <span className="text-xs">Renseignez votre FC max dans les paramètres Strava.</span>
          </p>
        </div>
      ) : !hasData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Aucune activité avec données FC disponible.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          <div className="w-full sm:w-56 h-52 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {distribution.map((entry, i) => (
                    <Cell key={i} fill={ZONE_COLORS[ZONE_LABELS.indexOf(entry.name)] ?? ZONE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, n, p) => [`${p.payload.pct}% (${v} séances)`, p.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Légende détaillée */}
          <div className="flex-1 space-y-2 w-full">
            {distribution.map((d, i) => {
              const color = ZONE_COLORS[ZONE_LABELS.indexOf(d.name)] ?? ZONE_COLORS[i];
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                      <span className="text-xs font-bold" style={{ color }}>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${d.pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{d.range} · {d.value} séances</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeartRateZones;
