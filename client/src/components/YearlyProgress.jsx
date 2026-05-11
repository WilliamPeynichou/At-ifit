import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import { Calendar } from 'lucide-react';
import { useTemporal } from '../context/TemporalContext';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const SPORT_LABELS = { run: 'Course', ride: 'Vélo', walk: 'Marche', swim: 'Natation', workout: 'Muscu' };

const tooltipStyle = {
  backgroundColor: 'rgba(19,16,20,0.97)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: '12px',
  color: '#e8e8e8',
  padding: '10px 14px',
  fontSize: '13px',
};

const FilterBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
    style={active
      ? { background: 'var(--accent-blue)', color: '#fff' }
      : { background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.15)', color: 'var(--text-secondary)' }
    }
  >
    {children}
  </button>
);

const YearlyProgress = () => {
  const { queryParams, fromISO, toISO } = useTemporal();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [sport, setSport] = useState('tous');

  useEffect(() => {
    setLoading(true);
    const sep = queryParams ? '&' : '?';
    Promise.all([
      api.get('/strava/athlete/stats').catch(() => null),
      api.get(`/strava/activities${queryParams}${sep}limit=500`).catch(() => null),
    ]).then(([statsRes, actRes]) => {
      if (statsRes?.data) setStats(statsRes.data);
      setActivities(Array.isArray(actRes?.data) ? actRes.data : []);
    }).finally(() => setLoading(false));
  }, [fromISO, toISO]);

  // Années disponibles dans les données
  const availableYears = useMemo(() => {
    const years = new Set(activities.map(a => new Date(a.startDate || a.start_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [activities]);

  // Sports disponibles pour l'année sélectionnée
  const availableSports = useMemo(() => {
    const types = new Set(
      activities
        .filter(a => new Date(a.startDate || a.start_date).getFullYear() === year)
        .map(a => (a.type || '').toLowerCase())
        .filter(Boolean)
    );
    return Array.from(types);
  }, [activities, year]);

  // Km par mois selon l'année + filtre sport
  const monthlyData = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], km: 0, count: 0 }));
    activities.forEach(a => {
      const d = new Date(a.startDate || a.start_date);
      if (d.getFullYear() !== year) return;
      if (sport !== 'tous' && (a.type || '').toLowerCase() !== sport) return;
      byMonth[d.getMonth()].km += (a.distance || 0) / 1000;
      byMonth[d.getMonth()].count += 1;
    });
    return byMonth.map(m => ({ ...m, km: parseFloat(m.km.toFixed(1)) }));
  }, [activities, year, sport]);

  const totalKm = monthlyData.reduce((s, m) => s + m.km, 0).toFixed(0);
  const totalCount = monthlyData.reduce((s, m) => s + m.count, 0);

  const ytdRun = stats?.ytd_run_totals;
  const ytdRide = stats?.ytd_ride_totals;
  const allRun = stats?.all_run_totals;
  const allRide = stats?.all_ride_totals;

  const fmt = (m) => m ? `${(m.distance / 1000).toFixed(0)} km` : '—';
  const fmtH = (m) => m ? `${Math.round(m.moving_time / 3600)}h` : '—';

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.2)' }}>
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Progression annuelle
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {totalKm} km · {totalCount} séance{totalCount > 1 ? 's' : ''} — {year}
            </p>
          </div>
        </div>

        {/* Sélecteur d'année */}
        {!loading && availableYears.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {availableYears.map(y => (
              <FilterBtn key={y} active={year === y} onClick={() => setYear(y)}>{y}</FilterBtn>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
      ) : (
        <>
          {/* Filtre sport */}
          {availableSports.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <FilterBtn active={sport === 'tous'} onClick={() => setSport('tous')}>Tous</FilterBtn>
              {availableSports.map(s => (
                <FilterBtn key={s} active={sport === s} onClick={() => setSport(s)}>
                  {SPORT_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1)}
                </FilterBtn>
              ))}
            </div>
          )}

          {/* Totaux YTD + all-time */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Course YTD', km: fmt(ytdRun), h: fmtH(ytdRun), count: ytdRun?.count },
                { label: 'Vélo YTD', km: fmt(ytdRide), h: fmtH(ytdRide), count: ytdRide?.count },
                { label: 'Course total', km: fmt(allRun), h: fmtH(allRun), count: allRun?.count },
                { label: 'Vélo total', km: fmt(allRide), h: fmtH(allRide), count: allRide?.count },
              ].map(({ label, km, h, count }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(0,85,255,0.05)', border: '1px solid rgba(0,85,255,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{km}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h}{count ? ` · ${count} séances` : ''}</p>
                </div>
              ))}
            </div>
          )}

          {/* Graphique km/mois */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} km`, 'Distance']}
                cursor={{ fill: 'rgba(0,85,255,0.06)' }}
              />
              <Bar dataKey="km" fill="rgba(0,85,255,0.55)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

export default YearlyProgress;
