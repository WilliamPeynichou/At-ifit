import React, { useState, useEffect } from 'react';
import api from '../api';
import { AlertTriangle } from 'lucide-react';
import { useTemporal } from '../context/TemporalContext';

const CATEGORY_ICON = { bike: '🚴', shoe: '👟' };
const CATEGORY_LABEL = { bike: 'Vélo', shoe: 'Chaussures' };

const GearTracker = () => {
  const { queryParams, fromISO, toISO } = useTemporal();
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/stats/gear-usage${queryParams}`)
      .then(res => setGear(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fromISO, toISO]);

  if (loading) {
    return (
      <div className="glass-panel p-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement équipement...</p>
      </div>
    );
  }

  if (gear.length === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎽</span>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Suivi équipement
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kilométrage de vos chaussures et vélos</p>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Aucun équipement enregistré. Associez vos chaussures ou vélos à vos activités Strava.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🎽</span>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Suivi équipement
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Kilométrage · {gear.length} équipement{gear.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {gear.map(item => {
          const pct = item.progressPct;
          const barColor = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f97316' : '#0055ff';

          return (
            <div key={item.gearId} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICON[item.category] || '🎽'}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {CATEGORY_LABEL[item.category] || item.category} · {item.activityCount} activité{item.activityCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {item.needsReplacement && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#ea580c' }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Remplacement recommandé
                  </span>
                )}
              </div>

              {/* Barre de progression */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                  />
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: barColor }}>{item.km} km</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>/ {item.limit} km</span>
                </div>
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {pct}% · {Math.max(0, item.limit - item.km).toFixed(0)} km restants
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GearTracker;
