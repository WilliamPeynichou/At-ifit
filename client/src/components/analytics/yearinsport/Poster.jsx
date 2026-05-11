import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, Activity, Mountain, Flame, Clock } from 'lucide-react';
import useAnalyticsSummary from '../../../hooks/useAnalyticsSummary';
import { useTemporal } from '../../../context/TemporalContext';

const formatDuration = (s) => {
  if (!s) return '0h';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${String(m).padStart(2, '0')}`;
};

const PRESET_LABELS = { '3M': '3M', '6M': '6M', '12M': '12M', ALL: 'AllTime', CUSTOM: 'Custom' };

const Poster = () => {
  const { preset, from, to } = useTemporal();
  const { data, loading } = useAnalyticsSummary();
  const posterRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `atifit-yearinsport-${PRESET_LABELS[preset] || 'period'}.png`;
      link.href = url;
      link.click();
    } catch (e) {
      console.error('Erreur capture poster:', e);
    } finally {
      setDownloading(false);
    }
  };

  const periodLabel = () => {
    if (preset === 'ALL') return 'ALL TIME';
    if (preset === 'CUSTOM' && from && to) {
      return `${from.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} → ${to.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}`;
    }
    if (preset === '3M') return '3 MOIS';
    if (preset === '6M') return '6 MOIS';
    return '12 MOIS';
  };

  if (loading || !data?.totals) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const t = data.totals;
  const topSport = data.bySport.sort((a, b) => b.distance - a.distance)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50"
          style={{ background: '#fc4c02', boxShadow: '0 10px 30px rgba(252,76,2,0.4)' }}
        >
          <Download size={18} />
          {downloading ? 'Génération...' : 'TÉLÉCHARGER'}
        </button>
      </div>

      {/* Poster format 9:16 façon story Insta */}
      <div className="flex justify-center">
        <div
          ref={posterRef}
          className="relative overflow-hidden rounded-3xl"
          style={{
            width: '420px',
            height: '746px',
            background: 'linear-gradient(160deg, #fc4c02 0%, #ff8a3d 35%, #eab308 70%, #131014 100%)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
          }}
        >
          {/* Halos décoratifs */}
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-30 bg-white" />
          <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 bg-white" />

          <div className="relative z-10 h-full flex flex-col p-8">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={20} className="text-white" />
              <span className="text-white/80 text-xs font-bold uppercase tracking-widest">AT-IFIT</span>
            </div>

            <h1 className="text-white text-5xl font-black tracking-tighter mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              YEAR IN
            </h1>
            <h1 className="text-white text-4xl font-black tracking-tighter mb-8" style={{ fontFamily: 'var(--font-display)' }}>
              SPORT <span className="text-white/60 text-2xl">· {periodLabel()}</span>
            </h1>

            <div className="space-y-5 flex-1">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Distance</p>
                <p className="text-white text-4xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
                  {Math.round(t.distance / 1000)} <span className="text-2xl opacity-70">km</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock size={12} className="text-white/70" />
                    <p className="text-white/70 text-xs uppercase tracking-widest">Temps</p>
                  </div>
                  <p className="text-white text-2xl font-black">{formatDuration(t.movingTime)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Mountain size={12} className="text-white/70" />
                    <p className="text-white/70 text-xs uppercase tracking-widest">D+</p>
                  </div>
                  <p className="text-white text-2xl font-black">{Math.round(t.elevation)}<span className="text-base opacity-70">m</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Activités</p>
                  <p className="text-white text-2xl font-black">{t.count}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Flame size={12} className="text-white/70" />
                    <p className="text-white/70 text-xs uppercase tracking-widest">Calories</p>
                  </div>
                  <p className="text-white text-2xl font-black">{Math.round(t.calories / 1000)}<span className="text-base opacity-70">k</span></p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Sport phare</p>
                <p className="text-white text-2xl font-black">{topSport?.type || '—'}</p>
                <p className="text-white/80 text-sm mt-1">
                  {topSport ? `${Math.round((topSport.distance || 0) / 1000)} km · ${topSport.count} sorties` : ''}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/20 flex items-center justify-between">
              <p className="text-white/80 text-xs">@atifit · {data.streaks.longest}j streak max</p>
              <p className="text-white/60 text-xs">{t.kudos} kudos · {t.pr} PR</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Format optimisé pour Instagram Stories (9:16)
      </p>
    </div>
  );
};

export default Poster;
