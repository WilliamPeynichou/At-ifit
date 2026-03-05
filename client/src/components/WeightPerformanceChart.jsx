import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../api';
import { TrendingDown, Activity } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '13px',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name} : <strong>{p.value ?? '—'}{p.unit}</strong>
        </p>
      ))}
    </div>
  );
};

const WeightPerformanceChart = () => {
  const [data, setData] = useState([]);
  const [weeks, setWeeks] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/stats/weight-performance?weeks=${weeks}`)
      .then(res => setData(res.data))
      .catch(() => setError('Données insuffisantes'))
      .finally(() => setLoading(false));
  }, [weeks]);

  const hasData = data.some(d => d.avgWeight !== null || d.totalDistance > 0);

  // Calcul des domaines Y pour les deux axes
  const weights = data.map(d => d.avgWeight).filter(Boolean);
  const minW = weights.length ? Math.floor(Math.min(...weights)) - 2 : 'auto';
  const maxW = weights.length ? Math.ceil(Math.max(...weights)) + 2 : 'auto';

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.2)' }}>
            <TrendingDown className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Poids × Performance
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Corrélation entre votre poids et votre volume d'entraînement
            </p>
          </div>
        </div>

        {/* Période selector */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--glass-border)' }}>
          {[8, 12, 24].map(w => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={weeks === w
                ? { background: 'var(--accent-blue)', color: '#fff' }
                : { color: 'var(--text-muted)' }
              }
            >
              {w}S
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-muted)' }}>
          Chargement...
        </div>
      ) : error || !hasData ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Activity className="w-10 h-10" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            {error || 'Pas encore de données.'}
            <br />
            <span className="text-xs">Connectez Strava et enregistrez votre poids régulièrement.</span>
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              {/* Axe poids (gauche) */}
              <YAxis
                yAxisId="weight"
                orientation="left"
                domain={[minW, maxW]}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}kg`}
                width={42}
              />
              {/* Axe distance (droite) */}
              <YAxis
                yAxisId="distance"
                orientation="right"
                tick={{ fontSize: 11, fill: 'rgba(0,85,255,0.6)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}km`}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
              />
              <Bar
                yAxisId="distance"
                dataKey="totalDistance"
                name="Distance (km)"
                fill="rgba(0,85,255,0.18)"
                stroke="rgba(0,85,255,0.4)"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                unit=" km"
              />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="avgWeight"
                name="Poids (kg)"
                stroke="var(--text-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--text-primary)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
                unit=" kg"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Légende insight */}
          <div className="mt-4 flex flex-wrap gap-3">
            {(() => {
              const withBoth = data.filter(d => d.avgWeight && d.totalDistance > 0);
              if (withBoth.length < 3) return null;
              const first = withBoth[0];
              const last = withBoth[withBoth.length - 1];
              const weightTrend = last.avgWeight - first.avgWeight;
              const distTrend = last.totalDistance - first.totalDistance;
              return (
                <>
                  {weightTrend !== 0 && (
                    <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: weightTrend < 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: weightTrend < 0 ? '#16a34a' : '#dc2626', border: `1px solid ${weightTrend < 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
                      Poids {weightTrend < 0 ? '↓' : '↑'} {Math.abs(weightTrend).toFixed(1)} kg sur la période
                    </span>
                  )}
                  {distTrend !== 0 && (
                    <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,85,255,0.08)', color: 'var(--accent-blue)', border: '1px solid rgba(0,85,255,0.2)' }}>
                      Volume {distTrend > 0 ? '↑' : '↓'} {Math.abs(distTrend).toFixed(0)} km
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default WeightPerformanceChart;
