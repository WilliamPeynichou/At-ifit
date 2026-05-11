import React, { useMemo } from 'react';
import { Trophy, Calendar } from 'lucide-react';

const formatTime = (s) => {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PRTable = ({ activities }) => {
  const prs = useMemo(() => {
    if (!activities?.length) return [];

    const map = new Map();
    for (const a of activities) {
      const be = a.bestEfforts || a.best_efforts;
      if (!Array.isArray(be)) continue;
      for (const eff of be) {
        if (!eff?.name || !eff?.elapsed_time) continue;
        const cur = map.get(eff.name);
        if (!cur || eff.elapsed_time < cur.elapsed_time) {
          map.set(eff.name, {
            ...eff,
            activityName: a.name,
            activityDate: a.start_date || a.startDate,
            activityType: a.type,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [activities]);

  if (!prs.length) {
    return (
      <div className="text-center py-20">
        <Trophy size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Pas encore de records</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Les records personnels (best_efforts) sont calculés par Strava sur les activités de course.<br/>
          L'enrichissement des détails doit être terminé.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Records totaux</p>
          <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{prs.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(234,179,8,0.08)', border: '1.5px solid #eab30840' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#eab308' }}>PR le plus récent</p>
          <p className="text-xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {(() => {
              const recent = prs.sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))[0];
              return recent ? `${recent.name} · ${formatTime(recent.elapsed_time)}` : '—';
            })()}
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid #22c55e40' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>Plus long PR</p>
          <p className="text-xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {(() => {
              const longest = prs.sort((a, b) => (b.distance || 0) - (a.distance || 0))[0];
              return longest ? longest.name : '—';
            })()}
          </p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(168,85,247,0.1)' }}>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="text-left p-4 font-bold uppercase tracking-widest text-xs">Distance</th>
              <th className="text-right p-4 font-bold uppercase tracking-widest text-xs">Temps</th>
              <th className="text-right p-4 font-bold uppercase tracking-widest text-xs">Allure</th>
              <th className="text-left p-4 font-bold uppercase tracking-widest text-xs">Activité</th>
              <th className="text-right p-4 font-bold uppercase tracking-widest text-xs">Date</th>
            </tr>
          </thead>
          <tbody>
            {prs
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .map((eff, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold" style={{ color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2">
                      <Trophy size={14} style={{ color: '#eab308' }} />
                      {eff.name}
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-lg" style={{ color: '#a855f7' }}>
                    {formatTime(eff.elapsed_time)}
                  </td>
                  <td className="p-4 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                    {eff.distance && eff.elapsed_time ? (() => {
                      const secKm = eff.elapsed_time / (eff.distance / 1000);
                      const m = Math.floor(secKm / 60);
                      const s = Math.round(secKm % 60);
                      return `${m}:${String(s).padStart(2, '0')}/km`;
                    })() : '—'}
                  </td>
                  <td className="p-4 truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                    {eff.activityName || '—'}
                  </td>
                  <td className="p-4 text-right" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center justify-end gap-1.5 text-xs">
                      <Calendar size={12} />
                      {formatDate(eff.activityDate)}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PRTable;
