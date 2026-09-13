import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bike, CalendarDays, Check, ChevronRight, Clock3, Flag, Loader2, PersonStanding, Target, Utensils, Waves } from 'lucide-react';
import api from '../api';
import { AUBINEAU_SOURCE, BASE_RULES, CARB_LOADING, RACE_PROTOCOLS } from '../data/nutritionKnowledge';

const SPORTS = [
  { id: 'running', label: 'Course à pied', distance: 42.195, dPlus: 300, hours: 4 },
  { id: 'cycling', label: 'Cyclisme', distance: 120, dPlus: 1500, hours: 5 },
  { id: 'swimming', label: 'Natation', distance: 3.8, dPlus: 0, hours: 1 },
  { id: 'triathlon', label: 'Triathlon', distance: 51.5, dPlus: 500, hours: 6 },
];

const TRIATHLON_FORMATS = [
  { id: 's', label: 'Format S', swim: 0.75, bike: 20, run: 5, transition: 5, hours: 1, minutes: 20 },
  { id: 'm', label: 'Format M', swim: 1.5, bike: 40, run: 10, transition: 8, hours: 2, minutes: 40 },
  { id: 'half', label: 'Half / 70.3', swim: 1.9, bike: 90, run: 21.1, transition: 10, hours: 5, minutes: 30 },
  { id: 'ironman', label: 'Ironman', swim: 3.8, bike: 180, run: 42.2, transition: 15, hours: 11, minutes: 0 },
];

const formatMinutes = value => (Number.isFinite(value)
  ? `${Math.floor(value / 60)} h ${String(Math.round(value % 60)).padStart(2, '0')}`
  : '—');

function deriveProtocol({ sport, distanceKm, elevationGainM, durationMinutes }) {
  if (sport === 'triathlon') return RACE_PROTOCOLS.find(item => item.id === 'triathlon');
  if (sport !== 'running') return null;
  const isTrail = Number(elevationGainM) >= 1000 || (durationMinutes && durationMinutes > 360);
  if (isTrail) return RACE_PROTOCOLS.find(item => item.id === (durationMinutes > 360 ? 'trail-long' : 'trail-court'));
  return RACE_PROTOCOLS.find(item => item.id === (Number(distanceKm) >= 30 ? 'marathon' : 'semi'));
}

function buildPhases(weeks) {
  const total = Math.max(1, weeks);
  const base = Math.max(1, Math.round(total * 0.35));
  const specific = Math.max(1, Math.round(total * 0.4));
  const peak = Math.max(1, total - base - specific - 1);
  return [
    { title: 'Socle', weeks: base, focus: 'Endurance facile, régularité, technique et renforcement.' },
    { title: 'Spécifique', weeks: specific, focus: 'Allure objectif, ravitaillement et terrain proche course.' },
    { title: 'Pic', weeks: peak, focus: 'Séance clé contrôlée, répétition générale, matériel complet.' },
    { title: 'Affûtage', weeks: Math.max(1, total - base - specific - peak), focus: 'Volume réduit, intensité entretenue, sommeil prioritaire.' },
  ];
}

export default function RacePreparation() {
  const [form, setForm] = useState({
    sport: 'running',
    raceName: '',
    date: '',
    distanceKm: 42.195,
    elevationGainM: 300,
    targetHours: 4,
    targetMinutes: 0,
    sessions: 4,
    locationLabel: '',
    nutrition: true,
    gutTolerance: 'medium',
    sweatSodiumProfile: 'normal',
    triathlonFormat: 'm',
    swimmingDistanceKm: 1.5,
    cyclingDistanceKm: 40,
    cyclingElevationGainM: 400,
    runningDistanceKm: 10,
    runningElevationGainM: 80,
    transitionMinutes: 8,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTriathlon = form.sport === 'triathlon';
  const raceDate = form.date ? new Date(`${form.date}T09:00:00`) : null;
  const weeks = raceDate && raceDate > new Date() ? Math.max(1, Math.ceil((raceDate - new Date()) / 604800000)) : 0;
  const targetTotalMinutes = Number(form.targetHours) * 60 + Number(form.targetMinutes);
  const phases = useMemo(() => buildPhases(weeks || 8), [weeks]);
  const totalTriathlonKm = Number(form.swimmingDistanceKm) + Number(form.cyclingDistanceKm) + Number(form.runningDistanceKm);
  const targetPace = form.sport === 'running' && Number(form.distanceKm) > 0 ? targetTotalMinutes / Number(form.distanceKm) : null;
  const targetSpeed = form.sport === 'cycling' && targetTotalMinutes > 0 ? Number(form.distanceKm) / (targetTotalMinutes / 60) : null;

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const chooseSport = sport => setForm(current => ({
    ...current,
    sport: sport.id,
    distanceKm: sport.distance,
    elevationGainM: sport.dPlus,
    targetHours: sport.hours,
    targetMinutes: 0,
  }));

  const chooseFormat = preset => setForm(current => ({
    ...current,
    triathlonFormat: preset.id,
    swimmingDistanceKm: preset.swim,
    cyclingDistanceKm: preset.bike,
    runningDistanceKm: preset.run,
    transitionMinutes: preset.transition,
    targetHours: preset.hours,
    targetMinutes: preset.minutes,
  }));

  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const effort = isTriathlon
        ? {
          swimmingDistanceKm: Number(form.swimmingDistanceKm),
          cyclingDistanceKm: Number(form.cyclingDistanceKm),
          cyclingElevationGainM: Number(form.cyclingElevationGainM) || 0,
          runningDistanceKm: Number(form.runningDistanceKm),
          runningElevationGainM: Number(form.runningElevationGainM) || 0,
          transitionMinutes: Number(form.transitionMinutes) || 0,
        }
        : { distanceKm: Number(form.distanceKm), elevationGainM: Number(form.elevationGainM) || 0 };

      const response = await api.post('/nutrition/effort/preview', {
        sport: form.sport,
        ...effort,
        plannedStartAt: raceDate?.toISOString(),
        locationLabel: form.locationLabel || null,
        objectiveText: `Objectif ${form.raceName || 'course'} en ${formatMinutes(targetTotalMinutes)}, ${form.sessions} séances par semaine.`,
        nutritionProfile: { gutTolerance: form.gutTolerance, sweatSodiumProfile: form.sweatSodiumProfile },
      });
      setResult(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de construire la préparation.');
    } finally {
      setLoading(false);
    }
  };

  const predicted = result?.effort?.estimatedDurationMinutes?.target;
  const gap = Number.isFinite(predicted) ? targetTotalMinutes - predicted : null;
  const legs = result?.effort?.legs;
  const protocol = deriveProtocol({
    sport: form.sport,
    distanceKm: isTriathlon ? totalTriathlonKm : form.distanceKm,
    elevationGainM: form.elevationGainM,
    durationMinutes: predicted || targetTotalMinutes,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-7">
      <header>
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Objectif → plan → exécution</p>
        <h1 className="text-4xl sm:text-5xl font-black mt-2">Préparer une course</h1>
        <p className="mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
          Compare ton objectif à ton historique Strava, structure les semaines clés et ajoute une stratégie nutritionnelle
          adaptée. Plan indicatif : adapte la charge avec un coach en cas de blessure ou de reprise.
        </p>
      </header>

      <form onSubmit={submit} className="glass-panel p-5 sm:p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Discipline</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map(sport => (
              <button
                type="button"
                key={sport.id}
                onClick={() => chooseSport(sport)}
                aria-pressed={form.sport === sport.id}
                className="px-4 py-2.5 rounded-lg font-bold text-sm"
                style={{
                  background: form.sport === sport.id ? 'var(--accent-blue)' : 'var(--surface-subtle)',
                  color: form.sport === sport.id ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {sport.label}
              </button>
            ))}
          </div>
        </div>

        {isTriathlon && (
          <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Format</label>
              <div className="flex flex-wrap gap-2">
                {TRIATHLON_FORMATS.map(preset => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => chooseFormat(preset)}
                    aria-pressed={form.triathlonFormat === preset.id}
                    className="px-3 py-2 rounded-lg text-sm font-bold"
                    style={{
                      background: form.triathlonFormat === preset.id ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: form.triathlonFormat === preset.id ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="text-xs font-bold uppercase">Natation (km)<input required className="input-cyber mt-2" type="number" min="0.1" max="50" step="0.1" name="swimmingDistanceKm" value={form.swimmingDistanceKm} onChange={update} /></label>
              <label className="text-xs font-bold uppercase">Vélo (km)<input required className="input-cyber mt-2" type="number" min="1" max="1000" step="0.1" name="cyclingDistanceKm" value={form.cyclingDistanceKm} onChange={update} /></label>
              <label className="text-xs font-bold uppercase">D+ vélo (m)<input className="input-cyber mt-2" type="number" min="0" max="20000" step="10" name="cyclingElevationGainM" value={form.cyclingElevationGainM} onChange={update} /></label>
              <label className="text-xs font-bold uppercase">Course (km)<input required className="input-cyber mt-2" type="number" min="1" max="250" step="0.1" name="runningDistanceKm" value={form.runningDistanceKm} onChange={update} /></label>
              <label className="text-xs font-bold uppercase">D+ course (m)<input className="input-cyber mt-2" type="number" min="0" max="10000" step="10" name="runningElevationGainM" value={form.runningElevationGainM} onChange={update} /></label>
              <label className="text-xs font-bold uppercase">Transitions T1 + T2 (min)<input required className="input-cyber mt-2" type="number" min="0" max="180" name="transitionMinutes" value={form.transitionMinutes} onChange={update} /></label>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total : {totalTriathlonKm.toFixed(1)} km enchaînés, transitions comprises.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-xs font-bold uppercase">Nom course<input className="input-cyber mt-2" name="raceName" value={form.raceName} onChange={update} placeholder={isTriathlon ? 'Ironman Nice' : 'Marathon de Paris'} /></label>
          <label className="text-xs font-bold uppercase">Date<input required className="input-cyber mt-2" type="date" name="date" value={form.date} onChange={update} /></label>
          {!isTriathlon && <label className="text-xs font-bold uppercase">Distance (km)<input required className="input-cyber mt-2" type="number" min="0.1" step="0.1" name="distanceKm" value={form.distanceKm} onChange={update} /></label>}
          {!isTriathlon && <label className="text-xs font-bold uppercase">D+ (m)<input className="input-cyber mt-2" type="number" min="0" name="elevationGainM" value={form.elevationGainM} onChange={update} /></label>}
          <label className="text-xs font-bold uppercase">Lieu<input className="input-cyber mt-2" name="locationLabel" value={form.locationLabel} onChange={update} placeholder="Annecy, France" /></label>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-xs font-bold uppercase">Objectif heures<input required className="input-cyber mt-2" type="number" min="0" max="99" name="targetHours" value={form.targetHours} onChange={update} /></label>
          <label className="text-xs font-bold uppercase">Minutes<input required className="input-cyber mt-2" type="number" min="0" max="59" name="targetMinutes" value={form.targetMinutes} onChange={update} /></label>
          <label className="text-xs font-bold uppercase">Séances / semaine<input className="input-cyber mt-2" type="number" min="2" max="14" name="sessions" value={form.sessions} onChange={update} /></label>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)' }}>
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" checked={form.nutrition} onChange={e => setForm(c => ({ ...c, nutrition: e.target.checked }))} className="w-5 h-5" />
            Ajouter une stratégie nutritionnelle
          </label>
          {form.nutrition && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <label className="text-xs font-bold uppercase">Tolérance digestive
                <select className="input-cyber mt-2" name="gutTolerance" value={form.gutTolerance} onChange={update}>
                  <option value="low">Sensible</option>
                  <option value="medium">Normale</option>
                  <option value="high">Solide</option>
                  <option value="trained">Entraînée</option>
                </select>
              </label>
              <label className="text-xs font-bold uppercase">Profil sueur
                <select className="input-cyber mt-2" name="sweatSodiumProfile" value={form.sweatSodiumProfile} onChange={update}>
                  <option value="low">Peu salée</option>
                  <option value="normal">Normale</option>
                  <option value="salty">Très salée</option>
                </select>
              </label>
            </div>
          )}
        </div>

        {error && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}
        <button className="btn-primary flex items-center gap-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Flag size={18} />}
          {loading ? 'Analyse en cours…' : 'Construire mon plan'}
          <ChevronRight size={17} />
        </button>
      </form>

      {result && (
        <div className="space-y-6" aria-live="polite">
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CalendarDays, label: 'Temps disponible', value: `${weeks} semaines` },
              { icon: Target, label: 'Objectif', value: formatMinutes(targetTotalMinutes) },
              { icon: Clock3, label: 'Estimation Strava', value: formatMinutes(predicted) },
              { icon: Flag, label: 'Écart objectif', value: gap === null ? '—' : `${gap >= 0 ? '+' : ''}${Math.round(gap)} min` },
            ].map(item => (
              <article key={item.label} className="glass-card p-5">
                {React.createElement(item.icon, { size: 19, style: { color: 'var(--accent-blue)' } })}
                <p className="text-xs uppercase mt-3" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-2xl font-display mt-1">{item.value}</p>
              </article>
            ))}
          </section>

          {legs && (
            <section className="glass-panel p-5 sm:p-6">
              <h2 className="text-2xl mb-1">Découpage par discipline</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Transitions T1 + T2 : {formatMinutes(result.effort.transitionMinutes)}</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { key: 'swimming', label: 'Natation', icon: Waves },
                  { key: 'cycling', label: 'Vélo', icon: Bike },
                  { key: 'running', label: 'Course à pied', icon: PersonStanding },
                ].map(leg => (
                  <article key={leg.key} className="p-4 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
                    {React.createElement(leg.icon, { size: 18, style: { color: 'var(--accent-blue)' } })}
                    <p className="text-xs uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{leg.label}</p>
                    <p className="text-xl font-display mt-1">{formatMinutes(legs[leg.key]?.estimatedDurationMinutes?.target)}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{legs[leg.key]?.estimatedEnergyKcal?.target} kcal</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="glass-panel p-5 sm:p-6">
            <h2 className="text-2xl mb-1">Trajectoire de préparation</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {form.sessions} séances/semaine · {targetPace
                ? `allure cible ${Math.floor(targetPace)}:${String(Math.round((targetPace % 1) * 60)).padStart(2, '0')} min/km`
                : targetSpeed ? `vitesse cible ${targetSpeed.toFixed(1)} km/h`
                  : isTriathlon ? 'enchaînements et transitions travaillés' : 'objectif spécifique'}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {phases.map((phase, index) => (
                <article className="p-4 rounded-xl" key={phase.title} style={{ background: 'var(--surface-subtle)', borderTop: `3px solid ${index === 3 ? '#d97757' : 'var(--accent-blue)'}` }}>
                  <p className="font-mono text-xs">{phase.weeks} sem.</p>
                  <h3 className="text-lg my-2">{phase.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{phase.focus}</p>
                </article>
              ))}
            </div>
            <ul className="grid md:grid-cols-3 gap-3 mt-5 text-sm">
              {[
                '1 séance clé maximum à la fois',
                'Hausse de volume progressive, semaine allégée régulière',
                isTriathlon ? 'Enchaînements vélo-course pour répéter T2' : 'Répétition générale nutrition + matériel 2 à 4 semaines avant',
              ].map(item => <li className="flex gap-2" key={item}><Check size={17} style={{ color: '#788c5d', flexShrink: 0 }} />{item}</li>)}
            </ul>
          </section>

          {form.nutrition && (
            <section className="glass-panel p-5 sm:p-6" style={{ borderColor: '#788c5d' }}>
              <h2 className="text-2xl flex gap-2 items-center"><Utensils size={21} /> Stratégie jour J</h2>
              <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>Calculée selon la durée estimée, la météo disponible, ton poids et ton profil digestif.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  ['Glucides', `${result.during.carbohydratesGPerHour.target} g/h`],
                  ['Hydratation', `${result.during.fluidMlPerHour.target} ml/h`],
                  ['Sodium', `${result.during.sodiumMgPerHour.target} mg/h`],
                ].map(([label, value]) => (
                  <div className="p-4 rounded-xl" style={{ background: 'var(--surface-subtle)' }} key={label}>
                    <p className="text-xs uppercase">{label}</p>
                    <strong className="text-2xl">{value}</strong>
                  </div>
                ))}
              </div>
              <p className="text-sm mt-4">Fractionner toutes les {result.during.feedingIntervalMinutes} min. Tester la stratégie complète à l’entraînement, jamais pour la première fois le jour J.</p>
              {protocol && (
                <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <p className="font-mono text-xs uppercase mb-2" style={{ color: '#d97757' }}>Protocole {protocol.label} · d’après {AUBINEAU_SOURCE.author}</p>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <li>— {protocol.base}</li>
                    <li>— {protocol.rhythm}</li>
                    <li>— {protocol.avoid}</li>
                    <li>— {protocol.highlight}</li>
                  </ul>
                </div>
              )}
              <ul className="grid md:grid-cols-2 gap-2 mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {BASE_RULES.slice(0, 4).map(rule => <li key={rule}>· {rule}</li>)}
              </ul>
            </section>
          )}

          <section className="glass-panel p-5 sm:p-6">
            <h2 className="text-2xl mb-1">{CARB_LOADING.title}</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Dernière semaine avant {form.raceName || 'la course'}.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CARB_LOADING.steps.map(step => (
                <article key={step.phase} className="p-4 rounded-xl" style={{ background: 'var(--surface-subtle)', borderTop: '3px solid var(--accent-blue)' }}>
                  <p className="font-mono text-xs" style={{ color: 'var(--accent-blue)' }}>{step.phase}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{step.detail}</p>
                </article>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {CARB_LOADING.notes.map(note => <li key={note}>— {note}</li>)}
            </ul>
            <a href={AUBINEAU_SOURCE.url} target="_blank" rel="noreferrer" className="btn-ghost mt-5 inline-flex">Source : {AUBINEAU_SOURCE.author}</a>
          </section>
        </div>
      )}
    </div>
  );
}
