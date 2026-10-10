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
  DEFAULT_FORM, STEPS, buildLegPlan, buildRaceInput, buildTriathlonPlans, describeGpx, formFromRace,
  formatMinutes, summarizeRacePlan, totalTargetMinutes, totalTriathlonKm,
} from '../components/race-wizard/raceModel';
import { StepCourse, StepGpx, StepObjective } from '../components/race-wizard/steps';
import StepNutrition from '../components/race-wizard/StepNutrition';
import StepTraining from '../components/race-wizard/StepTraining';
import StepSave from '../components/race-wizard/StepSave';

const SPORT_LABELS = { running: 'Course à pied', cycling: 'Cyclisme', swimming: 'Natation', triathlon: 'Triathlon' };

const clampStep = value => Math.min(6, Math.max(1, Number(value) || 1));

const targetFromMinutes = minutes => (minutes > 0
  ? { targetHours: Math.floor(minutes / 60), targetMinutes: Math.round(minutes % 60) }
  : {});

function MyRaces({ races, loading, activeId, onOpen, onDelete, onNew }) {
  return (
    <section className="glass-panel p-5 sm:p-6 space-y-4" aria-label="Mes courses">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Mes courses</p>
          <h2 className="text-xl mt-1">Stratégies enregistrées</h2>
        </div>
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={onNew}>
          <Plus size={16} />Nouvelle course
        </button>
      </div>
      {loading && <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" />Chargement…</p>}
      {!loading && races.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune course enregistrée. Prépare ta première ci-dessous puis sauvegarde-la à l’étape 6.</p>
      )}
      {races.length > 0 && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {races.map(race => {
            const active = String(race.id) === String(activeId);
            return (
              <li
                key={race.id}
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ background: 'var(--surface-subtle)', border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--glass-border)'}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="flex items-center gap-2"><Flag size={14} />{race.name}</strong>
                  {active && <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--accent-blue)' }}>Ouverte</span>}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {SPORT_LABELS[race.sport] || race.sport}
                  {race.raceDate ? ` · ${new Date(`${race.raceDate}T12:00:00`).toLocaleDateString('fr-FR')}` : ''}
                  {race.distanceKm ? ` · ${Number(race.distanceKm).toFixed(1)} km` : ''}
                  {race.targetMinutes ? ` · ${formatMinutes(Number(race.targetMinutes))}` : ''}
                </p>
                <div className="flex gap-2 mt-auto pt-1">
                  <button type="button" className="btn-ghost text-sm inline-flex items-center gap-1" onClick={() => onOpen(race.id)} aria-label={`Reprendre ${race.name}`}>
                    <RotateCcw size={14} />Reprendre
                  </button>
                  <button type="button" className="btn-ghost text-sm inline-flex items-center gap-1" onClick={() => onDelete(race)} aria-label={`Supprimer ${race.name}`}>
                    <Trash2 size={14} />Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stepper({ step, onGo }) {
  return (
    <nav aria-label="Étapes de la préparation" className="glass-panel p-1.5 grid grid-cols-3 md:grid-cols-6 gap-1.5 sticky top-2 z-[500]">
      {STEPS.map(item => {
        const active = item.id === step;
        const done = item.id < step;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onGo(item.id)}
            aria-current={active ? 'step' : undefined}
            className="flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs sm:text-sm font-bold transition-colors"
            style={{ background: active ? 'var(--accent-blue)' : 'transparent', color: active ? '#fff' : 'var(--text-primary)' }}
          >
            <span
              className="w-5 h-5 rounded-full grid place-items-center text-[11px] shrink-0"
              style={{ background: active ? 'rgba(255,255,255,.25)' : done ? '#788c5d' : 'var(--surface-subtle)', color: done && !active ? '#fff' : 'inherit' }}
            >
              {done ? <Check size={12} /> : item.id}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
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
  const [gpxError, setGpxError] = useState('');

  const [races, setRaces] = useState([]);
  const [racesLoading, setRacesLoading] = useState(true);
  const [loadedId, setLoadedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

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
      .catch(() => setSummaryError('Historique Strava indisponible : plan basé sur des valeurs prudentes.'))
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
    setGpxError('');
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
    setGpxError('');
    setPlanner({
      gpx,
      stations: suggested?.stations || [],
      sections: suggested?.sections || [],
      startTime: '08:00',
      fatiguePercent: 4,
    });
    applyCourseInfo(info);
    goTo(2);
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

  const prompt = useMemo(() => {
    if (step !== 6) return '';
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
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>GPX → objectif → parcours → nutrition → plan → suivi IA</p>
        <h1 className="text-4xl sm:text-5xl font-black mt-2">Préparer une course</h1>
        <p className="mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
          Importe ton tracé, place tes ravitos et tes allures, calcule ta nutrition puis ton plan semaine par semaine.
          Sauvegarde ta stratégie pour la retrouver et la confier à Claude ou ChatGPT. Plan indicatif : adapte-le avec un coach en cas de blessure.
        </p>
      </header>

      <MyRaces races={races} loading={racesLoading} activeId={loadedId} onOpen={id => setParams({ course: id, etape: 3 })} onDelete={removeRace} onNew={startNew} />

      <Stepper step={step} onGo={goTo} />

      {step === 1 && (
        <StepGpx form={form} chooseSport={chooseSport} onGpxLoaded={onGpxLoaded} onManual={() => goTo(2)} gpxInfo={gpxInfo} error={gpxError} />
      )}
      {step === 2 && <StepObjective form={form} update={update} chooseFormat={chooseFormat} />}
      {step === 3 && (
        <StepCourse
          form={form}
          planner={planner}
          setPlanner={setPlanner}
          onCourseLoaded={applyCourseInfo}
          onLegLoaded={handleTriathlonLeg}
          targetMinutes={targetMinutes}
        />
      )}
      {step === 4 && <StepNutrition form={form} legs={legs} strategy={strategy} onStrategy={setStrategy} profile={profile} />}
      {step === 5 && <StepTraining plan={trainingPlan} summary={summary} summaryLoading={summaryLoading} summaryError={summaryError} />}
      {step === 6 && <StepSave canSave={canSave} onSave={save} saving={saving} saveError={saveError} savedRace={loadedId} prompt={prompt} />}

      <div className="flex justify-between gap-3">
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => goTo(step - 1)} disabled={step === 1}>
          <ChevronLeft size={16} />Précédent
        </button>
        {step < 6 && (
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => goTo(step + 1)}>
            {STEPS[step].label}<ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
