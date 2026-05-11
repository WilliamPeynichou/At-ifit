import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Waves } from 'lucide-react';

const SWIM_TYPES = ['Swim'];

const paceFor100m = (mps) => {
  if (!mps || mps <= 0) return null;
  const secPer100 = 100 / mps;
  const min = Math.floor(secPer100 / 60);
  const sec = Math.round(secPer100 % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
};

const SwimmingPerf = ({ activities }) => {
  const data = useMemo(() => {
    if (!activities?.length) return null;
    const swims = activities.filter(a => SWIM_TYPES.includes(a.type));
    if (!swims.length) return null;

    const totalDist = swims.reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = swims.reduce((s, a) => s + (a.moving_time || a.movingTime || 0), 0);
    const avgSpeed = totalDist / totalTime;

    const evolution = swims
      .filter(a => a.average_speed || a.averageSpeed)
      .map(a => ({
        date: new Date(a.start_date || a.startDate),
        avgSpeed: a.average_speed || a.averageSpeed,
        pace100: paceFor100m(a.average_speed || a.averageSpeed),
        secPer100: 100 / (a.average_speed || a.averageSpeed),
        distance: (a.distance || 0),
        name: a.name,
      }))
      .sort((a, b) => a.date - b.date);

    return { swims, totalDist, totalTime, avgSpeed, evolution };
  }, [activities]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <Waves size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Pas d'activités de natation détectées.</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>(Optionnel — focus principal : course + vélo)</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid #06b6d440' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>Distance totale</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {Math.round(data.totalDist)}<span className="text-base opacity-70 ml-1">m</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid #06b6d440' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>Allure moyenne</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {paceFor100m(data.avgSpeed) || '—'}<span className="text-base opacity-70 ml-1">/100m</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid #06b6d440' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>Séances</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{data.swims.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid #06b6d440' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>Temps total</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {Math.floor(data.totalTime / 3600)}h{String(Math.floor((data.totalTime % 3600) / 60)).padStart(2, '0')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Évolution allure /100m</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.evolution.map(d => ({
              ...d,
              dateLabel: d.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="dateLabel" stroke="#a8a29e" interval="preserveStartEnd" />
              <YAxis stroke="#06b6d4" reversed tickFormatter={(v) => {
                const min = Math.floor(v / 60);
                const sec = Math.round(v % 60);
                return `${min}:${String(sec).padStart(2, '0')}`;
              }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', borderColor: 'rgba(6,182,212,0.2)', color: '#fff' }}
                formatter={(v, name, p) => name === 'secPer100' ? p.payload.pace100 : v}
              />
              <Line type="monotone" dataKey="secPer100" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Allure /100m" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SwimmingPerf;
