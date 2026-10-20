import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import { Calendar } from 'lucide-react';
import { useTemporal } from '../context/TemporalContext';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const SPORT_LABELS = { run: 'Course', ride: 'Vélo', walk: 'Marche', swim: 'Natation', workout: 'Muscu' };

const tooltipStyle = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '10px',
  color: 'var(--chart-tooltip-text)',
  padding: '8px 10px',
  fontSize: '12px',
  width: 'max-content',
  maxWidth: 'min(280px, calc(100vw - 32px))',
  boxShadow: '0 10px 24px rgba(20,20,19,0.14)',
};

const FilterBtn = ({ active, onClick, children }) => (
  <button
    aria-pressed={active}
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

const YearlyProgress = ({ activities: providedActivities, hideRunning = false, selectedSport = 'All' }) => {
  const { queryParams, from, to } = useTemporal();
  const [fetchedActivities, setFetchedActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [sport, setSport] = useState('tous');

  useEffect(() => {
    setSport(selectedSport === 'All' ? 'tous' : selectedSport.toLowerCase());
  }, [selectedSport]);

  const activities = providedActivities ?? fetchedActivities;
  const matchesSport = (activityType, selected) => {
    if (selected === 'tous') return true;
    const type = String(activityType || '').toLowerCase();
    if (selected === 'ride') return type.includes('ride');
    if (selected === 'run') return type.includes('run');
    return type === selected;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setStats(null);
    setFetchedActivities([]);
    const sep = queryParams ? '&' : '?';
    const promises = [api.get('/strava/athlete/stats').catch(() => null)];
    if (!providedActivities) {
      promises.push(api.get(`/strava/activities${queryParams}${sep}limit=500`));
    }
    Promise.all(promises).then((results) => {
      if (cancelled) return;
      const statsRes = results[0];
      if (statsRes?.data) setStats(statsRes.data);
      if (!providedActivities) {
        const actRes = results[1];
        setFetchedActivities(Array.isArray(actRes?.data) ? actRes.data : []);
      }
    }).catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [queryParams, providedActivities]);

  // Années disponibles dans les données
  const availableYears = useMemo(() => {
    const years = new Set(activities.map(a => new Date(a.startDate || a.start_date).getFullYear()).filter(Number.isFinite));
    return Array.from(years).sort((a, b) => b - a);
  }, [activities]);

  const selectedYear = availableYears.includes(year) ? year : availableYears[0] ?? new Date().getFullYear();
  const partialYear = Boolean((from && new Date(from) > new Date(selectedYear, 0, 1))
    || (to && new Date(to) < new Date(selectedYear, 11, 31, 23, 59, 59, 999)));

  // Sports disponibles pour l'année sélectionnée
  const availableSports = useMemo(() => {
    const types = new Set(
      activities
        .filter(a => new Date(a.startDate || a.start_date).getFullYear() === selectedYear)
        .map(a => (a.type || '').toLowerCase())
        .filter(Boolean)
    );
    return Array.from(types);
  }, [activities, selectedYear]);

  // Km par mois selon l'année + filtre sport
  const monthlyData = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], km: 0, count: 0 }));
    activities.forEach(a => {
      const d = new Date(a.startDate || a.start_date);
      if (d.getFullYear() !== selectedYear) return;
      if (!matchesSport(a.type, sport)) return;
      byMonth[d.getMonth()].km += (a.distance || 0) / 1000;
      byMonth[d.getMonth()].count += 1;
    });
    return byMonth.map(m => ({ ...m, km: parseFloat(m.km.toFixed(1)) }));
  }, [activities, selectedYear, sport]);

  const totalKm = monthlyData.reduce((s, m) => s + m.km, 0).toFixed(0);
  const totalCount = monthlyData.reduce((s, m) => s + m.count, 0);

  // Totaux pour l'année sélectionnée — recalculés à partir des activités filtrées
  // (les ytd_*_totals de Strava ne couvrent QUE l'année en cours)
  const yearTotals = useMemo(() => {
    const totals = { run: { distance: 0, moving_time: 0, count: 0 }, ride: { distance: 0, moving_time: 0, count: 0 } };
    activities.forEach(a => {
      const d = new Date(a.startDate || a.start_date);
      if (d.getFullYear() !== selectedYear) return;
      const type = (a.type || '').toLowerCase();
      if (!matchesSport(type, sport)) return;
      const dist = a.distance || 0;
      const time = a.movingTime || a.moving_time || 0;
      if (type === 'run') {
        totals.run.distance += dist;
        totals.run.moving_time += time;
        totals.run.count += 1;
      } else if (type.includes('ride')) {
        totals.ride.distance += dist;
        totals.ride.moving_time += time;
        totals.ride.count += 1;
      }
    });
    return totals;
  }, [activities, selectedYear, sport]);

  const allRun = stats?.all_run_totals;
  const allRide = stats?.all_ride_totals;

  const fmt = (m) => m && m.distance > 0 ? `${(m.distance / 1000).toFixed(0)} km` : '—';
  const fmtH = (m) => m && m.moving_time > 0 ? `${Math.round(m.moving_time / 3600)}h` : '—';

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
              Progression mensuelle — {selectedYear}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {totalKm} km · {totalCount} séance{totalCount > 1 ? 's' : ''} — {partialYear ? 'année partielle, période sélectionnée' : 'activités chargées de l’année'}
            </p>
          </div>
        </div>

        {/* Sélecteur d'année */}
        {!loading && availableYears.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {availableYears.map(y => (
              <FilterBtn key={y} active={selectedYear === y} onClick={() => setYear(y)}>{y}</FilterBtn>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
      ) : error ? (
        <p role="alert" className="py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Impossible de charger les activités de la période.</p>
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

          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Le graphique et les totaux {selectedYear} portent uniquement sur les activités chargées de la période sélectionnée{partialYear ? ' : il ne s’agit pas d’une année complète' : ''}. Les totaux historiques Strava sont hors filtres de période et de sport.
          </p>
          {totalCount === 0 && <p role="status" className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Aucune activité pour cette année et ce sport dans la période sélectionnée.</p>}
          {/* Totaux année sélectionnée + all-time */}
          <div className={`grid grid-cols-2 ${hideRunning ? 'sm:grid-cols-2' : 'sm:grid-cols-4'} gap-3 mb-6`}>
            {[
              !hideRunning && { label: `Course ${selectedYear}${partialYear ? ' (partiel)' : ''}`, km: fmt(yearTotals.run), h: fmtH(yearTotals.run), count: yearTotals.run.count },
              { label: `Vélo ${selectedYear}${partialYear ? ' (partiel)' : ''}`, km: fmt(yearTotals.ride), h: fmtH(yearTotals.ride), count: yearTotals.ride.count },
              !hideRunning && { label: 'Course historique', km: fmt(allRun), h: fmtH(allRun), count: allRun?.count },
              { label: 'Vélo historique', km: fmt(allRide), h: fmtH(allRide), count: allRide?.count },
            ].filter(Boolean).map(({ label, km, h, count }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(0,85,255,0.05)', border: '1px solid rgba(0,85,255,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{km}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h}{count ? ` · ${count} séances` : ''}</p>
                </div>
              ))}
            </div>

          {/* Graphique km/mois */}
          <ResponsiveContainer width="100%" height={200} debounce={150}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} km`, 'Distance']}
                labelStyle={{ color: 'var(--chart-tooltip-text)', fontWeight: 700 }}
                itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                cursor={{ fill: 'rgba(106,155,204,0.10)' }}
              />
              <Bar dataKey="km" fill="var(--accent-blue)" fillOpacity={0.72} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

export default YearlyProgress;
