import React, { useCallback, useMemo, useState } from 'react';
import { Bike, Flag, PersonStanding, Repeat, Waves } from 'lucide-react';
import CoursePlanner from './CoursePlanner';
import { formatClock, formatDuration, parseClock } from '../../utils/gpxCourse';

const SWIM_MIN_PER_KM = 22;

export function splitTarget({ targetMinutes, swimKm, bikeKm, bikeGainM, runKm, runGainM, transitionMinutes }) {
  const swim = swimKm * SWIM_MIN_PER_KM;
  const bikeWeight = (bikeKm / 30) * 60 * (1 + bikeGainM / 10000);
  const runWeight = runKm * 5.5 * (1 + runGainM / 2000);
  const remaining = Math.max(10, targetMinutes - swim - transitionMinutes);
  const bike = (remaining * bikeWeight) / (bikeWeight + runWeight || 1);
  return { swim, bike, run: remaining - bike };
}

export default function TriathlonPlanner({ form, targetMinutes, value, onChange, onLegLoaded, nutrition, showAidPlan = true }) {
  const start = value?.start || '08:00';
  const bikeValue = value?.bike ?? null;
  const runValue = value?.run ?? null;
  const [bikePlan, setBikePlan] = useState(null);
  const [runPlan, setRunPlan] = useState(null);

  const transitionMinutes = Number(form.transitionMinutes) || 0;
  const t1 = transitionMinutes / 2;
  const t2 = transitionMinutes - t1;
  const split = useMemo(() => splitTarget({
    targetMinutes,
    swimKm: Number(form.swimmingDistanceKm) || 0,
    bikeKm: Number(form.cyclingDistanceKm) || 0,
    bikeGainM: Number(form.cyclingElevationGainM) || 0,
    runKm: Number(form.runningDistanceKm) || 0,
    runGainM: Number(form.runningElevationGainM) || 0,
    transitionMinutes,
  }), [form, targetMinutes, transitionMinutes]);

  const startMin = parseClock(start);
  const bikeStart = startMin + split.swim + t1;
  const bikeDuration = bikePlan?.totalMinutes ?? split.bike;
  const runStart = bikeStart + bikeDuration + t2;
  const runDuration = runPlan?.totalMinutes ?? split.run;
  const finish = runStart + runDuration;
  const total = finish - startMin;
  const clock = minutes => formatClock(minutes).slice(0, 5);

  const patch = next => onChange?.({ start, bike: bikeValue, run: runValue, ...next });
  const changeStart = next => patch({ start: next });

  const onBike = useCallback(p => setBikePlan(p), []);
  const onRun = useCallback(p => setRunPlan(p), []);
  const onBikeLoaded = useCallback(info => onLegLoaded('cycling', info), [onLegLoaded]);
  const onRunLoaded = useCallback(info => onLegLoaded('running', info), [onLegLoaded]);

  const legs = [
    { icon: Waves, label: 'Natation', from: startMin, minutes: split.swim, hint: `${form.swimmingDistanceKm} km · base 2'12"/100 m` },
    { icon: Repeat, label: 'T1', from: startMin + split.swim, minutes: t1, transition: true },
    { icon: Bike, label: 'Vélo', from: bikeStart, minutes: bikeDuration, hint: bikePlan ? 'calculé sur le GPX' : 'estimation, importe le GPX' },
    { icon: Repeat, label: 'T2', from: bikeStart + bikeDuration, minutes: t2, transition: true },
    { icon: PersonStanding, label: 'Course', from: runStart, minutes: runDuration, hint: runPlan ? 'calculé sur le GPX' : 'estimation, importe le GPX' },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Triathlon · Enchaînement</p>
            <h2 className="text-2xl mt-1">Timeline de course</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Objectif réparti entre disciplines, puis recalculé sur les GPX vélo et course. Le départ de chaque discipline suit la précédente.
            </p>
          </div>
          <label className="text-xs font-bold uppercase">Départ natation
            <input type="time" className="input-cyber mt-1 w-28" value={start} onChange={e => changeStart(e.target.value)} />
          </label>
        </div>

        <div className="flex w-full h-3 rounded-full overflow-hidden mb-5" aria-hidden="true">
          {legs.map(leg => (
            <span key={leg.label} style={{ width: `${(leg.minutes / total) * 100}%`, background: leg.transition ? 'var(--text-muted)' : 'var(--accent-blue)', opacity: leg.transition ? 0.5 : 1, borderRight: '2px solid var(--bg-secondary)' }} />
          ))}
        </div>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {legs.map(leg => (
            <li key={leg.label} className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', opacity: leg.transition ? 0.85 : 1 }}>
              {React.createElement(leg.icon, { size: 17, style: { color: 'var(--accent-blue)' } })}
              <p className="text-xs uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{leg.label}</p>
              <p className="text-xl font-display">{formatDuration(leg.minutes)}</p>
              <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{clock(leg.from)} → {clock(leg.from + leg.minutes)}</p>
              {leg.hint && <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{leg.hint}</p>}
            </li>
          ))}
          <li className="rounded-xl p-4" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            <Flag size={17} />
            <p className="text-xs uppercase mt-2 opacity-80">Arrivée</p>
            <p className="text-xl font-display">{clock(finish)}</p>
            <p className="font-mono text-xs opacity-90">Total {formatDuration(total)}</p>
            <p className="text-[11px] mt-1 opacity-80">{Math.round(total - targetMinutes) >= 0 ? '+' : ''}{Math.round(total - targetMinutes)} min vs objectif</p>
          </li>
        </ol>
      </section>

      <CoursePlanner
        sport="cycling"
        legLabel="Vélo"
        raceName={form.raceName}
        targetMinutes={split.bike}
        value={bikeValue}
        onChange={next => patch({ bike: next })}
        fixedStartTime={clock(bikeStart)}
        onPlan={onBike}
        onCourseLoaded={onBikeLoaded}
        nutrition={nutrition}
        showAidPlan={showAidPlan}
      />
      <CoursePlanner
        sport="running"
        legLabel="Course à pied"
        raceName={form.raceName}
        targetMinutes={split.run}
        value={runValue}
        onChange={next => patch({ run: next })}
        fixedStartTime={clock(runStart)}
        onPlan={onRun}
        onCourseLoaded={onRunLoaded}
        nutrition={nutrition}
        showAidPlan={showAidPlan}
      />
    </div>
  );
}
