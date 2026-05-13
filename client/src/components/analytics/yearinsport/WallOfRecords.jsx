import React from 'react';
import { Trophy, MapPin, Clock, Mountain, Gauge, Heart, Zap, ThumbsUp } from 'lucide-react';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const RecordCard = ({ icon, title, value, unit, activity, accent }) => (
  <div
    className="rounded-2xl p-6 relative overflow-hidden transition-all hover:scale-[1.02]"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${accent}50`,
      backdropFilter: 'blur(12px)',
    }}
  >
    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-25" style={{ background: accent }} />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-4" style={{ color: accent }}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {value}
        <span className="text-xl ml-1 opacity-70">{unit}</span>
      </div>
      {activity && (
        <div className="pt-3 mt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-secondary)' }}>
            {activity.name || '—'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {formatDate(activity.startDate)} · {activity.type}
          </p>
        </div>
      )}
    </div>
  </div>
);

const WallOfRecords = () => {
  const { data, loading } = useAnalyticsSummary();

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const r = data?.records || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RecordCard
          icon={<MapPin size={18} />}
          title="Plus longue sortie"
          value={r.longestDistance ? ((r.longestDistance.distance || 0) / 1000).toFixed(1) : '—'}
          unit="km"
          activity={r.longestDistance}
          accent="#fc4c02"
        />
        <RecordCard
          icon={<Clock size={18} />}
          title="Plus longue durée"
          value={r.longestDuration ? `${Math.floor((r.longestDuration.movingTime || 0) / 3600)}h${String(Math.floor(((r.longestDuration.movingTime || 0) % 3600) / 60)).padStart(2, '0')}` : '—'}
          unit=""
          activity={r.longestDuration}
          accent="#0055ff"
        />
        <RecordCard
          icon={<Mountain size={18} />}
          title="Plus gros dénivelé"
          value={r.biggestClimb ? Math.round(r.biggestClimb.totalElevationGain || 0) : '—'}
          unit="m"
          activity={r.biggestClimb}
          accent="#22c55e"
        />
        <RecordCard
          icon={<Gauge size={18} />}
          title="Vitesse max"
          value={r.fastestSpeed ? ((r.fastestSpeed.maxSpeed || 0) * 3.6).toFixed(1) : '—'}
          unit="km/h"
          activity={r.fastestSpeed}
          accent="#06b6d4"
        />
        <RecordCard
          icon={<Heart size={18} />}
          title="Effort max"
          value={r.highestSuffer?.sufferScore || '—'}
          unit="pts"
          activity={r.highestSuffer}
          accent="#ef4444"
        />
        <RecordCard
          icon={<Zap size={18} />}
          title="Puissance max"
          value={r.highestPower?.maxWatts ? Math.round(r.highestPower.maxWatts) : '—'}
          unit="W"
          activity={r.highestPower}
          accent="#eab308"
        />
        <RecordCard
          icon={<ThumbsUp size={18} />}
          title="Plus de kudos"
          value={r.mostKudos?.kudosCount || '—'}
          unit=""
          activity={r.mostKudos}
          accent="#ec4899"
        />
        <RecordCard
          icon={<Trophy size={18} />}
          title="Activités totales"
          value={data?.totals?.count || '—'}
          unit=""
          accent="#a855f7"
        />
        <RecordCard
          icon={<Trophy size={18} />}
          title="Records personnels"
          value={data?.totals?.pr || '—'}
          unit="PR"
          accent="#84cc16"
        />
      </div>
    </div>
  );
};

export default WallOfRecords;
