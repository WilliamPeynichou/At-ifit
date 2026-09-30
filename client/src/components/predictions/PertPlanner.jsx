import React, { useState } from 'react';
import { calculatePert, formatMinutes } from '../../utils/pert';

const empty = name => ({ name, optimistic: '', likely: '', pessimistic: '' });
const presets = {
  course: ['Course', 'Arrêts / ravitaillements'],
  triathlon: ['Natation', 'Transition T1', 'Vélo', 'Transition T2', 'Course à pied', 'Arrêts / ravitaillements'],
};
const surface = { background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' };

export default function PertPlanner() {
  const [sport, setSport] = useState('course');
  // Keep drafts per sport; switching never destroys a filled form.
  const [drafts, setDrafts] = useState({ course: presets.course.map(empty), triathlon: presets.triathlon.map(empty) });
  const [goal, setGoal] = useState('');
  const stages = drafts[sport];
  const result = calculatePert(stages);
  const change = (index, key, value) => setDrafts(previous => ({ ...previous,
    [sport]: previous[sport].map((s, i) => i === index ? { ...s, [key]: value } : s) }));
  const validGoal = goal !== '' && Number.isFinite(Number(goal)) && Number(goal) > 0;

  return (
    <section className="glass-panel p-5 sm:p-6" aria-labelledby="pert-title">
      <h2 id="pert-title" className="text-2xl">Planifier mes scénarios · PERT</h2>
      <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Saisis trois scénarios en minutes, arrêts et transitions compris. O = optimiste, M = probable, P = pessimiste. Temps attendu = (O + 4 × M + P) / 6.</p>
      <fieldset className="mt-5">
        <legend className="font-semibold mb-2">Format de course</legend>
        <div className="flex flex-wrap gap-4">
          {[['course', 'Course simple'], ['triathlon', 'Triathlon']].map(([value, label]) => (
            <label key={value} className="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="pert-sport" value={value} checked={sport === value} onChange={() => setSport(value)} />{label}</label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 space-y-3">
        {stages.map((stage, index) => (
          <fieldset key={`${sport}-${stage.name}`} className="rounded-xl p-4 min-w-0" style={surface}>
            <legend className="px-2 font-semibold">{stage.name}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[['optimistic', 'Optimiste'], ['likely', 'Probable'], ['pessimistic', 'Pessimiste']].map(([key, label]) => (
                <label key={key} className="min-w-0 text-sm">{label} (min)
                  <input aria-label={`${stage.name} — ${label} (min)`} type="number" inputMode="decimal" min="0" max="10080" step="0.1" value={stage[key]} onChange={e => change(index, key, e.target.value)} className="block w-full min-w-0 rounded-lg p-3 mt-1 focus-visible:outline focus-visible:outline-2" style={surface} />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <label className="block mt-5 text-sm">Objectif total en minutes (optionnel)
        <input type="number" inputMode="decimal" min="0.1" step="0.1" value={goal} onChange={e => setGoal(e.target.value)} className="block w-full sm:max-w-xs rounded-lg p-3 mt-1" style={surface} />
      </label>
      <div className="mt-5 rounded-xl p-4" style={surface} aria-live="polite" aria-atomic="true">
        {result.error ? <p>{result.error}</p> : <>
          <p className="text-sm">Temps total attendu selon tes scénarios</p>
          <p className="text-3xl font-bold mt-1">{formatMinutes(result.expected)}</p>
          <p className="text-sm mt-2">Scénario tout optimiste : {formatMinutes(result.optimistic)} · tout pessimiste : {formatMinutes(result.pessimistic)}.</p>
          <ul className="text-sm mt-3 space-y-1">{result.stages.map(s => <li key={s.name}>{s.name} : {formatMinutes(s.expected)}</li>)}</ul>
          {validGoal && <p className="text-sm mt-3">{result.expected <= Number(goal) ? `Marge prévue : ${formatMinutes(Number(goal) - result.expected)} sous l’objectif.` : `Écart prévu : ${formatMinutes(result.expected - Number(goal))} au-dessus de l’objectif.`} Ce calcul ne donne pas une probabilité de réussite.</p>}
        </>}
      </div>
      <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>Outil de planification manuel, pas prédiction ML. Les bornes sont tes scénarios, pas un intervalle de confiance. Météo et fatigue peuvent affecter plusieurs étapes ensemble ; aucune variance totale calculée sous hypothèse d’indépendance. Ne recopie pas automatiquement les bornes ML dans ces champs.</p>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Saisie conservée uniquement tant que cette page reste ouverte ; aucun enregistrement serveur.</p>
    </section>
  );
}
