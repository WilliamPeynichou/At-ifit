import React, { useState } from 'react';
import {
  AlertTriangle, CalendarRange, Check, ChevronDown, Copy, Droplets, ExternalLink, Loader2, RefreshCw, Save, Sparkles, Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AidNutritionPlan from '../course-planner/AidNutritionPlan';
import { EffortStrategyResults } from '../nutrition/EffortStrategyResults';
import PersonalMl from '../predictions/PersonalMl';
import PertPlanner from '../predictions/PertPlanner';
import { MiniCard, StepHeader, cardStyle } from './steps';

const LEG_TITLES = { cycling: 'Vélo', running: 'Course à pied' };
const PHASE_COLORS = { Socle: '#6a9bcc', Spécifique: '#788c5d', Pic: '#d97757', Affûtage: '#e0b25a' };
const VIEWS = [
  { id: 'nutrition', label: 'Nutrition jour J' },
  { id: 'plan', label: 'Plan semaine par semaine' },
  { id: 'prompt', label: 'Prompt IA' },
];

function Stat({ value, unit, label }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums leading-none">{value}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{unit}</span></p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return [copied, copy];
}

function NutritionCard({ strategy, busy, error, onCompute, profile }) {
  const during = strategy?.during;
  return (
    <MiniCard label="Nutrition jour J" icon={Utensils}>
      {busy && !during && <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" />Calcul de ta stratégie…</p>}
      {during && (
        <div className="grid grid-cols-3 gap-3">
          <Stat value={during.carbohydratesGPerHour.target} unit="g/h" label="Glucides" />
          <Stat value={during.fluidMlPerHour.target} unit="ml/h" label="Boisson" />
          <Stat value={during.sodiumMgPerHour.target} unit="mg/h" label="Sodium" />
        </div>
      )}
      {error && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={16} className="shrink-0" />{error}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Tolérance {profile?.gutTolerance || 'medium'} · sueur {profile?.sweatSodiumProfile || 'normal'}</span>
        <Link to="/nutrition" className="underline">Modifier</Link>
        <button type="button" onClick={onCompute} disabled={busy} className="inline-flex items-center gap-1 underline disabled:opacity-50">
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />Recalculer
        </button>
      </div>
    </MiniCard>
  );
}

function PlanCard({ plan, summary, summaryLoading }) {
  const unit = plan?.unit || 'km';
  const peak = plan?.weeks?.length
    ? Math.max(...plan.weeks.map(w => (unit === 'h' ? w.volumeHours : w.volumeKm)))
    : null;
  const sessions = plan?.weeks?.[0]?.sessions?.length;
  return (
    <MiniCard label="Plan d’entraînement" icon={CalendarRange}>
      {plan ? (
        <div className="grid grid-cols-3 gap-3">
          <Stat value={plan.weeksCount} unit="sem." label="Jusqu’à la course" />
          <Stat value={peak ?? '—'} unit={`${unit}/sem.`} label="Volume au pic" />
          <Stat value={sessions ?? '—'} unit="séances" label="Par semaine" />
        </div>
      ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan indisponible.</p>}
      <p className="mt-auto text-xs" style={{ color: 'var(--text-muted)' }}>
        {summaryLoading ? 'Lecture de ton historique Strava…' : summary ? 'Basé sur tes 12 dernières semaines Strava.' : 'Sans historique Strava : valeurs prudentes.'}
        {plan?.note ? ` ${plan.note}` : ''}
      </p>
    </MiniCard>
  );
}

function SaveCard({ canSave, onSave, saving, saveError, savedRace, prompt }) {
  const [copied, copy] = useCopy(prompt);
  return (
    <MiniCard label="Sauvegarde & suivi IA" icon={Sparkles}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onSave} disabled={!canSave || saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {savedRace ? 'Mettre à jour la course' : 'Sauvegarder la course'}
        </button>
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copié' : 'Copier le prompt'}
        </button>
      </div>
      {savedRace && <p className="text-sm flex items-center gap-1" style={{ color: '#788c5d' }}><Check size={16} />Enregistrée dans « Mes courses »</p>}
      {!canSave && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Renseigne le nom de la course et le temps visé (étape 1).</p>}
      {saveError && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={16} className="shrink-0" />{saveError}</p>}
      <p className="mt-auto text-xs flex flex-wrap gap-x-3" style={{ color: 'var(--text-muted)' }}>
        Colle le prompt dans un projet
        <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Claude<ExternalLink size={11} /></a>
        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">ChatGPT<ExternalLink size={11} /></a>
      </p>
    </MiniCard>
  );
}

function NutritionView({ form, legs, strategy, profile }) {
  const rates = strategy?.during ? {
    carbs: strategy.during.carbohydratesGPerHour.target,
    fluid: strategy.during.fluidMlPerHour.target,
    sodium: strategy.during.sodiumMgPerHour.target,
  } : null;
  return (
    <div className="space-y-4">
      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <p className="font-mono text-xs uppercase tracking-[.2em] flex items-center gap-1.5" style={{ color: '#788c5d' }}><Droplets size={13} />Ravitaillements du parcours</p>
        {legs.length === 0 && (
          <div className="rounded-xl p-4 text-sm" style={cardStyle}>
            Pas de ravitaillement placé. Ajoute un GPX à l’étape 2 ou suis les apports par heure ci-dessus.
          </div>
        )}
        {legs.map(leg => (
          <div key={leg.key} className="space-y-3">
            {leg.key !== 'single' && <p className="font-bold">{LEG_TITLES[leg.key]}</p>}
            <AidNutritionPlan plan={leg.plan} nutrition={rates} />
          </div>
        ))}
      </div>
      {strategy && (
        <details className="glass-panel p-5 sm:p-6 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-bold">
            Détail de la stratégie : avant, pendant, après
            <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-6">
            <EffortStrategyResults plan={strategy} sport={form.sport} gutTolerance={profile?.gutTolerance} sweatSodiumProfile={profile?.sweatSodiumProfile} />
          </div>
        </details>
      )}
    </div>
  );
}

function PlanView({ plan }) {
  const unit = plan?.unit || 'km';
  return (
    <div className="space-y-4">
      {plan && (
        <div className="glass-panel p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(PHASE_COLORS).map(([phase, color]) => (
              <span key={phase} className="px-2.5 py-1 rounded-md font-bold" style={{ background: color, color: '#fff' }}>{phase}</span>
            ))}
            <span className="px-2.5 py-1" style={{ color: 'var(--text-muted)' }}>Une semaine sur quatre est allégée.</span>
          </div>
          <ol className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {plan.weeks.map(week => (
              <li key={week.index} className="rounded-xl p-4 flex flex-col gap-2" style={{ ...cardStyle, borderTop: `3px solid ${PHASE_COLORS[week.phase]}` }}>
                <div className="flex items-baseline justify-between gap-2">
                  <strong>S{week.index} · {week.phase}{week.isRecovery ? ' · allégée' : ''}</strong>
                  <span className="font-mono text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{unit === 'h' ? week.volumeHours : week.volumeKm} {unit}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Semaine du {new Date(`${week.startDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                <ul className="space-y-1.5">
                  {week.sessions.map(session => (
                    <li key={`${week.index}-${session.day}-${session.type}`} className="text-sm leading-snug">
                      <span className="font-bold">{session.day}</span> · {session.title}
                      <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{session.detail}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
      <details className="glass-panel p-5 sm:p-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-bold">
          Prédictions ML et PERT (optionnel)
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-6 mt-6">
          <PersonalMl />
          <PertPlanner />
        </div>
      </details>
    </div>
  );
}

function PromptView({ prompt }) {
  return (
    <div className="glass-panel p-5 sm:p-6 space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Fiche course, plan de passage, nutrition, semaines d’entraînement, ton profil et les consignes de suivi hebdomadaire.
      </p>
      <textarea readOnly value={prompt} rows={18} aria-label="Prompt IA" className="input-cyber w-full font-mono text-xs" />
    </div>
  );
}

/* Étape 3 : tableau de bord stratégie (nutrition + plan + sauvegarde/IA) */
export default function StepStrategy(props) {
  const { form, legs, strategy, strategyBusy, strategyError, onComputeStrategy, profile, trainingPlan, summary, summaryLoading } = props;
  const [view, setView] = useState('nutrition');
  return (
    <section className="space-y-4">
      <StepHeader
        step={3}
        title="Stratégie & suivi"
        text="Nutrition, plan d’entraînement et suivi IA sont calculés automatiquement. Il ne reste qu’à sauvegarder."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NutritionCard strategy={strategy} busy={strategyBusy} error={strategyError} onCompute={onComputeStrategy} profile={profile} />
        <PlanCard plan={trainingPlan} summary={summary} summaryLoading={summaryLoading} />
        <SaveCard {...props} />
      </div>

      <div role="tablist" aria-label="Détail de la stratégie" className="inline-flex flex-wrap rounded-xl p-1 gap-1" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
        {VIEWS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            onClick={() => setView(item.id)}
            className="min-h-9 px-4 rounded-lg text-sm font-semibold transition-colors"
            style={view === item.id ? { background: 'var(--accent-blue)', color: '#fff' } : { color: 'var(--text-secondary)' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {view === 'nutrition' && <NutritionView form={form} legs={legs} strategy={strategy} profile={profile} />}
        {view === 'plan' && <PlanView plan={trainingPlan} />}
        {view === 'prompt' && <PromptView prompt={props.prompt} />}
      </div>
    </section>
  );
}
