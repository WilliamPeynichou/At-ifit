import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp, Mountain, RotateCcw, Route, Sparkles, Timer, Upload } from 'lucide-react';
import { buildCourse, computePlan, parseGpx, plannerStorageKey } from '../../utils/gpxCourse';
import CourseProfileChart from './CourseProfileChart';
import CourseMap from './CourseMap';
import CourseEditors from './CourseEditors';
import CourseRoadbook from './CourseRoadbook';

const SECTION_COLORS = ['#6a9bcc', '#d97757', '#788c5d', '#a855f7', '#e0b25a'];
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function loadSaved(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function suggestStations(course, sport) {
  const total = course.stats.distanceKm;
  const fromWaypoints = course.waypoints
    .filter(w => w.km > 0.5 && w.km < total - 0.5)
    .map(w => ({ id: newId(), km: Number(w.km.toFixed(2)), name: w.name, stopMinutes: 2, kind: 'aid' }));
  if (fromWaypoints.length) return fromWaypoints;
  const spacing = sport === 'cycling' ? 40 : course.stats.gainM / Math.max(1, total) > 25 ? 12 : 5;
  const stations = [];
  for (let km = spacing, i = 1; km < total - spacing / 3; km += spacing, i += 1) {
    stations.push({ id: newId(), km, name: `Ravito ${i}`, stopMinutes: sport === 'cycling' ? 3 : 1, kind: i % 2 ? 'water' : 'aid' });
  }
  return stations;
}

/** Détecte les montées significatives et les propose comme sections. */
function suggestClimbs(course, sport) {
  const { profile } = course;
  const minGain = sport === 'cycling' ? 80 : 60;
  const climbs = [];
  let start = null;
  let peak = null;
  const close = () => {
    if (start && peak && peak.ele - start.ele >= minGain) climbs.push({ fromKm: start.km, toKm: peak.km, gain: peak.ele - start.ele });
    start = null;
    peak = null;
  };
  for (let i = 1; i < profile.length; i += 1) {
    const p = profile[i];
    if (!start) {
      if (p.grade > 0.03) { start = profile[i - 1]; peak = p; }
      continue;
    }
    if (p.ele >= peak.ele) peak = p;
    else if (peak.ele - p.ele > 25) close();
  }
  close();
  return climbs.sort((a, b) => b.gain - a.gain).slice(0, 5).sort((a, b) => a.fromKm - b.fromKm).map((c, i) => ({
    id: newId(),
    name: `Montée ${i + 1} (+${Math.round(c.gain)} m)`,
    fromKm: Number(c.fromKm.toFixed(2)),
    toKm: Number(c.toKm.toFixed(2)),
    mode: 'intensity',
    value: 95,
    color: SECTION_COLORS[i % SECTION_COLORS.length],
  }));
}

export default function CoursePlanner({ sport = 'running', raceName, targetMinutes, onCourseLoaded, storageId, legLabel, fixedStartTime, onPlan }) {
  const plannerSport = sport === 'cycling' ? 'cycling' : 'running';
  const storageKey = plannerStorageKey(storageId || plannerSport);
  const fileRef = useRef(null);
  const [gpx, setGpx] = useState(() => loadSaved(storageKey)?.gpx || null);
  const [stations, setStations] = useState(() => loadSaved(storageKey)?.stations || []);
  const [sections, setSections] = useState(() => loadSaved(storageKey)?.sections || []);
  const [ownStartTime, setStartTime] = useState(() => loadSaved(storageKey)?.startTime || '08:00');
  const startTime = fixedStartTime || ownStartTime;
  const [fatiguePercent, setFatiguePercent] = useState(() => loadSaved(storageKey)?.fatiguePercent ?? 4);
  const [hoverKm, setHoverKm] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const course = useMemo(() => {
    if (!gpx) return null;
    try {
      return buildCourse(gpx.points, { waypoints: gpx.waypoints });
    } catch {
      return null;
    }
  }, [gpx]);

  const plan = useMemo(() => (course ? computePlan(course, {
    sport: plannerSport,
    targetMinutes,
    startTime,
    sections,
    aidStations: stations,
    fatiguePercent: Number(fatiguePercent) || 0,
  }) : null), [course, plannerSport, targetMinutes, startTime, sections, stations, fatiguePercent]);

  useEffect(() => {
    onPlan?.(plan ? { totalMinutes: plan.totalMinutes, finishClock: plan.finishClock } : null);
  }, [plan, onPlan]);

  useEffect(() => {
    if (!gpx) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ gpx, stations, sections, startTime, fatiguePercent }));
    } catch {
      // Trace trop volumineuse pour le stockage local : le plan reste utilisable dans la session.
    }
  }, [storageKey, gpx, stations, sections, startTime, fatiguePercent]);

  const loadFile = useCallback(async file => {
    if (!file) return;
    setError('');
    if (!/\.gpx$/i.test(file.name)) { setError('Format attendu : fichier .gpx'); return; }
    try {
      const parsed = parseGpx(await file.text());
      const step = Math.max(1, Math.floor(parsed.points.length / 6000));
      const points = parsed.points
        .filter((_, i) => i % step === 0 || i === parsed.points.length - 1)
        .map(p => ({ lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), ele: p.ele === null ? null : +p.ele.toFixed(1) }));
      const built = buildCourse(points, { waypoints: parsed.waypoints });
      setGpx({ fileName: file.name, name: parsed.name, points, waypoints: parsed.waypoints });
      setStations(suggestStations(built, plannerSport));
      setSections(suggestClimbs(built, plannerSport));
      onCourseLoaded?.({
        name: parsed.name,
        distanceKm: Number(built.stats.distanceKm.toFixed(2)),
        elevationGainM: built.stats.gainM,
      });
    } catch (err) {
      setError(err.message || 'Impossible de lire ce GPX.');
    }
  }, [plannerSport, onCourseLoaded]);

  const reset = () => {
    setGpx(null);
    setStations([]);
    setSections([]);
    try { window.localStorage.removeItem(storageKey); } catch { /* rien */ }
  };

  const addStationAt = km => setStations(current => [...current, {
    id: newId(), km: Number(km.toFixed(2)), name: `Ravito ${current.length + 1}`, stopMinutes: 2, kind: 'aid',
  }]);

  const addSectionRange = ({ fromKm, toKm }) => setSections(current => [...current, {
    id: newId(),
    name: `Section ${current.length + 1}`,
    fromKm: Number(Math.min(fromKm, toKm).toFixed(2)),
    toKm: Number(Math.max(fromKm, toKm).toFixed(2)),
    mode: 'intensity',
    value: 100,
    color: SECTION_COLORS[current.length % SECTION_COLORS.length],
  }]);

  if (!course) {
    return (
      <section className="glass-panel p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>{legLabel ? `${legLabel} · Road book` : 'Parcours · Road book'}</p>
        <h2 className="text-2xl mt-1">Importer le tracé GPX{legLabel ? ` · ${legLabel}` : ''}</h2>
        <p className="text-sm mt-1 mb-5 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Profil coloré par pente, temps de passage calculés selon le dénivelé, ravitaillements, sections à vitesse imposée et road book imprimable.
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files?.[0]); }}
          className="w-full rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-all"
          style={{
            border: `2px dashed ${dragging ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
            background: dragging ? 'var(--accent-blue-light)' : 'var(--surface-subtle)',
          }}
          aria-label="Importer un fichier GPX"
        >
          <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            <Upload size={24} />
          </span>
          <strong className="text-lg">Glisse ton fichier .gpx ici</strong>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ou clique pour parcourir · Strava, Garmin, Komoot, site de l’organisateur</span>
        </button>
        <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml" hidden onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }} />
        {error && <p className="text-sm flex gap-2 mt-3" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>
              <Route size={13} className="inline mr-1" />{legLabel ? `${legLabel} · ` : ''}{gpx.fileName}
            </p>
            <h2 className="text-2xl mt-1 truncate">{gpx.name || raceName || 'Parcours'}</h2>
            <p className="text-sm mt-1 flex flex-wrap gap-x-4" style={{ color: 'var(--text-secondary)' }}>
              <span>{course.stats.distanceKm.toFixed(1)} km</span>
              <span><Mountain size={13} className="inline" /> +{course.stats.gainM} / −{course.stats.lossM} m</span>
              <span>Alt. {course.stats.minEle}–{course.stats.maxEle} m</span>
              <span>Pente max {(course.stats.maxGrade * 100).toFixed(0)} %</span>
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold uppercase">Départ
              <input type="time" className="input-cyber mt-1 w-28" value={startTime} disabled={Boolean(fixedStartTime)} title={fixedStartTime ? 'Calculé depuis la discipline précédente' : undefined} onChange={e => setStartTime(e.target.value)} />
            </label>
            <label className="text-xs font-bold uppercase" title="Dégradation progressive de l’allure jusqu’à l’arrivée">Fatigue fin de course
              <span className="flex items-center gap-2 mt-1">
                <input type="range" min="0" max="20" value={fatiguePercent} onChange={e => setFatiguePercent(Number(e.target.value))} aria-label="Fatigue en pourcentage" />
                <span className="font-mono w-10">{fatiguePercent}%</span>
              </span>
            </label>
            <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => fileRef.current?.click()}><FileUp size={16} />Changer</button>
            <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={reset} aria-label="Supprimer le parcours"><RotateCcw size={16} /></button>
            <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml" hidden onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
        {error && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}

        <p className="text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Timer size={14} /> Objectif {Math.floor(targetMinutes / 60)}h{String(Math.round(targetMinutes % 60)).padStart(2, '0')} réparti selon la pente
          ({plannerSport === 'cycling' ? 'modèle de puissance aéro + gravité' : 'coût énergétique de Minetti'}) · arrivée prévue <strong>{plan.finishClock}</strong>
        </p>

        <CourseProfileChart
          course={course}
          plan={plan}
          hoverKm={hoverKm}
          onHoverKm={setHoverKm}
          onAddAt={addStationAt}
          onSelectRange={addSectionRange}
        />
        <CourseMap course={course} plan={plan} hoverKm={hoverKm} onHoverKm={setHoverKm} />
      </section>

      <CourseEditors
        distanceKm={course.stats.distanceKm}
        sport={plannerSport}
        sections={sections}
        aidStations={stations}
        plan={plan}
        onSectionsChange={setSections}
        onAidStationsChange={setStations}
        onHoverKm={setHoverKm}
      />

      {sections.length === 0 && (
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => setSections(suggestClimbs(course, plannerSport))}>
          <Sparkles size={16} /> Détecter automatiquement les montées
        </button>
      )}

      <CourseRoadbook course={course} plan={plan} raceName={raceName || gpx.name} hoverKm={hoverKm} onHoverKm={setHoverKm} />
    </div>
  );
}
