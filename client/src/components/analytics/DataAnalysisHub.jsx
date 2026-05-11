import React, { useState } from 'react';
import { Sparkles, Activity, TrendingUp, Map, ArrowRight } from 'lucide-react';
import FullscreenModal from '../ui/FullscreenModal';
import ModalTabs from '../ui/ModalTabs';

import YearInSportModal from './yearinsport/YearInSportModal';
import TrainingScienceModal from './training/TrainingScienceModal';
import PerformanceModal from './performance/PerformanceModal';
import GeoModal from './geo/GeoModal';

const cards = [
  {
    id: 'yearinsport',
    title: 'YEAR IN SPORT',
    subtitle: 'Votre récap immersif, à partager',
    icon: <Sparkles size={32} />,
    accent: '#fc4c02',
    gradient: 'linear-gradient(135deg, #fc4c02 0%, #ff8a3d 50%, #ffd166 100%)',
    featured: true,
  },
  {
    id: 'training',
    title: 'TRAINING SCIENCE',
    subtitle: 'Charge, forme, zones cardio',
    icon: <Activity size={28} />,
    accent: '#0055ff',
    gradient: 'linear-gradient(135deg, #0055ff 0%, #00f3ff 100%)',
  },
  {
    id: 'performance',
    title: 'PERFORMANCE',
    subtitle: 'Records, puissance, prédictions',
    icon: <TrendingUp size={28} />,
    accent: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
  },
  {
    id: 'geo',
    title: 'GÉOGRAPHIE',
    subtitle: 'Heatmap GPS, itinéraires, climbing',
    icon: <Map size={28} />,
    accent: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #84cc16 100%)',
  },
];

const DataAnalysisHub = ({ activities }) => {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-black tracking-widest mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          DATA ANALYSE
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Explorez votre activité sous 4 angles
        </p>
      </div>

      {/* Featured card (Year in Sport) - pleine largeur */}
      <button
        onClick={() => setOpenId('yearinsport')}
        className="block w-full text-left rounded-2xl p-8 relative overflow-hidden group transition-all hover:scale-[1.01]"
        style={{
          background: cards[0].gradient,
          boxShadow: '0 20px 60px rgba(252,76,2,0.4)',
        }}
      >
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full blur-3xl opacity-30 bg-white" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                {cards[0].icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                ✨ Vitrine
              </span>
            </div>
            <h3 className="text-4xl font-black tracking-wider text-white mb-1">
              {cards[0].title}
            </h3>
            <p className="text-white/90 text-lg">{cards[0].subtitle}</p>
          </div>
          <ArrowRight size={48} className="text-white opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
        </div>
      </button>

      {/* Grille des 3 autres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.slice(1).map(card => (
          <button
            key={card.id}
            onClick={() => setOpenId(card.id)}
            className="text-left rounded-2xl p-6 relative overflow-hidden group transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid var(--glass-border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: card.gradient }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex p-3 rounded-xl mb-4 transition-all"
                style={{ background: `${card.accent}20`, color: card.accent, border: `1px solid ${card.accent}40` }}
              >
                {card.icon}
              </div>
              <h3
                className="text-xl font-black tracking-wider mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {card.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {card.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Modales */}
      <YearInSportModal
        isOpen={openId === 'yearinsport'}
        onClose={() => setOpenId(null)}
        activities={activities}
      />
      <TrainingScienceModal
        isOpen={openId === 'training'}
        onClose={() => setOpenId(null)}
        activities={activities}
      />
      <PerformanceModal
        isOpen={openId === 'performance'}
        onClose={() => setOpenId(null)}
        activities={activities}
      />
      <GeoModal
        isOpen={openId === 'geo'}
        onClose={() => setOpenId(null)}
        activities={activities}
      />
    </div>
  );
};

export default DataAnalysisHub;
