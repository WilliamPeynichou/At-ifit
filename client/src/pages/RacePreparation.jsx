import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Flag, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createRace, deleteRace, getNutritionProfile, getRace, getTrainingSummary, listRaces, updateRace,
} from '../services/racesApi';
import { saveRaceContext } from '../utils/raceContext';
import { buildTrainingPlan } from '../utils/trainingPlan';
import { buildAiPrompt } from '../utils/aiPrompt';
import {
  DEFAULT_FORM, STEPS, buildEffortInput, buildLegPlan, buildRaceInput, buildTriathlonPlans, describeGpx, formFromRace,
  formatMinutes, summarizeRacePlan, totalTargetMinutes, totalTriathlonKm,
} from '../components/race-wizard/raceModel';
import { StepCourse, StepRace } from '../components/race-wizard/steps';
import StepStrategy from '../components/race-wizard/StepStrategy';
import { previewEffortStrategy } from '../services/nutritionApi';

const SPORT_LABELS = { running: 'Course à pied', cycling: 'Cyclisme', swimming: 'Natation', triathlon: 'Triathlon' };

const clampStep = value => Math.min(STEPS.length, Math.max(1, Number(value) || 1));

const targetFromMinutes = minutes => (minutes > 0
  ? { targetHours: Math.floor(minutes / 60), targetMinutes: Math.round(minutes % 60) }
  : {});

function MyRaces({ races, loading, activeId, onOpen, onDelete, onNew }) {
  if (loading) return null;
  if (races.length === 0) {
    return (
      <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <Flag size={14} />Tes courses sauvegardées apparaîtront ici pour revoir plan et stratégie.
      </p>
    );
  }
  return (
    <section aria-label="Mes courses" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Mes courses · {races.length}</p>
        {activeId && (
          <button type="button" className="text-sm inline-flex items-center gap-1 underline" style={{ color: 'var(--text-secondary)' }} onClick={onNew}>
            <Plus size={14} />Nouvelle course
          </button>
        )}
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {races.map(race => {
          const active = String(race.id) === String(activeId);
          return (
            <li
              key={race.id}
              className="glass-panel snap-start shrink-0 w-64 p-4 flex flex-col gap-2"
              style={{ borderColor: active ? 'var(--accent-blue)' : undefined, boxShadow: active ? '0 0 0 1px var(--accent-blue)' : undefined }}
            >
              <div className="flex items-start justify-between gap-2">
                <strong className="truncate">{race.name}</strong>
                {active && <span className="text-[10px] uppercase font-bold shrink-0" style={{ color: 'var(--accent-blue)' }}>Ouverte</span>}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {SPORT_LABELS[race.sport] || race.sport}
                {race.raceDate ? ` · ${new Date(`${race.raceDate}T12:00:00`).toLocaleDateString('fr-FR')}` : ''}
                {race.distanceKm ? ` · ${Number(race.distanceKm).toFixed(1)} km` : ''}
                {race.targetMinutes ? ` · ${formatMinutes(Number(race.targetMinutes))}` : ''}
              </p>
              <div className="flex gap-3 mt-auto text-sm">
                {!active && (
                  <button type="button" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-blue)' }} onClick={() => onOpen(race.id)} aria-label={`Reprendre ${race.name}`}>
                    <RotateCcw size={14} />Reprendre
                  </button>
                )}
                <button type="button" className="inline-flex items-center gap-1 ml-auto" style={{ color: 'var(--text-muted)' }} onClick={() => onDelete(race)} aria-label={`Supprimer ${race.name}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stepper({ step, onGo, recap }) {
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const current = STEPS[step - 1];
  return (
    <nav aria-label="Étapes de la préparation" className="glass-panel px-4 sm:px-6 py-4 sticky top-2 z-[500]">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-sm">
          <span className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--text-muted)' }}>Étape {step} / {STEPS.length}</span>
          <strong className="ml-2">{current.label}</strong>
        </p>
        {recap.length > 0 && (
          <p className="text-xs hidden sm:flex flex-wrap justify-end gap-1.5" aria-label="Résumé de la course">
            {recap.map(item => (
              <span key={item} className="px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>{item}</span>
            ))}
          </p>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-[9px] h-[2px] rounded" style={{ background: 'var(--glass-border)' }} aria-hidden="true" />
        <div className="absolute left-0 top-[9px] h-[2px] rounded transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--accent-blue)' }} aria-hidden="true" />
        <ol className="relative flex justify-between">
          {STEPS.map(item => {
            const active = item.id === step;
            const done = item.id < step;
            const dot = (
              <span
                className="w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold transition-colors"
                style={{
                  background: done || active ? 'var(--accent-blue)' : 'var(--bg-secondary, #fff)',
                  border: `2px solid ${done || active ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                  color: done || active ? '#fff' : 'var(--text-muted)',
                  boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--accent-blue) 20%, transparent)' : 'none',
                }}
              >
                {done ? <Check size={11} /> : item.id}
              </span>
            );
            const label = (
              <span className="hidden md:block text-[11px] mt-1.5 whitespace-nowrap" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 700 : 400 }}>
                {item.label}
              </span>
            );
            return (
              <li key={item.id} className="flex flex-col items-center" aria-current={active ? 'step' : undefined}>
                {done ? (
                  <button type="button" onClick={() => onGo(item.id)} className="flex flex-col items-center hover:opacity-80" title={`Revenir à : ${item.label}`} aria-label={`Revenir à l’étape ${item.id} : ${item.label}`}>
                    {dot}{label}
                  </button>
                ) : (<>{dot}{label}</>)}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export default function RacePreparation() {
  const { user } = useAuth() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const step = clampStep(searchParams.get('etape'));
  const raceId = searchParams.get('course');

  const [form, setForm] = useState(DEFAULT_FORM);
  const [planner, setPlanner] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [strategyFor, setStrategyFor] = useState(null);
  const [strategyBusy, setStrategyBusy] = useState(false);
  const [strategyError, setStrategyError] = useState('');

  const [races, setRaces] = useState([]);
  const [racesLoading, setRacesLoading] = useState(true);
  const [loadedId, setLoadedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const setParams = useCallback(patch => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  }, [setSearchParams]);

  const goTo = useCallback(target => {
    setParams({ etape: clampStep(target) });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [setParams]);

  const refreshRaces = useCallback(async () => {
    try {
      const list = await listRaces();
      setRaces(Array.isArray(list) ? list : []);
    } catch {
      setRaces([]);
    } finally {
      setRacesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRaces();
    getNutritionProfile().then(setProfile).catch(() => setProfile(null));
    getTrainingSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [refreshRaces]);

  // Reprise d'une course enregistrée via ?course=<id>
  useEffect(() => {
    if (!raceId || String(raceId) === String(loadedId)) return;
    let cancelled = false;
    getRace(raceId)
      .then(race => {
        if (cancelled || !race) return;
        setForm(formFromRace(race));
        setPlanner(race.planner || null);
        setStrategy(race.strategy || null);
        setStrategyFor(race.strategy ? JSON.stringify(buildEffortInput(formFromRace(race))) : null);
        setLoadedId(race.id);
        setSaveError('');
      })
      .catch(() => {
        if (!cancelled) setParams({ course: null });
      });
    return () => { cancelled = true; };
  }, [raceId, loadedId, setParams]);

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const chooseSport = sport => {
    if (sport.id === form.sport) return;
    setForm(current => ({
      ...current,
      sport: sport.id,
      distanceKm: sport.distance,
      elevationGainM: sport.dPlus,
      targetHours: sport.hours,
      targetMinutes: 0,
    }));
    setPlanner(null);
    setStrategy(null);
  };

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

  const applyCourseInfo = useCallback(info => setForm(current => ({
    ...current,
    raceName: current.raceName || info.name || '',
    distanceKm: info.distanceKm,
    elevationGainM: info.elevationGainM,
    ...targetFromMinutes(info.estimatedMinutes),
  })), []);

  const onGpxLoaded = ({ gpx, info, suggested }) => {
    setPlanner({
      gpx,
      stations: suggested?.stations || [],
      sections: suggested?.sections || [],
      startTime: '08:00',
      fatiguePercent: 4,
    });
    applyCourseInfo(info);
  };

  const handleTriathlonLeg = useCallback((leg, info) => setForm(current => ({
    ...current,
    raceName: current.raceName || info.name || '',
    ...(leg === 'cycling'
      ? { cyclingDistanceKm: info.distanceKm, cyclingElevationGainM: info.elevationGainM }
      : { runningDistanceKm: info.distanceKm, runningElevationGainM: info.elevationGainM }),
  })), []);

  const startNew = () => {
    setForm(DEFAULT_FORM);
    setPlanner(null);
    setStrategy(null);
    setStrategyFor(null);
    setLoadedId(null);
    setSaveError('');
    setParams({ course: null, etape: 1 });
  };

  const removeRace = async race => {
    if (!window.confirm(`Supprimer « ${race.name} » et sa stratégie ?`)) return;
    try {
      await deleteRace(race.id);
      if (String(race.id) === String(loadedId)) startNew();
      await refreshRaces();
    } catch {
      window.alert('Suppression impossible, réessaie plus tard.');
    }
  };

  const targetMinutes = totalTargetMinutes(form);
  const isTriathlon = form.sport === 'triathlon';
  const gpxInfo = !isTriathlon ? describeGpx(planner?.gpx) : null;

  const legs = useMemo(() => {
    if (form.sport === 'swimming') return [];
    if (isTriathlon) {
      const tri = buildTriathlonPlans(form, planner);
      return [
        tri.bike && { key: 'cycling', plan: tri.bike.plan },
        tri.run && { key: 'running', plan: tri.run.plan },
      ].filter(Boolean);
    }
    const leg = buildLegPlan(planner, { sport: form.sport === 'cycling' ? 'cycling' : 'running', targetMinutes });
    return leg ? [{ key: 'single', plan: leg.plan }] : [];
  }, [form, planner, isTriathlon, targetMinutes]);

  const trainingPlan = useMemo(() => buildTrainingPlan({
    sport: form.sport,
    raceDate: form.date || null,
    sessionsPerWeek: Number(form.sessionsPerWeek) || 4,
    targetMinutes,
    distanceKm: isTriathlon ? totalTriathlonKm(form) : Number(form.distanceKm),
    elevationGainM: isTriathlon
      ? (Number(form.cyclingElevationGainM) || 0) + (Number(form.runningElevationGainM) || 0)
      : Number(form.elevationGainM) || 0,
    summary,
  }), [form, targetMinutes, isTriathlon, summary]);

  const raceInput = useMemo(
    () => buildRaceInput({ form, planner, strategy, trainingPlan }),
    [form, planner, strategy, trainingPlan],
  );

  // Stratégie nutrition calculée automatiquement à l'étape 3, recalculée si la course change.
  const effortInput = useMemo(() => buildEffortInput(form), [form]);
  const effortKey = JSON.stringify(effortInput);
  const computeStrategy = useCallback(async () => {
    setStrategyBusy(true);
    setStrategyError('');
    try {
      setStrategy(await previewEffortStrategy(effortInput, profile || {}));
      setStrategyFor(effortKey);
    } catch (err) {
      setStrategyError(err.response?.data?.error || 'Impossible de calculer la stratégie nutrition.');
      setStrategyFor(effortKey);
    } finally {
      setStrategyBusy(false);
    }
  }, [effortInput, effortKey, profile]);

  useEffect(() => {
    if (step !== 3 || strategyBusy || strategyFor === effortKey) return;
    computeStrategy();
  }, [step, strategyBusy, strategyFor, effortKey, computeStrategy]);

  const prompt = useMemo(() => {
    if (step !== 3) return '';
    const passage = summarizeRacePlan(form, planner);
    return buildAiPrompt({
      race: raceInput,
      plan: passage.plan,
      stations: passage.stations,
      sections: passage.sections,
      strategy,
      trainingPlan,
      summary,
      nutritionProfile: profile,
      user,
    });
  }, [step, form, planner, raceInput, strategy, trainingPlan, summary, profile, user]);

  const canSave = Boolean(form.raceName.trim()) && targetMinutes > 0;
  const recap = [
    form.raceName.trim(),
    `${(isTriathlon ? totalTriathlonKm(form) : Number(form.distanceKm) || 0).toFixed(1).replace('.', ',')} km`,
    !isTriathlon && Number(form.elevationGainM) > 0 ? `+${form.elevationGainM} m` : null,
    targetMinutes > 0 ? formatMinutes(targetMinutes) : null,
    form.date ? new Date(`${form.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
  ].filter(Boolean);
  // Pas de parcours à planifier en natation : on saute l'étape 2.
  const skipCourse = form.sport === 'swimming';
  const nextStep = step === 1 && skipCourse ? 3 : step + 1;
  const prevStep = step === 3 && skipCourse ? 1 : step - 1;

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const saved = loadedId ? await updateRace(loadedId, raceInput) : await createRace(raceInput);
      setLoadedId(saved.id);
      setParams({ course: saved.id });
      saveRaceContext({
        raceName: form.raceName,
        sport: form.sport,
        plannedStartAt: form.date ? `${form.date}T09:00` : '',
        locationLabel: form.locationLabel,
        targetTotalMinutes: targetMinutes,
      });
      await refreshRaces();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Sauvegarde impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 lg:pb-10 space-y-7">
      <header>
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Course → parcours → stratégie</p>
        <h1 className="text-4xl sm:text-5xl font-black mt-2">Préparer une course</h1>
        <p className="mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
          Trois étapes : ta course, ton parcours, ta stratégie. Nutrition et plan d’entraînement se calculent tout seuls,
          tu sauvegardes et tu confies le suivi à Claude ou ChatGPT. Plan indicatif : adapte-le avec un coach en cas de blessure.
        </p>
      </header>

      <MyRaces races={races} loading={racesLoading} activeId={loadedId} onOpen={id => setParams({ course: id, etape: 3 })} onDelete={removeRace} onNew={startNew} />

      <Stepper step={step} onGo={goTo} recap={recap} />

      {step === 1 && (
        <StepRace form={form} update={update} chooseSport={chooseSport} chooseFormat={chooseFormat} onGpxLoaded={onGpxLoaded} gpxInfo={gpxInfo} />
      )}
      {step === 2 && (
        <StepCourse
          form={form}
          planner={planner}
          setPlanner={setPlanner}
          onCourseLoaded={applyCourseInfo}
          onLegLoaded={handleTriathlonLeg}
          targetMinutes={targetMinutes}
        />
      )}
      {step === 3 && (
        <StepStrategy
          form={form}
          legs={legs}
          strategy={strategy}
          strategyBusy={strategyBusy}
          strategyError={strategyError}
          onComputeStrategy={computeStrategy}
          profile={profile}
          trainingPlan={trainingPlan}
          summary={summary}
          summaryLoading={summaryLoading}
          canSave={canSave}
          onSave={save}
          saving={saving}
          saveError={saveError}
          savedRace={loadedId}
          prompt={prompt}
        />
      )}

      <div className="flex justify-between gap-3">
        {step > 1 ? (
          <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => goTo(prevStep)}>
            <ChevronLeft size={16} />Précédent
          </button>
        ) : <span />}
        {step < STEPS.length && (
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => goTo(nextStep)}>
            {STEPS[nextStep - 1].label}<ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
