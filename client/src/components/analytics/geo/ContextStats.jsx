import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Compass, Home, Sun, Cloud } from 'lucide-react';

const ContextStats = ({ activities }) => {
  const data = useMemo(() => {
    if (!activities?.length) return null;

    // Indoor / Outdoor
    let indoor = 0, outdoor = 0;
    activities.forEach(a => (a.trainer ? indoor++ : outdoor++));

    // Commute / Leisure
    let commute = 0, leisure = 0;
    activities.forEach(a => (a.commute ? commute++ : leisure++));

    // Distribution heures (matin/midi/soir/nuit)
    const hourBuckets = { 'Matin (5-12)': 0, 'Midi (12-14)': 0, 'Aprèm (14-18)': 0, 'Soir (18-22)': 0, 'Nuit (22-5)': 0 };
    activities.forEach(a => {
      const date = new Date(a.start_date || a.startDate);
      if (isNaN(date)) return;
      const h = date.getHours();
      if (h >= 5 && h < 12) hourBuckets['Matin (5-12)']++;
      else if (h >= 12 && h < 14) hourBuckets['Midi (12-14)']++;
      else if (h >= 14 && h < 18) hourBuckets['Aprèm (14-18)']++;
      else if (h >= 18 && h < 22) hourBuckets['Soir (18-22)']++;
      else hourBuckets['Nuit (22-5)']++;
    });

    // Distribution jours de la semaine
    const dayBuckets = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => ({ day: d, count: 0, distance: 0 }));
    activities.forEach(a => {
      const date = new Date(a.start_date || a.startDate);
      if (isNaN(date)) return;
      const dayIdx = (date.getDay() + 6) % 7; // Lundi = 0
      dayBuckets[dayIdx].count++;
      dayBuckets[dayIdx].distance += (a.distance || 0) / 1000;
    });

    // Distribution températures
    const temps = activities.filter(a => a.average_temp != null || a.averageTemp != null);
    const tempBuckets = [
      { range: '<0°C', min: -50, max: 0, count: 0, color: '#06b6d4' },
      { range: '0-10°C', min: 0, max: 10, count: 0, color: '#0055ff' },
      { range: '10-20°C', min: 10, max: 20, count: 0, color: '#22c55e' },
      { range: '20-30°C', min: 20, max: 30, count: 0, color: '#eab308' },
      { range: '>30°C', min: 30, max: 100, count: 0, color: '#ef4444' },
    ];
    temps.forEach(a => {
      const t = a.average_temp ?? a.averageTemp;
      const b = tempBuckets.find(b => t >= b.min && t < b.max);
      if (b) b.count++;
    });

    // Solo vs groupe
    let solo = 0, group = 0;
    activities.forEach(a => {
      const n = a.athlete_count ?? a.athleteCount ?? 1;
      if (n > 1) group++; else solo++;
    });

    return {
      indoor, outdoor, commute, leisure, hourBuckets, dayBuckets, tempBuckets, solo, group, hasTemp: temps.length > 0,
    };
  }, [activities]);

  if (!data) return <div className="text-center py-20"><p style={{ color: 'var(--text-muted)' }}>Pas de données contextuelles.</p></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid #22c55e40' }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: '#22c55e' }}>
            <Sun size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Outdoor</p>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{data.outdoor}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            vs {data.indoor} indoor ({((data.outdoor / (data.outdoor + data.indoor)) * 100).toFixed(0)}%)
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: '#a855f7' }}>
            <Home size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Loisir</p>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{data.leisure}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>vs {data.commute} commute</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(0,85,255,0.08)', border: '1.5px solid #0055ff40' }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: '#0055ff' }}>
            <Compass size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Solo</p>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{data.solo}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>vs {data.group} en groupe</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(252,76,2,0.08)', border: '1.5px solid #fc4c0240' }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: '#fc4c02' }}>
            <Cloud size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Moment favori</p>
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {Object.entries(data.hourBuckets).sort((a, b) => b[1] - a[1])[0]?.[0]?.split(' ')[0] || '—'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {Object.entries(data.hourBuckets).sort((a, b) => b[1] - a[1])[0]?.[1]} sorties
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Distribution horaire</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(data.hourBuckets).map(([k, v]) => ({ name: k, count: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#a8a29e" tick={{ fontSize: 10 }} />
                <YAxis stroke="#a8a29e" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                <Bar dataKey="count" fill="#fc4c02" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Par jour de la semaine</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dayBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#a8a29e" />
                <YAxis yAxisId="left" stroke="#a855f7" />
                <YAxis yAxisId="right" orientation="right" stroke="#0055ff" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#a855f7" name="Sorties" />
                <Bar yAxisId="right" dataKey="distance" fill="#0055ff" name="Distance (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data.hasTemp && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Conditions météo (température moyenne)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tempBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="range" stroke="#a8a29e" />
                <YAxis stroke="#a8a29e" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                <Bar dataKey="count">
                  {data.tempBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextStats;
