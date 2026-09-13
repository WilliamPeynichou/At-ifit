import React from 'react';
import { BookOpen, Check, Flag, Utensils } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const STEPS = [
  { path: '/preparer-course', label: 'Préparer ma course', hint: 'Objectif, plan, allures', icon: Flag },
  { path: '/nutrition/strategie', label: 'Stratégie nutritionnelle', hint: 'Glucides, boisson, sodium', icon: Utensils },
  { path: '/nutrition', label: 'Guide et comparatifs', hint: 'Protocoles et modèles', icon: BookOpen },
];

/**
 * Fil conducteur commun aux trois pages du parcours course → nutrition.
 * Il rend la progression visible et permet de naviguer sans perdre le contexte.
 */
export default function RaceJourneySteps({ contextLabel, strategySearch }) {
  const { pathname } = useLocation();
  const currentIndex = STEPS.findIndex(step => step.path === pathname);

  return (
    <nav aria-label="Parcours course et nutrition" className="glass-panel p-4 sm:p-5">
      <ol className="grid sm:grid-cols-3 gap-3">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = currentIndex > -1 && index < currentIndex;
          const to = step.path === '/nutrition/strategie' && strategySearch
            ? `${step.path}?${strategySearch}`
            : step.path;

          return (
            <li key={step.path}>
              <Link
                to={to}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex items-start gap-3 p-3 rounded-xl h-full transition-colors"
                style={{
                  background: isCurrent ? 'var(--accent-blue-light)' : 'var(--surface-subtle)',
                  border: `1px solid ${isCurrent ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                }}
              >
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                  style={{
                    background: isCurrent || isDone ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: isCurrent || isDone ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {isDone ? <Check size={14} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-bold text-sm">
                    {React.createElement(step.icon, { size: 15, style: { color: 'var(--accent-blue)' } })}
                    {step.label}
                  </span>
                  <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{step.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {contextLabel && (
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Course en cours : <strong style={{ color: 'var(--text-secondary)' }}>{contextLabel}</strong>. Les informations
          saisies suivent d’une étape à l’autre.
        </p>
      )}
    </nav>
  );
}
