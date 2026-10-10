import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import PersonalMl from '../predictions/PersonalMl';
import PertPlanner from '../predictions/PertPlanner';
import { StepHeader, cardStyle } from './steps';

const PHASE_COLORS = { Socle: '#6a9bcc', Spécifique: '#788c5d', Pic: '#d97757', Affûtage: '#e0b25a' };

export default function StepTraining({ plan, summary, summaryLoading, summaryError }) {
  const unit = plan?.unit || 'km';
  return (
    <section className="space-y-6">
      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <StepHeader
          step={5}
          title="Plan d’entraînement"
          text="Semaine par semaine, à partir de ton historique Strava des 12 dernières semaines. Chaque quatrième semaine est allégée."
        />
        {summaryLoading && <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" />Lecture de ton historique…</p>}
        {summaryError && <p className="text-sm" style={{ color: '#d97757' }}>{summaryError}</p>}
        {!summaryLoading && !summary && !summaryError && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun historique Strava : le plan part de valeurs prudentes.</p>}
        {plan?.note && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{plan.note}</p>}
        {plan && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(PHASE_COLORS).map(([phase, color]) => (
                <span key={phase} className="px-2.5 py-1 rounded-md font-bold" style={{ background: color, color: '#fff' }}>{phase}</span>
              ))}
            </div>
            <ol className="space-y-3">
              {plan.weeks.map(week => {
                const volume = unit === 'h' ? week.volumeHours : week.volumeKm;
                return (
                  <li key={week.index} className="rounded-xl p-4" style={{ ...cardStyle, borderLeft: `3px solid ${PHASE_COLORS[week.phase]}` }}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong>Semaine {week.index} · {week.phase}{week.isRecovery ? ' · allégée' : ''}</strong>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>du {week.startDate} · {volume} {unit}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{week.focus}</p>
                    <ul className="mt-3 grid md:grid-cols-2 gap-2">
                      {week.sessions.map(session => (
                        <li key={`${week.index}-${session.day}-${session.type}`} className="text-sm rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
                          <span className="font-bold">{session.day} · {session.title}</span>
                          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{session.durationMinutes} min · {session.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <details className="glass-panel p-5 sm:p-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
          <span>
            <span className="font-mono text-xs uppercase tracking-[.2em] block" style={{ color: 'var(--accent-blue)' }}>Optionnel</span>
            <span className="text-xl font-bold">Prédictions ML et PERT</span>
          </span>
          <ChevronDown size={20} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-6 mt-6">
          <PersonalMl />
          <PertPlanner />
        </div>
      </details>
    </section>
  );
}
