import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Mountain, RotateCcw, Route, Sparkles, Timer } from 'lucide-react';
import { buildCourse, computePlan } from '../../utils/gpxCourse';
import CourseProfileChart from './CourseProfileChart';
import CourseMap from './CourseMap';
import CourseEditors from './CourseEditors';
import CourseRoadbook from './CourseRoadbook';
import AidNutritionPlan from './AidNutritionPlan';
import { GpxDropzone } from './GpxDropzone';
import { newId, SECTION_COLORS, suggestClimbs } from './suggestions';

const NONE = [];

export default function CoursePlanner({ sport = 'running', raceName, targetMinutes, value, onChange, nutrition, legLabel, fixedStartTime, onPlan, onCourseLoaded, showAidPlan = true }) {
  const plannerSport = sport === 'cycling' ? 'cycling' : 'running';
  const gpx = value?.gpx || null;
  const stations = value?.stations || NONE;
  const sections = value?.sections || NONE;
  const startTime = fixedStartTime || value?.startTime || '08:00';
  const fatiguePercent = value?.fatiguePercent ?? 4;
  const [hoverKm, setHoverKm] = useState(null);

  const patch = next => onChange?.({ gpx, stations, sections, startTime: value?.startTime || '08:00', fatiguePercent, ...next });

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

  const handleLoaded = ({ gpx: loadedGpx, info, suggested }) => {
    patch({ gpx: loadedGpx, stations: suggested.stations, sections: suggested.sections });
    onCourseLoaded?.(info);
  };

  const reset = () => onChange?.(null);

  const addStationAt = km => patch({ stations: [...stations, {
    id: newId(), km: Number(km.toFixed(2)), name: `Ravito ${stations.length + 1}`, stopMinutes: 2, kind: 'aid',
  }] });

  const addSectionRange = ({ fromKm, toKm }) => patch({ sections: [...sections, {
    id: newId(),
    name: `Section ${sections.length + 1}`,
    fromKm: Number(Math.min(fromKm, toKm).toFixed(2)),
    toKm: Number(Math.max(fromKm, toKm).toFixed(2)),
    mode: 'intensity',
    value: 100,
    color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
  }] });

  if (!course) {
    return (
      <section className="glass-panel p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>{legLabel ? `${legLabel} · Road book` : 'Parcours · Road book'}</p>
        <h2 className="text-2xl mt-1">Importer le tracé GPX{legLabel ? ` · ${legLabel}` : ''}</h2>
        <p className="text-sm mt-1 mb-5 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Profil coloré par pente, temps de passage calculés selon le dénivelé, ravitaillements, sections à vitesse imposée et road book imprimable.
        </p>
        <GpxDropzone sport={plannerSport} onLoaded={handleLoaded} />
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
              <input type="time" className="input-cyber mt-1 w-28" value={startTime} disabled={Boolean(fixedStartTime)} title={fixedStartTime ? 'Calculé depuis la discipline précédente' : undefined} onChange={e => patch({ startTime: e.target.value })} />
            </label>
            <label className="text-xs font-bold uppercase" title="Dégradation progressive de l’allure jusqu’à l’arrivée">Fatigue fin de course
              <span className="flex items-center gap-2 mt-1">
                <input type="range" min="0" max="20" value={fatiguePercent} onChange={e => patch({ fatiguePercent: Number(e.target.value) })} aria-label="Fatigue en pourcentage" />
                <span className="font-mono w-10">{fatiguePercent}%</span>
              </span>
            </label>
            <GpxDropzone compact sport={plannerSport} onLoaded={handleLoaded} />
            <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={reset} aria-label="Supprimer le parcours"><RotateCcw size={16} /></button>
          </div>
        </div>

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
        onSectionsChange={next => patch({ sections: next })}
        onAidStationsChange={next => patch({ stations: next })}
        onHoverKm={setHoverKm}
      />

      {sections.length === 0 && (
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => patch({ sections: suggestClimbs(course, plannerSport) })}>
          <Sparkles size={16} /> Détecter automatiquement les montées
        </button>
      )}

      {showAidPlan && <AidNutritionPlan plan={plan} nutrition={nutrition} />}

      <CourseRoadbook course={course} plan={plan} raceName={raceName || gpx.name} hoverKm={hoverKm} onHoverKm={setHoverKm} />
    </div>
  );
}
