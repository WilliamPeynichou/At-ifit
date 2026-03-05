import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import { Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '13px',
};

const YearlyProgress = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('run');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/strava/athlete/stats').catch(() => null),
      api.get('/strava/activities?limit=500').catch(() => null),
    ]).then(([statsRes, actRes]) => {
      if (statsRes?.data) setStats(statsRes.data);

      // Calcul km par mois depuis activités DB
      const acts = Array.isArray(actRes?.data) ? actRes.data : [];
      const year = new Date().getFullYear();
      const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], km: 0, count: 0 }));

      acts.forEach(a => {
        const d = new Date(a.startDate || a.start_date);
        if (d.getFullYear() !== year) return;
        byMonth[d.getMonth()].km += (a.distance || 0) / 1000;
        byMonth[d.getMonth()].count += 1;
      });

      setMonthlyData(byMonth.map(m => ({ ...m, km: parseFloat(m.km.toFixed(1)) })));
    }).finally(() => setLoading(false));
  }, []);

  const ytdRun = stats?.ytd_run_totals;
  const ytdRide = stats?.ytd_ride_totals;
  const allRun = stats?.all_run_totals;
  const allRide = stats?.all_ride_totals;

  const fmt = (m) => m ? `${(m.distance / 1000).toFixed(0)} km` : '—';
  const fmtH = (m) => m ? `${Math.round(m.moving_time / 3600)}h` : '—';

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.2)' }}>
          <Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Progression annuelle
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Km par mois — {new Date().getFullYear()}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
      ) : (
        <>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} width={32} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, n) => [`${v} km`, 'Distance']}
                labelFormatter={(l) => l}
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
