import React from 'react';
import { CalendarDays, Check, Flag, Mountain, Route, Target } from 'lucide-react';
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

/* Carte compacte réutilisable pour l'étape 1 */
export function MiniCard({ label, title, icon, children, className = '' }) {
  return (
    <div className={`glass-panel p-5 flex flex-col gap-4 ${className}`}>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[.2em] flex items-center gap-1.5" style={{ color: 'var(--accent-blue)' }}>
          {icon && React.createElement(icon, { size: 13, 'aria-hidden': true })}{label}
        </p>
        {title && <h3 className="text-lg mt-1">{title}</h3>}
      </div>
      {children}
    </div>
  );
}

function Choice({ active, onClick, children, sub }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="px-3 py-2.5 rounded-lg font-bold text-sm text-left transition-colors"
      style={{
        background: active ? 'var(--accent-blue)' : 'var(--surface-subtle)',
        color: active ? '#fff' : 'var(--text-primary)',
        border: '1px solid var(--glass-border)',
      }}
    >
      {children}
      {sub && <span className="block text-[11px] font-normal opacity-80">{sub}</span>}
    </button>
  );
}

function averagePace(form) {
  const minutes = totalTargetMinutes(form);
  const km = form.sport === 'triathlon' ? totalTriathlonKm(form) : Number(form.distanceKm);
  if (!(minutes > 0) || !(km > 0)) return null;
  if (form.sport === 'cycling' || form.sport === 'triathlon') return `${(km / (minutes / 60)).toFixed(1).replace('.', ',')} km/h de moyenne`;
  if (form.sport === 'swimming') {
    const per100 = minutes / (km * 10);
    return `${Math.floor(per100)}'${String(Math.round((per100 % 1) * 60)).padStart(2, '0')}" / 100 m`;
  }
  const pace = minutes / km;
  return `${Math.floor(pace)}'${String(Math.round((pace % 1) * 60)).padStart(2, '0')}" / km de moyenne`;
}

/* Étape 1 : discipline, GPX, infos et objectif sur un seul écran */
export function StepRace({ form, update, chooseSport, chooseFormat, onGpxLoaded, gpxInfo }) {
  const isTriathlon = form.sport === 'triathlon';
  const noTrack = form.sport === 'swimming';
  const pace = averagePace(form);
  return (
    <section className="space-y-4">
      <StepHeader
        step={1}
        title="Ta course"
        text="Discipline, tracé et objectif sur un seul écran. Le GPX est facultatif : il pré-remplit distance, dénivelé et temps estimé."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MiniCard label="Discipline" icon={Flag}>
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map(item => (
              <Choice key={item.id} active={form.sport === item.id} onClick={() => chooseSport(item)}>{item.label}</Choice>
            ))}
          </div>
          {isTriathlon && (
            <div>
              <p className={`${LABEL} mb-2`}>Format</p>
              <div className="grid grid-cols-2 gap-2">
                {TRIATHLON_FORMATS.map(preset => (
                  <Choice key={preset.id} active={form.triathlonFormat === preset.id} onClick={() => chooseFormat(preset)} sub={`${preset.swim} / ${preset.bike} / ${preset.run} km`}>
                    {preset.label}
                  </Choice>
                ))}
              </div>
            </div>
          )}
        </MiniCard>

        <MiniCard label="Tracé GPX" icon={Route}>
          {isTriathlon && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Un tracé par discipline : importe le vélo et la course à l’étape suivante.
            </p>
          )}
          {noTrack && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Pas de tracé en natation : renseigne simplement la distance et ton objectif.
            </p>
          )}
          {!isTriathlon && !noTrack && (gpxInfo ? (
            <div className="space-y-3">
              <div className="rounded-xl p-4 space-y-1" style={cardStyle}>
                <p className="flex items-center gap-2 font-bold"><Check size={16} style={{ color: '#788c5d' }} />{gpxInfo.name || 'Tracé importé'}</p>
                <p className="text-sm flex flex-wrap gap-x-4" style={{ color: 'var(--text-secondary)' }}>
                  <span>{gpxInfo.distanceKm} km</span>
                  <span className="inline-flex items-center gap-1"><Mountain size={13} />+{gpxInfo.elevationGainM} m</span>
                </p>
              </div>
              <GpxDropzone compact sport={form.sport === 'cycling' ? 'cycling' : 'running'} onLoaded={onGpxLoaded} />
            </div>
          ) : (
            <>
              <GpxDropzone sport={form.sport === 'cycling' ? 'cycling' : 'running'} onLoaded={onGpxLoaded} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pas de GPX ? Remplis la distance ci-dessous, tu pourras l’ajouter plus tard.</p>
            </>
          ))}
        </MiniCard>

        <MiniCard label="Infos course" icon={CalendarDays}>
          <Field>Nom<input required className="input-cyber mt-2" name="raceName" value={form.raceName} onChange={update} placeholder={isTriathlon ? 'Ironman Nice' : 'Marathon de Paris'} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>Date<input className="input-cyber mt-2" type="date" name="date" value={form.date} onChange={update} /></Field>
            <Field>Lieu<input className="input-cyber mt-2" name="locationLabel" value={form.locationLabel} onChange={update} placeholder="Annecy" /></Field>
          </div>
        </MiniCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MiniCard label={isTriathlon ? 'Distances par discipline' : 'Distance & dénivelé'} icon={Mountain} className="lg:col-span-2">
          {isTriathlon ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field>Natation (km)<input required className="input-cyber mt-2" type="number" min="0.1" max="50" step="0.1" name="swimmingDistanceKm" value={form.swimmingDistanceKm} onChange={update} /></Field>
                <Field>Vélo (km)<input required className="input-cyber mt-2" type="number" min="1" max="1000" step="0.1" name="cyclingDistanceKm" value={form.cyclingDistanceKm} onChange={update} /></Field>
                <Field>Course (km)<input required className="input-cyber mt-2" type="number" min="1" max="250" step="0.1" name="runningDistanceKm" value={form.runningDistanceKm} onChange={update} /></Field>
                <Field>D+ vélo (m)<input className="input-cyber mt-2" type="number" min="0" max="20000" step="10" name="cyclingElevationGainM" value={form.cyclingElevationGainM} onChange={update} /></Field>
                <Field>D+ course (m)<input className="input-cyber mt-2" type="number" min="0" max="10000" step="10" name="runningElevationGainM" value={form.runningElevationGainM} onChange={update} /></Field>
                <Field>T1 + T2 (min)<input required className="input-cyber mt-2" type="number" min="0" max="180" name="transitionMinutes" value={form.transitionMinutes} onChange={update} /></Field>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total : {totalTriathlonKm(form).toFixed(1)} km enchaînés.</p>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field>Distance (km)<input required className="input-cyber mt-2" type="number" min="0.1" step="0.001" name="distanceKm" value={form.distanceKm} onChange={update} /></Field>
              <Field>D+ (m)<input className="input-cyber mt-2" type="number" min="0" name="elevationGainM" value={form.elevationGainM} onChange={update} disabled={noTrack} /></Field>
            </div>
          )}
        </MiniCard>

        <MiniCard label="Objectif" icon={Target}>
          <div className="grid grid-cols-3 gap-3">
            <Field>Heures<input required className="input-cyber mt-2" type="number" min="0" max="99" name="targetHours" value={form.targetHours} onChange={update} /></Field>
            <Field>Min<input required className="input-cyber mt-2" type="number" min="0" max="59" name="targetMinutes" value={form.targetMinutes} onChange={update} /></Field>
            <Field>Séances/sem<input className="input-cyber mt-2" type="number" min="2" max="7" name="sessionsPerWeek" value={form.sessionsPerWeek} onChange={update} /></Field>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Temps visé <strong className="text-lg" style={{ color: 'var(--text-primary)' }}>{formatMinutes(totalTargetMinutes(form))}</strong>
            {pace && <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pace}</span>}
          </p>
        </MiniCard>
      </div>
    </section>
  );
}

/* Étape 2 : parcours & ravitos (planificateur GPX contrôlé) */
export function StepCourse({ form, planner, setPlanner, onCourseLoaded, onLegLoaded, targetMinutes }) {
  if (form.sport === 'triathlon') {
    return (
      <section className="space-y-4">
        <StepHeader step={2} title="Parcours & ravitos" text="Importe le tracé vélo et le tracé course : temps de passage, ravitos et sections s’enchaînent avec la natation et les transitions." />
        <TriathlonPlanner
        form={form}
        targetMinutes={targetMinutes}
        value={planner}
        onChange={setPlanner}
        onLegLoaded={onLegLoaded}
        showAidPlan={false}
        />
      </section>
    );
  }
  if (form.sport === 'swimming') {
    return (
      <section className="glass-panel p-5 sm:p-6">
        <StepHeader step={2} title="Parcours & ravitos" text="La natation se fait en bassin ou en eau libre : pas de tracé à planifier, les ravitos ne s’appliquent pas." />
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <StepHeader step={2} title="Parcours & ravitos" text="Clique sur le profil pour poser un ravito, glisse pour créer une section à allure imposée. La nutrition et le plan sont calculés à l’étape suivante." />
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
