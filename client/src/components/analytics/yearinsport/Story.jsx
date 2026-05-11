import React, { useState } from 'react';
import CountUp from 'react-countup';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';

const StoryCard = ({ headline, value, unit, sub, gradient, footer }) => (
  <div
    className="rounded-3xl p-8 sm:p-12 min-h-[400px] flex flex-col justify-between relative overflow-hidden"
    style={{ background: gradient, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}
  >
    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-30 bg-white" />
    <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl opacity-20 bg-white" />

    <div className="relative z-10">
      <p className="text-white/80 text-sm sm:text-base font-bold uppercase tracking-widest mb-6">
        {headline}
      </p>
      <div className="text-6xl sm:text-8xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        {typeof value === 'number' ? (
          <CountUp end={value} duration={2.5} separator=" " preserveValue />
        ) : value}
        <span className="text-3xl sm:text-5xl ml-2 opacity-80">{unit}</span>
      </div>
      {sub && <p className="text-white/90 text-lg sm:text-xl mt-4">{sub}</p>}
    </div>

    {footer && <p className="text-white/70 text-sm relative z-10">{footer}</p>}
  </div>
);

const Story = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, loading } = useAnalyticsSummary(year);

  if (loading || !data?.totals) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const t = data.totals;
  const kmTotal = t.distance / 1000;
  const everests = (t.elevation / 8849).toFixed(2);
  const topSport = data.bySport.sort((a, b) => b.distance - a.distance)[0];
  const longestRun = data.records?.longestDistance;

  // Suggestions de comparaisons
  const cityComparison = () => {
    if (kmTotal > 1000) return { city: 'Paris → Athènes', km: 2400 };
    if (kmTotal > 500) return { city: 'Paris → Marseille', km: 775 };
    if (kmTotal > 200) return { city: 'Paris → Lyon', km: 463 };
    return { city: 'Paris → Rouen', km: 135 };
  };
  const cc = cityComparison();

  const slides = [
    {
      headline: `Votre année ${year}`,
      value: t.count,
      unit: 'activités',
      sub: `${data.bySport.length} disciplines explorées`,
      gradient: 'linear-gradient(135deg, #fc4c02 0%, #ff8a3d 100%)',
    },
    {
      headline: 'Distance parcourue',
      value: Math.round(kmTotal),
      unit: 'km',
      sub: `Soit l'équivalent de ${(kmTotal / cc.km).toFixed(1)}× ${cc.city}`,
      gradient: 'linear-gradient(135deg, #0055ff 0%, #00f3ff 100%)',
    },
    {
      headline: 'Vous avez grimpé',
      value: t.elevation,
      unit: 'm de D+',
      sub: `Soit ${everests} fois la hauteur de l'Everest`,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #84cc16 100%)',
    },
    {
      headline: 'Temps passé en sport',
      value: Math.round(t.movingTime / 3600),
      unit: 'heures',
      sub: `Soit ${Math.round(t.movingTime / 3600 / 24)} jours complets`,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    },
    {
      headline: 'Calories brûlées',
      value: t.calories,
      unit: 'kcal',
      sub: `≈ ${Math.round(t.calories / 250)} parts de pizza, ou ${Math.round(t.calories / 50)} carrés de chocolat`,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    },
    {
      headline: 'Votre sport phare',
      value: topSport?.type || '—',
      unit: '',
      sub: topSport ? `${Math.round((topSport.distance || 0) / 1000)} km parcourus en ${topSport.count} sorties` : '',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0055ff 100%)',
    },
    {
      headline: 'Votre exploit',
      value: longestRun ? Math.round((longestRun.distance || 0) / 1000) : 0,
      unit: 'km',
      sub: longestRun ? `Votre plus longue sortie : ${longestRun.name}` : '',
      gradient: 'linear-gradient(135deg, #eab308 0%, #fc4c02 100%)',
    },
    {
      headline: 'Régularité',
      value: data.streaks.longest,
      unit: 'jours',
      sub: `Votre plus longue série d'entraînements consécutifs`,
      gradient: 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)',
    },
    {
      headline: 'Kudos reçus',
      value: t.kudos,
      unit: '👏',
      sub: `${t.pr} records personnels battus`,
      gradient: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
      footer: 'Merci à vous d\'avoir bougé cette année 🚀',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[currentYear, currentYear - 1].map(y => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={year === y ? {
              background: '#fc4c02', color: '#fff',
            } : {
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
            }}
          >{y}</button>
        ))}
      </div>

      <div className="space-y-8 max-w-3xl mx-auto">
        {slides.map((s, i) => (
          <StoryCard key={i} {...s} />
        ))}
      </div>
    </div>
  );
};

export default Story;
