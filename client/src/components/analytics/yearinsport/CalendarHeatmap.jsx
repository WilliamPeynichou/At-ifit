import React, { useState, useMemo } from 'react';
import HeatmapLib from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';

const ACCENT = '#fc4c02';

const colorScale = (intensity) => {
  // 0 (no activity) → transparent ; 1-4 → orange progressif
  if (intensity === 0) return 'rgba(255,255,255,0.06)';
  if (intensity === 1) return '#fed7aa';
  if (intensity === 2) return '#fdba74';
  if (intensity === 3) return '#fb923c';
  return '#fc4c02';
};

const CalendarHeatmap = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [metric, setMetric] = useState('count'); // count | duration | distance | load
  const { data, loading } = useAnalyticsSummary(year);

  const heatmapData = useMemo(() => {
    if (!data?.calendar) return [];
    return data.calendar.map(d => ({
      date: d.date,
      count: d.count,
      distance: d.distance,
      duration: d.duration,
      load: d.load,
    }));
  }, [data]);

  const maxValue = useMemo(() => {
    if (!heatmapData.length) return 1;
    return Math.max(...heatmapData.map(d => d[metric] || 0));
  }, [heatmapData, metric]);

  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const totalActiveDays = heatmapData.length;
  const totalActivities = heatmapData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <style>{`
        .heatmap-wrap .react-calendar-heatmap text { fill: rgba(255,255,255,0.5); font-size: 8px; }
        .heatmap-wrap .react-calendar-heatmap rect { rx: 2; ry: 2; }
        .heatmap-wrap .react-calendar-heatmap .react-calendar-heatmap-small-text { font-size: 6px; }
      `}</style>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={year === y ? {
                background: ACCENT, color: '#fff', boxShadow: `0 0 20px ${ACCENT}50`,
              } : {
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
              }}
            >{y}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {[
            { id: 'count', label: 'Nombre' },
            { id: 'duration', label: 'Durée' },
            { id: 'distance', label: 'Distance' },
            { id: 'load', label: 'Charge' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              style={metric === m.id ? {
                background: 'rgba(252,76,2,0.2)', color: ACCENT, border: `1px solid ${ACCENT}60`,
              } : {
                background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--glass-border)',
              }}
            >{m.label}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Jours actifs</p>
          <p className="text-2xl font-black" style={{ color: ACCENT }}>{totalActiveDays}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Activités</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{totalActivities}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Streak max</p>
          <p className="text-2xl font-black" style={{ color: '#eab308' }}>{data?.streaks?.longest || 0}j</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Streak courant</p>
          <p className="text-2xl font-black" style={{ color: '#22c55e' }}>{data?.streaks?.current || 0}j</p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl p-6 heatmap-wrap" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <HeatmapLib
          startDate={startDate}
          endDate={endDate}
          values={heatmapData}
          classForValue={() => ''}
          transformDayElement={(rect, value) => {
            if (!value) return React.cloneElement(rect, { style: { fill: 'rgba(255,255,255,0.06)' } });
            const v = value[metric] || 0;
            const intensity = v === 0 ? 0 : Math.min(4, Math.ceil((v / maxValue) * 4));
            return React.cloneElement(rect, {
              style: { fill: colorScale(intensity), cursor: 'pointer' },
            });
          }}
          titleForValue={(v) => {
            if (!v) return '';
            const labels = {
              count: `${v.count} activités`,
              duration: `${Math.round(v.duration / 60)} min`,
              distance: `${(v.distance / 1000).toFixed(1)} km`,
              load: `${Math.round(v.load)} pts charge`,
            };
            return `${v.date} — ${labels[metric]}`;
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Moins</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="w-4 h-4 rounded-sm" style={{ background: colorScale(i) }} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
};

export default CalendarHeatmap;
