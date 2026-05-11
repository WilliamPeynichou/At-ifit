import React, { useState, useMemo } from 'react';
import CountUp from 'react-countup';
import { MapPin, Clock, Mountain, Flame, Calendar, Flame as Streak, Heart, Trophy } from 'lucide-react';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';

const formatDuration = (s) => {
  if (!s) return '0h';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${String(m).padStart(2, '0')}`;
};

const Tile = ({ icon, label, value, suffix = '', accent = '#fc4c02', sub = '', decimals = 0 }) => (
  <div
    className="rounded-2xl p-6 relative overflow-hidden"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${accent}40`,
      backdropFilter: 'blur(12px)',
    }}
  >
    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: accent }} />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-3" style={{ color: accent }}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {typeof value === 'number' ? (
          <CountUp end={value} duration={2} decimals={decimals} separator=" " />
        ) : value}
        <span className="text-2xl ml-1 opacity-70">{suffix}</span>
      </div>
      {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  </div>
);

const HeroRecap = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, loading, error } = useAnalyticsSummary(year);

  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= currentYear - 4; y--) list.push(y);
    list.push('all');
    return list;
  }, [currentYear]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p style={{ color: 'var(--text-muted)' }}>Chargement des stats...</p>
      </div>
    );
  }

  if (error || !data || !data.totals) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-muted)' }}>Pas de données pour {year === 'all' ? 'toutes les années' : year}.</p>
      </div>
    );
  }

  const t = data.totals;
  const kmTotal = (t.distance / 1000);
  const elevation = t.elevation;
  const days = data.calendar.length; // jours actifs sur l'année

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex flex-wrap gap-2">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setYear(y === 'all' ? null : y)}
            className="px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all"
            style={(year === y || (y === 'all' && year === null)) ? {
              background: '#fc4c02',
              color: '#fff',
              boxShadow: '0 0 20px #fc4c0250',
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            {y === 'all' ? 'TOUT' : y}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile
          icon={<MapPin size={18} />}
          label="Distance totale"
          value={kmTotal}
          decimals={1}
          suffix="km"
          accent="#fc4c02"
          sub={`Soit ${(kmTotal / 40075 * 100).toFixed(2)}% du tour de la Terre`}
        />
        <Tile
          icon={<Clock size={18} />}
          label="Temps total"
          value={formatDuration(t.movingTime)}
          accent="#0055ff"
          sub={`${(t.movingTime / 3600).toFixed(0)} heures de sport`}
        />
        <Tile
          icon={<Mountain size={18} />}
          label="Dénivelé+"
          value={elevation}
          suffix="m"
          accent="#22c55e"
          sub={`${(elevation / 8849).toFixed(2)} fois l'Everest`}
        />
        <Tile
          icon={<Flame size={18} />}
          label="Calories brûlées"
          value={t.calories}
          suffix="kcal"
          accent="#ef4444"
          sub={`${Math.round(t.calories / 250)} parts de pizza 🍕`}
        />
        <Tile
          icon={<Calendar size={18} />}
          label="Jours actifs"
          value={days}
          suffix={`/ 365`}
          accent="#a855f7"
          sub={`${Math.round(days / 3.65)}% de l'année`}
        />
        <Tile
          icon={<Streak size={18} />}
          label="Streak max"
          value={data.streaks.longest}
          suffix={`j`}
          accent="#eab308"
          sub={`Streak courant : ${data.streaks.current}j`}
        />
        <Tile
          icon={<Trophy size={18} />}
          label="Activités"
          value={t.count}
          accent="#06b6d4"
          sub={`${(t.count / 52).toFixed(1)} par semaine en moyenne`}
        />
        <Tile
          icon={<Heart size={18} />}
          label="Kudos reçus"
          value={t.kudos}
          accent="#ec4899"
          sub={`${t.pr} records personnels`}
        />
        <Tile
          icon={<Trophy size={18} />}
          label="Sport favori"
          value={data.bySport.sort((a, b) => b.count - a.count)[0]?.type || '—'}
          accent="#84cc16"
          sub={`${data.bySport.length} disciplines pratiquées`}
        />
      </div>
    </div>
  );
};

export default HeroRecap;
