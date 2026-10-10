import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinOff, Plus, Route } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext';
import { MAP_PROVIDER_LABEL, MAP_TILES } from '../../utils/mapTiles';
import { formatDuration, formatPace, gradeColor, pointAtKm } from '../../utils/gpxCourse';

const NEUTRAL_ROUTE = '#8a8a80';
const SECTION_PALETTE = ['#6a9bcc', '#d97757', '#788c5d', '#e0b25a', '#a855f7', '#fc4c02'];
const ALERT_COLOR = '#b91c1c';
const HOVER_RADIUS_PX = 16;
const METERS_PER_DEG = 111320;
const MAP_PADDING = [28, 28];

const KIND_META = {
  aid: { label: 'Ravitaillement', color: '#6a9bcc' },
  water: { label: 'Point d’eau', color: '#788c5d' },
  crew: { label: 'Assistance', color: '#e0b25a' },
  checkpoint: { label: 'Contrôle', color: '#d97757' },
};

const GRADE_LEGEND = [
  { label: '≥ 15 %', sample: 0.16 },
  { label: '10 à 15 %', sample: 0.12 },
  { label: '6 à 10 %', sample: 0.08 },
  { label: '3 à 6 %', sample: 0.04 },
  { label: '±3 %', sample: 0 },
  { label: '−3 à −8 %', sample: -0.05 },
  { label: '≤ −8 %', sample: -0.1 },
];

const MODE_OPTIONS = [
  { id: 'grade', label: 'Pente' },
  { id: 'section', label: 'Sections' },
];

const fmtKm = km => `${km.toFixed(1).replace('.', ',')} km`;
const fmtPercent = grade => {
  const pct = Math.round(grade * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')} %`;
};

const markerStyle = color => ({ color: '#faf9f5', weight: 2, fillColor: color, fillOpacity: 1 });

function buildGradeRuns(profile) {
  const runs = [];
  let current = null;
  profile.forEach((p, i) => {
    const color = gradeColor(p.grade);
    const here = [p.lat, p.lon];
    if (current && current.color === color) {
      current.positions.push(here);
      return;
    }
    const prev = profile[i - 1];
    current = { color, positions: prev ? [[prev.lat, prev.lon], here] : [here] };
    runs.push(current);
  });
  return runs;
}

function routePositions(course, fromKm, toKm) {
  const start = pointAtKm(course, fromKm);
  const end = pointAtKm(course, toKm);
  const inner = course.profile
    .filter(p => p.km > fromKm && p.km < toKm)
    .map(p => [p.lat, p.lon]);
  return [[start.lat, start.lon], ...inner, [end.lat, end.lon]];
}

function nearestKm(map, profile, latlng) {
  const cosLat = Math.cos((latlng.lat * Math.PI) / 180);
  const toLocal = (lat, lon) => [(lon - latlng.lon) * cosLat, lat - latlng.lat];
  let best = Infinity;
  let km = null;
  for (let i = 1; i < profile.length; i += 1) {
    const a = profile[i - 1];
    const b = profile[i];
    const [ax, ay] = toLocal(a.lat, a.lon);
    const [bx, by] = toLocal(b.lat, b.lon);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
    const qx = ax + dx * t;
    const qy = ay + dy * t;
    const d2 = qx * qx + qy * qy;
    if (d2 < best) {
      best = d2;
      km = a.km + (b.km - a.km) * t;
    }
  }
  const metersPerPx = (156543.03392 * Math.cos((latlng.lat * Math.PI) / 180)) / 2 ** map.getZoom();
  return Math.sqrt(best) * METERS_PER_DEG <= HOVER_RADIUS_PX * metersPerPx ? km : null;
}

function FitRange({ course, zoomRange }) {
  const map = useMap();
  useEffect(() => {
    const positions = zoomRange ? routePositions(course, zoomRange.fromKm, zoomRange.toKm) : course.profile.map(p => [p.lat, p.lon]);
    if (positions.length > 1) map.flyToBounds(positions, { padding: MAP_PADDING, duration: 0.6 });
  }, [map, course, zoomRange]);
  return null;
}

function RouteInteraction({ profile, onHover, onPick }) {
  const map = useMap();
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useMapEvents({
    mousemove: e => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        onHover(nearestKm(map, profile, e.latlng));
      });
    },
    click: e => {
      const km = nearestKm(map, profile, e.latlng);
      onHover(km);
      if (km !== null) onPick?.(km);
    },
    mouseout: () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      onHover(null);
    },
  });
  return null;
}

function StationTip({ station, meta }) {
  const margin = station.cutoffMarginMinutes;
  const breached = margin !== null && margin !== undefined && margin < 0;
  return (
    <div className="text-xs leading-snug">
      <p className="font-semibold">{station.name}</p>
      <p>{meta.label} · {fmtKm(station.km)}</p>
      <p>Passage {station.clock}{station.stopMinutes ? ` · arrêt ${station.stopMinutes} min` : ''}</p>
      {station.cutoff && (
        <p style={breached ? { color: ALERT_COLOR } : undefined}>
          {breached
            ? `Barrière ${station.cutoff} dépassée de ${formatDuration(-margin)}`
            : `Barrière ${station.cutoff} · marge ${formatDuration(margin)}`}
        </p>
      )}
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function CourseMap({ course, plan = null, hoverKm = null, onHoverKm = () => {}, onAddAt, zoomRange = null }) {
  const { allows, grant } = useConsent();
  const [addMode, setAddMode] = useState(false);
  const [baseLayer, setBaseLayer] = useState('topo');
  const tiles = MAP_TILES[baseLayer];
  const zoomLine = useMemo(() => (zoomRange ? routePositions(course, zoomRange.fromKm, zoomRange.toKm) : null), [course, zoomRange]);
  const [colorMode, setColorMode] = useState('grade');
  const { profile, bounds, stats, waypoints = [] } = course;
  const hasSections = Boolean(plan?.sections?.length);
  const mode = colorMode === 'section' && hasSections ? 'section' : 'grade';

  const gradeRuns = useMemo(() => buildGradeRuns(profile), [profile]);
  const fullRoute = useMemo(() => profile.map(p => [p.lat, p.lon]), [profile]);
  const sectionLines = useMemo(() => (plan?.sections ?? []).map((s, i) => ({
    id: s.id ?? i,
    section: s,
    color: s.color || SECTION_PALETTE[i % SECTION_PALETTE.length],
    positions: routePositions(course, s.fromKm, s.toKm),
  })), [course, plan]);
  const stationMarkers = useMemo(() => (plan?.stations ?? []).map(station => ({
    station,
    point: pointAtKm(course, station.km),
  })), [course, plan]);

  const start = profile[0];
  const finish = profile[profile.length - 1];
  const hoverPoint = hoverKm === null ? null : pointAtKm(course, hoverKm);
  const usedKinds = [...new Set((plan?.stations ?? []).map(s => s.kind))];

  const sectionLabel = line => {
    const s = line.section;
    const pace = plan.sport === 'cycling'
      ? `${s.avgSpeedKmh.toFixed(1).replace('.', ',')} km/h`
      : formatPace(s.avgPaceMinKm);
    return `${s.name} · ${pace}`;
  };

  return (
    <section aria-label="Carte du parcours" className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
            <Route size={13} aria-hidden="true" />
            Parcours
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmtKm(stats.distanceKm)} · D+ {stats.gainM} m · D− {stats.lossM} m
          </p>
        </div>
        <div
          role="group"
          aria-label="Mode de coloration du tracé"
          className="inline-flex rounded-xl p-1"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}
        >
          {MODE_OPTIONS.map(opt => {
            const active = mode === opt.id;
            const disabled = opt.id === 'section' && !hasSections;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => setColorMode(opt.id)}
                className="min-h-10 px-3 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={active
                  ? { background: 'var(--accent-blue)', color: '#141413' }
                  : { color: 'var(--text-secondary)' }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </header>

      {onAddAt && (
        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <button
            type="button"
            aria-pressed={addMode}
            onClick={() => setAddMode(v => !v)}
            className="min-h-9 px-3 rounded-lg font-semibold inline-flex items-center gap-1.5"
            style={addMode
              ? { background: 'var(--accent-blue)', color: '#fff' }
              : { background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
          >
            <Plus size={14} aria-hidden="true" />{addMode ? 'Clique sur le tracé pour poser un ravito' : 'Ajouter un ravito sur la carte'}
          </button>
          <span className="inline-flex rounded-lg p-0.5" role="group" aria-label="Fond de carte" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
            {Object.values(MAP_TILES).map(t => (
              <button
                key={t.id}
                type="button"
                aria-pressed={baseLayer === t.id}
                onClick={() => setBaseLayer(t.id)}
                className="min-h-8 px-2.5 rounded-md font-semibold"
                style={baseLayer === t.id ? { background: 'var(--accent-blue)', color: '#fff' } : { color: 'var(--text-secondary)' }}
              >
                {t.label}
              </button>
            ))}
          </span>
          <span>Molette pour zoomer · glisser pour se déplacer · la portion zoomée du profil est surlignée.</span>
        </div>
      )}

      <div className="relative h-[340px] sm:h-[440px] rounded-2xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
        {allows('maps') ? (
          <>
            <MapContainer
              bounds={bounds}
              boundsOptions={{ padding: MAP_PADDING }}
              scrollWheelZoom
              style={{ height: '100%', width: '100%', cursor: addMode ? 'crosshair' : undefined }}
            >
              <TileLayer key={tiles.id} url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />
              <RouteInteraction profile={profile} onHover={onHoverKm} onPick={addMode ? onAddAt : undefined} />
              <FitRange course={course} zoomRange={zoomRange} />

              {mode === 'grade' ? (
                <>
                  <Polyline positions={fullRoute} pathOptions={{ color: '#141413', weight: 9, opacity: 0.18, lineCap: 'round', lineJoin: 'round', interactive: false }} />
                  {gradeRuns.map((run, i) => (
                    <Polyline
                      key={i}
                      positions={run.positions}
                      pathOptions={{ color: run.color, weight: 5, lineCap: 'round', lineJoin: 'round', interactive: false }}
                    />
                  ))}
                </>
              ) : (
                <>
                  <Polyline positions={fullRoute} pathOptions={{ color: NEUTRAL_ROUTE, weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round', interactive: false }} />
                  {sectionLines.map(line => (
                    <Polyline
                      key={line.id}
                      positions={line.positions}
                      pathOptions={{ color: line.color, weight: 6, lineCap: 'round', lineJoin: 'round', interactive: false }}
                    />
                  ))}
                </>
              )}

              {zoomLine && (
                <Polyline positions={zoomLine} pathOptions={{ color: '#141413', weight: 12, opacity: 0.22, lineCap: 'round', lineJoin: 'round', interactive: false }} />
              )}

              {start && (
                <CircleMarker center={[start.lat, start.lon]} radius={6} pathOptions={markerStyle('#788c5d')}>
                  <Tooltip>Départ · {plan ? plan.clockAt(0) : fmtKm(0)}</Tooltip>
                </CircleMarker>
              )}
              {finish && (
                <CircleMarker center={[finish.lat, finish.lon]} radius={6} pathOptions={markerStyle('#141413')}>
                  <Tooltip>Arrivée · {plan ? plan.finishClock : fmtKm(finish.km)}</Tooltip>
                </CircleMarker>
              )}

              {waypoints.map((w, i) => (
                <CircleMarker
                  key={`wp-${i}`}
                  center={[w.lat, w.lon]}
                  radius={4}
                  pathOptions={{ color: '#141413', weight: 1.5, fillColor: '#faf9f5', fillOpacity: 1 }}
                >
                  <Tooltip>{w.name}</Tooltip>
                </CircleMarker>
              ))}

              {stationMarkers.map(({ station, point }) => {
                const meta = KIND_META[station.kind] ?? KIND_META.aid;
                const breached = station.cutoffMarginMinutes !== null && station.cutoffMarginMinutes < 0;
                return (
                  <CircleMarker
                    key={station.id}
                    center={[point.lat, point.lon]}
                    radius={8}
                    pathOptions={markerStyle(breached ? ALERT_COLOR : meta.color)}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>
                      <StationTip station={station} meta={meta} />
                    </Tooltip>
                  </CircleMarker>
                );
              })}

              {hoverPoint && (
                <CircleMarker
                  center={[hoverPoint.lat, hoverPoint.lon]}
                  radius={7}
                  pathOptions={{ color: '#141413', weight: 2, fillColor: '#ffffff', fillOpacity: 1, interactive: false }}
                />
              )}
            </MapContainer>

            {hoverPoint && (
              <div
                className="absolute left-3 top-3 z-[500] pointer-events-none rounded-xl px-3 py-2 text-xs backdrop-blur-md"
                style={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
              >
                <p className="font-mono text-[11px] uppercase tracking-wider">{fmtKm(hoverKm)}</p>
                <p>Altitude {Math.round(hoverPoint.ele)} m · pente {fmtPercent(hoverPoint.grade)}</p>
                {plan && <p>Passage {plan.clockAt(plan.elapsedAt(hoverKm))}</p>}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-6" style={{ background: '#faf9f5', color: '#141413' }}>
            <MapPinOff size={30} style={{ color: '#d97757' }} aria-hidden="true" />
            <p className="text-sm max-w-sm">
              Le fond de carte est fourni par {MAP_PROVIDER_LABEL}. Autorise les cartes interactives pour afficher le parcours.
            </p>
            <button
              type="button"
              onClick={() => grant('maps')}
              className="min-h-11 px-4 rounded-xl text-sm font-semibold"
              style={{ background: '#141413', color: '#faf9f5' }}
            >
              Autoriser les cartes
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {mode === 'grade'
          ? GRADE_LEGEND.map(item => <LegendItem key={item.label} color={gradeColor(item.sample)} label={item.label} />)
          : sectionLines.map(line => <LegendItem key={line.id} color={line.color} label={sectionLabel(line)} />)}
        {Object.entries(KIND_META)
          .filter(([kind]) => usedKinds.includes(kind))
          .map(([kind, meta]) => <LegendItem key={kind} color={meta.color} label={meta.label} />)}
      </div>
    </section>
  );
}
