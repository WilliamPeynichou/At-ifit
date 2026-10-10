import { buildCourse, computePlan, formatClock, parseClock } from '../../utils/gpxCourse';
import { splitTarget } from '../course-planner/TriathlonPlanner';

export const SPORTS = [
  { id: 'running', label: 'Course à pied', distance: 42.195, dPlus: 300, hours: 4 },
  { id: 'cycling', label: 'Cyclisme', distance: 120, dPlus: 1500, hours: 5 },
  { id: 'swimming', label: 'Natation', distance: 3.8, dPlus: 0, hours: 1 },
  { id: 'triathlon', label: 'Triathlon', distance: 51.5, dPlus: 500, hours: 6 },
];

export const TRIATHLON_FORMATS = [
  { id: 's', label: 'Format S', swim: 0.75, bike: 20, run: 5, transition: 5, hours: 1, minutes: 20 },
  { id: 'm', label: 'Format M', swim: 1.5, bike: 40, run: 10, transition: 8, hours: 2, minutes: 40 },
  { id: 'half', label: 'Half / 70.3', swim: 1.9, bike: 90, run: 21.1, transition: 10, hours: 5, minutes: 30 },
  { id: 'ironman', label: 'Ironman', swim: 3.8, bike: 180, run: 42.2, transition: 15, hours: 11, minutes: 0 },
];

export const STEPS = [
  { id: 1, label: 'Import GPX' },
  { id: 2, label: 'Objectif' },
  { id: 3, label: 'Parcours & ravitos' },
  { id: 4, label: 'Nutrition course' },
  { id: 5, label: 'Plan d’entraînement' },
  { id: 6, label: 'Sauvegarde & IA' },
];

export const DEFAULT_FORM = {
  sport: 'running',
  raceName: '',
  date: '',
  locationLabel: '',
  distanceKm: 42.195,
  elevationGainM: 300,
  targetHours: 4,
  targetMinutes: 0,
  sessionsPerWeek: 4,
  triathlonFormat: 'm',
  swimmingDistanceKm: 1.5,
  cyclingDistanceKm: 40,
  cyclingElevationGainM: 400,
  runningDistanceKm: 10,
  runningElevationGainM: 80,
  transitionMinutes: 8,
};

const OBJECTIVE_KEYS = Object.keys(DEFAULT_FORM).filter(key => !['sport', 'raceName', 'date', 'locationLabel'].includes(key));

export const totalTargetMinutes = form => Number(form.targetHours) * 60 + Number(form.targetMinutes);

export const totalTriathlonKm = form => Number(form.swimmingDistanceKm) + Number(form.cyclingDistanceKm) + Number(form.runningDistanceKm);

const numberOrNull = value => {
  const number = Number(value);
  return value === '' || value === null || value === undefined || !Number.isFinite(number) ? null : number;
};

export const formatMinutes = value => (Number.isFinite(value)
  ? `${Math.floor(value / 60)} h ${String(Math.round(value % 60)).padStart(2, '0')}`
  : '—');

export function describeGpx(gpx) {
  if (!gpx?.points?.length) return null;
  try {
    const course = buildCourse(gpx.points, { waypoints: gpx.waypoints });
    return {
      name: gpx.name || gpx.fileName || '',
      distanceKm: Number(course.stats.distanceKm.toFixed(2)),
      elevationGainM: course.stats.gainM,
    };
  } catch {
    return null;
  }
}

export function raceDateTime(date) {
  return date ? new Date(`${date}T09:00:00`) : null;
}

/** Plan par discipline (course ou vélo) à partir du tracé et des réglages de la jambe. */
export function buildLegPlan(value, { sport, targetMinutes, startTime }) {
  if (!value?.gpx?.points?.length) return null;
  try {
    const course = buildCourse(value.gpx.points, { waypoints: value.gpx.waypoints });
    const plan = computePlan(course, {
      sport,
      targetMinutes,
      startTime: startTime || value.startTime || '08:00',
      sections: value.sections || [],
      aidStations: value.stations || [],
      fatiguePercent: Number(value.fatiguePercent ?? 4) || 0,
    });
    return { course, plan };
  } catch {
    return null;
  }
}

/** Répartition triathlon et plans vélo / course enchaînés (même logique que TriathlonPlanner). */
export function buildTriathlonPlans(form, planner) {
  const transition = Number(form.transitionMinutes) || 0;
  const t1 = transition / 2;
  const t2 = transition - t1;
  const split = splitTarget({
    targetMinutes: totalTargetMinutes(form),
    swimKm: Number(form.swimmingDistanceKm) || 0,
    bikeKm: Number(form.cyclingDistanceKm) || 0,
    bikeGainM: Number(form.cyclingElevationGainM) || 0,
    runKm: Number(form.runningDistanceKm) || 0,
    runGainM: Number(form.runningElevationGainM) || 0,
    transitionMinutes: transition,
  });
  const startMin = parseClock(planner?.start || '08:00');
  const bikeStart = startMin + split.swim + t1;
  const bike = buildLegPlan(planner?.bike, { sport: 'cycling', targetMinutes: split.bike, startTime: formatClock(bikeStart).slice(0, 5) });
  const runStart = bikeStart + (bike?.plan.totalMinutes ?? split.bike) + t2;
  const run = buildLegPlan(planner?.run, { sport: 'running', targetMinutes: split.run, startTime: formatClock(runStart).slice(0, 5) });
  const finish = runStart + (run?.plan.totalMinutes ?? split.run);
  return { split, startMin, bikeStart, runStart, finish, bike, run };
}

/** Plan unifié pour le prompt IA : un seul plan (course) ou enchaînement vélo + course. */
export function summarizeRacePlan(form, planner) {
  if (form.sport !== 'triathlon') {
    const leg = buildLegPlan(planner, { sport: form.sport === 'cycling' ? 'cycling' : 'running', targetMinutes: totalTargetMinutes(form) });
    if (!leg) return { plan: null, stations: [], sections: [] };
    return { plan: leg.plan, stations: leg.plan.stations, sections: leg.plan.sections };
  }
  const tri = buildTriathlonPlans(form, planner);
  if (!tri.bike && !tri.run) return { plan: null, stations: [], sections: [] };
  const stations = [
    ...(tri.bike?.plan.stations || []).map(s => ({ ...s, name: `Vélo · ${s.name}` })),
    ...(tri.run?.plan.stations || []).map(s => ({ ...s, name: `Course · ${s.name}` })),
  ];
  const sections = [
    ...(tri.bike?.plan.sections || []).map(s => ({ ...s, name: `Vélo · ${s.name}` })),
    ...(tri.run?.plan.sections || []).map(s => ({ ...s, name: `Course · ${s.name}` })),
  ];
  const plan = {
    finishClock: formatClock(tri.finish).slice(0, 5),
    totalMinutes: tri.finish - tri.startMin,
    stopMinutes: (tri.bike?.plan.stopMinutes || 0) + (tri.run?.plan.stopMinutes || 0),
    stations,
    sections,
  };
  return { plan, stations, sections };
}

export function buildEffortInput(form) {
  const start = raceDateTime(form.date);
  const common = {
    sport: form.sport,
    plannedStartAt: start?.toISOString(),
    locationLabel: form.locationLabel || null,
    objectiveText: `Objectif ${form.raceName || 'course'} en ${formatMinutes(totalTargetMinutes(form))}, ${form.sessionsPerWeek} séances par semaine.`,
  };
  if (form.sport === 'triathlon') {
    return {
      ...common,
      swimmingDistanceKm: Number(form.swimmingDistanceKm),
      cyclingDistanceKm: Number(form.cyclingDistanceKm),
      cyclingElevationGainM: Number(form.cyclingElevationGainM) || 0,
      runningDistanceKm: Number(form.runningDistanceKm),
      runningElevationGainM: Number(form.runningElevationGainM) || 0,
      transitionMinutes: Number(form.transitionMinutes) || 0,
    };
  }
  return { ...common, distanceKm: Number(form.distanceKm), elevationGainM: Number(form.elevationGainM) || 0 };
}

export function buildRaceInput({ form, planner, strategy, trainingPlan }) {
  const triathlon = form.sport === 'triathlon';
  const targetMinutes = totalTargetMinutes(form);
  return {
    name: form.raceName.trim(),
    sport: form.sport,
    raceDate: form.date || null,
    locationLabel: form.locationLabel?.trim() || null,
    distanceKm: triathlon ? totalTriathlonKm(form) : numberOrNull(form.distanceKm),
    elevationGainM: triathlon
      ? (Number(form.cyclingElevationGainM) || 0) + (Number(form.runningElevationGainM) || 0)
      : numberOrNull(form.elevationGainM),
    targetMinutes: targetMinutes > 0 ? targetMinutes : null,
    objective: Object.fromEntries(OBJECTIVE_KEYS.map(key => [key, form[key]])),
    planner: planner || null,
    strategy: strategy || null,
    trainingPlan: trainingPlan || null,
  };
}

export function formFromRace(race) {
  const minutes = Number(race.targetMinutes) || 0;
  return {
    ...DEFAULT_FORM,
    ...(race.objective || {}),
    sport: race.sport,
    raceName: race.name || '',
    date: race.raceDate || '',
    locationLabel: race.locationLabel || '',
    targetHours: Math.floor(minutes / 60),
    targetMinutes: Math.round(minutes % 60),
  };
}

