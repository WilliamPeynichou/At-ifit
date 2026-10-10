import React from 'react';
import { AlertTriangle, Check, Mountain } from 'lucide-react';
import CoursePlanner from '../course-planner/CoursePlanner';
import TriathlonPlanner from '../course-planner/TriathlonPlanner';
import { GpxDropzone } from '../course-planner/GpxDropzone';
import { SPORTS, TRIATHLON_FORMATS, formatMinutes, totalTargetMinutes, totalTriathlonKm } from './raceModel';

export const cardStyle = { background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' };
const LABEL = 'text-xs font-bold uppercase';

export function Field({ children, className = '' }) {
  return <label className={`${LABEL} ${className}`}>{children}</label>;
}

export function StepHeader({ step, title, text }) {
  return (
    <div className="mb-5">
      <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Étape {step}</p>
      <h2 className="text-2xl sm:text-3xl mt-1">{title}</h2>
      {text && <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>{text}</p>}
    </div>
  );
}

function SportChooser({ sport, onChoose }) {
  return (
    <div>
      <p className={`${LABEL} mb-2`}>Discipline</p>
      <div className="flex flex-wrap gap-2">
        {SPORTS.map(item => (
          <button
            type="button"
            key={item.id}
            onClick={() => onChoose(item)}
            aria-pressed={sport === item.id}
            className="px-4 py-2.5 rounded-lg font-bold text-sm"
            style={{
              background: sport === item.id ? 'var(--accent-blue)' : 'var(--surface-subtle)',
              color: sport === item.id ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Étape 1 : discipline + GPX en premier, ou saisie manuelle */
export function StepGpx({ form, chooseSport, onGpxLoaded, onManual, gpxInfo, error }) {
  const isTriathlon = form.sport === 'triathlon';
  const noTrack = form.sport === 'swimming';
  return (
    <section className="glass-panel p-5 sm:p-6 space-y-5">
      <StepHeader
        step={1}
        title="Ton tracé GPX"
        text="Commence par le GPX de la course : distance, dénivelé et temps estimé sont pré-remplis. Pas de GPX ou natation ? Passe en saisie manuelle."
      />
      <SportChooser sport={form.sport} onChoose={chooseSport} />
      {isTriathlon && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Un triathlon a un tracé par discipline : vélo et course se chargent à l’étape 3.
        </p>
      )}
      {!isTriathlon && !noTrack && (
        <>
          <GpxDropzone sport={form.sport === 'cycling' ? 'cycling' : 'running'} onLoaded={onGpxLoaded} />
          {gpxInfo && (
            <div className="rounded-xl p-4 flex flex-wrap gap-x-6 gap-y-2 items-center" style={cardStyle}>
              <Check size={18} style={{ color: '#788c5d' }} />
              <strong>{gpxInfo.name || 'Tracé importé'}</strong>
              <span className="text-sm">{gpxInfo.distanceKm} km</span>
              <span className="text-sm flex items-center gap-1"><Mountain size={14} />+{gpxInfo.elevationGainM} m</span>
            </div>
          )}
        </>
      )}
      {error && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}
      <button type="button" onClick={onManual} className="btn-ghost">
        {noTrack ? 'Natation : continuer en saisie manuelle' : 'Pas de GPX : continuer en saisie manuelle'}
      </button>
    </section>
  );
}

/* Étape 2 : objectif */
export function StepObjective({ form, update, chooseFormat }) {
  const isTriathlon = form.sport === 'triathlon';
  return (
    <section className="glass-panel p-5 sm:p-6 space-y-6">
      <StepHeader step={2} title="Ton objectif" text="Nom, date, lieu et temps visé. Les champs pré-remplis depuis le GPX restent modifiables." />

      {isTriathlon && (
        <div className="rounded-xl p-4 space-y-4" style={cardStyle}>
          <div>
            <p className={`${LABEL} mb-2`}>Format</p>
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
            <Field>Natation (km)<input required className="input-cyber mt-2" type="number" min="0.1" max="50" step="0.1" name="swimmingDistanceKm" value={form.swimmingDistanceKm} onChange={update} /></Field>
            <Field>Vélo (km)<input required className="input-cyber mt-2" type="number" min="1" max="1000" step="0.1" name="cyclingDistanceKm" value={form.cyclingDistanceKm} onChange={update} /></Field>
            <Field>D+ vélo (m)<input className="input-cyber mt-2" type="number" min="0" max="20000" step="10" name="cyclingElevationGainM" value={form.cyclingElevationGainM} onChange={update} /></Field>
            <Field>Course (km)<input required className="input-cyber mt-2" type="number" min="1" max="250" step="0.1" name="runningDistanceKm" value={form.runningDistanceKm} onChange={update} /></Field>
            <Field>D+ course (m)<input className="input-cyber mt-2" type="number" min="0" max="10000" step="10" name="runningElevationGainM" value={form.runningElevationGainM} onChange={update} /></Field>
            <Field>Transitions T1 + T2 (min)<input required className="input-cyber mt-2" type="number" min="0" max="180" name="transitionMinutes" value={form.transitionMinutes} onChange={update} /></Field>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total : {totalTriathlonKm(form).toFixed(1)} km enchaînés, transitions comprises.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field>Nom de la course<input required className="input-cyber mt-2" name="raceName" value={form.raceName} onChange={update} placeholder={isTriathlon ? 'Ironman Nice' : 'Marathon de Paris'} /></Field>
        <Field>Date<input className="input-cyber mt-2" type="date" name="date" value={form.date} onChange={update} /></Field>
        <Field>Lieu<input className="input-cyber mt-2" name="locationLabel" value={form.locationLabel} onChange={update} placeholder="Annecy, France" /></Field>
        <Field>Séances / semaine<input className="input-cyber mt-2" type="number" min="2" max="7" name="sessionsPerWeek" value={form.sessionsPerWeek} onChange={update} /></Field>
      </div>
      {!isTriathlon && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field>Distance (km)<input required className="input-cyber mt-2" type="number" min="0.1" step="0.001" name="distanceKm" value={form.distanceKm} onChange={update} /></Field>
          <Field>D+ (m)<input className="input-cyber mt-2" type="number" min="0" name="elevationGainM" value={form.elevationGainM} onChange={update} /></Field>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>Objectif heures<input required className="input-cyber mt-2" type="number" min="0" max="99" name="targetHours" value={form.targetHours} onChange={update} /></Field>
        <Field>Minutes<input required className="input-cyber mt-2" type="number" min="0" max="59" name="targetMinutes" value={form.targetMinutes} onChange={update} /></Field>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Temps visé : <strong>{formatMinutes(totalTargetMinutes(form))}</strong></p>
    </section>
  );
}

/* Étape 3 : parcours & ravitos (planificateur GPX contrôlé) */
export function StepCourse({ form, planner, setPlanner, onCourseLoaded, onLegLoaded, targetMinutes }) {
  if (form.sport === 'triathlon') {
    return (
      <TriathlonPlanner
        form={form}
        targetMinutes={targetMinutes}
        value={planner}
        onChange={setPlanner}
        onLegLoaded={onLegLoaded}
        showAidPlan={false}
      />
    );
  }
  if (form.sport === 'swimming') {
    return (
      <section className="glass-panel p-5 sm:p-6">
        <StepHeader step={3} title="Parcours & ravitos" text="La natation se fait en bassin ou en eau libre : pas de tracé à planifier, les ravitos ne s’appliquent pas." />
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <StepHeader step={3} title="Parcours & ravitos" text="Ajuste les ravitaillements, les sections à allure imposée et le départ. La nutrition du jour J sera calculée à l’étape suivante." />
      <CoursePlanner
        sport={form.sport === 'cycling' ? 'cycling' : 'running'}
        raceName={form.raceName}
        targetMinutes={targetMinutes}
        value={planner}
        onChange={setPlanner}
        onCourseLoaded={onCourseLoaded}
        showAidPlan={false}
      />
    </section>
  );
}
