import { createElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Droplets, Flag, Maximize2, MousePointer2, Users, Utensils, ZoomIn, ZoomOut } from 'lucide-react';
import { formatDuration, gradeColor, pointAtKm } from '../../utils/gpxCourse';

const KIND_META = {
  aid: { label: 'Ravitaillement', color: '#788c5d', Icon: Utensils },
  water: { label: 'Point d’eau', color: '#6a9bcc', Icon: Droplets },
  crew: { label: 'Assistance', color: '#d97757', Icon: Users },
  checkpoint: { label: 'Contrôle', color: '#a855f7', Icon: Flag },
};

const GRADE_BINS = [
  { label: '< −8 %', sample: -0.1 },
  { label: '−8 à −3 %', sample: -0.05 },
  { label: '−3 à 3 %', sample: 0 },
  { label: '3 à 6 %', sample: 0.045 },
  { label: '6 à 10 %', sample: 0.08 },
  { label: '10 à 15 %', sample: 0.12 },
  { label: '≥ 15 %', sample: 0.16 },
];

const AXIS_TICK = { fill: '#a8a29e', fontSize: 11 };
const MAX_GRADIENT_STOPS = 240;

function buildGradeStops(profile, fromKm, toKm) {
  const span = toKm - fromKm || 1;
  const step = Math.max(1, Math.floor(profile.length / MAX_GRADIENT_STOPS));
  const stops = [];
  for (let i = 0; i < profile.length; i += step) {
    const end = Math.min(profile.length, i + step);
    let sum = 0;
    for (let j = i; j < end; j += 1) sum += profile[j].grade;
    stops.push({ offset: `${((profile[i].km - fromKm) / span) * 100}%`, color: gradeColor(sum / (end - i)) });
  }
  const last = profile[profile.length - 1];
  stops.push({ offset: '100%', color: gradeColor(last.grade) });
  return stops;
}

function yDomainFor(minEle, maxEle) {
  const pad = Math.max(15, (maxEle - minEle) * 0.12);
  return [Math.floor((minEle - pad) / 10) * 10, Math.ceil((maxEle + pad) / 10) * 10];
}

const LABEL_FONT = 11;
const ROW_H = 15;
const CHAR_W = 6.6;
const Y_AXIS_W = 56;
const RIGHT_PAD = 12;
const MAX_LABEL_CHARS = 22;

const shorten = text => (text.length > MAX_LABEL_CHARS ? `${text.slice(0, MAX_LABEL_CHARS - 1)}…` : text);

/**
 * Range les étiquettes en lignes sans chevauchement (glouton, en pixels).
 * Chaque item : { id, x (px), text }. Retourne { placed: [{...item, row, anchor}], rows }.
 */
function layoutLabels(items, plotWidth, maxRows = 4) {
  const rowsEnd = [];
  const placed = [];
  [...items].sort((a, b) => a.x - b.x).forEach(item => {
    const text = shorten(item.text);
    const width = text.length * CHAR_W + 8;
    // Ancrage à droite si l'étiquette déborderait du graphe.
    const left = item.x + width > plotWidth ? item.x - width : item.x;
    let row = rowsEnd.findIndex(end => end <= left);
    if (row === -1) {
      if (rowsEnd.length >= maxRows) return; // trop dense : visible au survol / dans la liste
      row = rowsEnd.length;
      rowsEnd.push(0);
    }
    rowsEnd[row] = left + width + 4;
    placed.push({ ...item, text, row, left });
  });
  return { placed, rows: rowsEnd.length };
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function ProfileTooltip({ active, payload, plan }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const grade = point.grade * 100;
  const elapsed = plan ? plan.elapsedAt(point.km) : null;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }}
    >
      <p className="font-mono font-bold">{point.km.toFixed(2)} km</p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        <dt style={{ color: 'var(--text-muted)' }}>Altitude</dt>
        <dd className="text-right tabular-nums">{Math.round(point.ele)} m</dd>
        <dt style={{ color: 'var(--text-muted)' }}>Pente</dt>
        <dd className="text-right tabular-nums font-semibold" style={{ color: gradeColor(point.grade) }}>
          {grade > 0 ? '+' : ''}{grade.toFixed(1)} %
        </dd>
        {plan && (
          <>
            <dt style={{ color: 'var(--text-muted)' }}>Temps écoulé</dt>
            <dd className="text-right tabular-nums">{formatDuration(elapsed)}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Passage</dt>
            <dd className="text-right tabular-nums">{plan.clockAt(elapsed)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

const MIN_ZOOM_KM = 0.3;

const CourseProfileChart = ({ course, plan = null, hoverKm = null, onHoverKm, onAddAt, onSelectRange, zoomRange = null, onZoom }) => {
  const [drag, setDrag] = useState(null);
  const [tool, setTool] = useState('edit');
  const [chartRef, chartWidth] = useWidth();
  const idPrefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const strokeId = `${idPrefix}-grade`;
  const fillId = `${idPrefix}-fill`;

  const { profile, stats } = course;
  const totalKm = stats.distanceKm || 1;

  const viewFrom = zoomRange ? Math.max(0, zoomRange.fromKm) : 0;
  const viewTo = zoomRange ? Math.min(totalKm, zoomRange.toKm) : totalKm;
  const zoomed = viewFrom > 0 || viewTo < totalKm;
  const data = useMemo(() => {
    if (!zoomed) return profile;
    let first = profile.findIndex(p => p.km >= viewFrom);
    let last = profile.findIndex(p => p.km > viewTo);
    first = Math.max(0, first - 1);
    last = last === -1 ? profile.length : Math.min(profile.length, last + 1);
    return profile.slice(first, last);
  }, [profile, zoomed, viewFrom, viewTo]);
  const gradeStops = useMemo(() => buildGradeStops(data, data[0].km, data[data.length - 1].km), [data]);
  const yDomain = useMemo(() => {
    const eles = data.map(p => p.ele);
    return yDomainFor(Math.min(...eles), Math.max(...eles));
  }, [data]);
  const span = viewTo - viewFrom;
  const setView = (from, to) => {
    const width = Math.max(MIN_ZOOM_KM, to - from);
    let a = from;
    let b = from + width;
    if (b > totalKm) { b = totalKm; a = Math.max(0, b - width); }
    if (a < 0) { a = 0; b = Math.min(totalKm, width); }
    onZoom?.(a <= 0 && b >= totalKm ? null : { fromKm: a, toKm: b });
  };
  const center = hoverKm ?? (viewFrom + viewTo) / 2;
  const zoomIn = () => setView(center - span / 4, center + span / 4);
  const zoomOut = () => setView(center - span, center + span);
  const plotWidth = Math.max(1, chartWidth - Y_AXIS_W - RIGHT_PAD);
  const xTicks = useMemo(() => {
    const count = Math.max(2, Math.floor(plotWidth / 70));
    const raw = span / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const stepKm = [1, 2, 5, 10].map(m => m * mag).find(v => v >= raw) || raw;
    const ticks = [];
    for (let t = Math.ceil(viewFrom / stepKm) * stepKm; t <= viewTo + 1e-9; t += stepKm) ticks.push(Number(t.toFixed(3)));
    return ticks;
  }, [plotWidth, span, viewFrom, viewTo]);
  const toPx = km => ((km - viewFrom) / (span || 1)) * plotWidth;
  const visibleSections = (plan?.sections ?? []).filter(sec => sec.toKm > viewFrom && sec.fromKm < viewTo);
  const visibleStations = (plan?.stations ?? []).filter(st => st.km >= viewFrom && st.km <= viewTo);
  const sectionLayout = layoutLabels(
    visibleSections.map(sec => ({ id: sec.id, x: toPx(Math.max(sec.fromKm, viewFrom)) + 3, text: sec.name, color: sec.color })),
    plotWidth,
    3,
  );
  const stationLayout = layoutLabels(
    visibleStations.map(st => ({ id: st.id, x: toPx(st.km) + 4, text: st.name, color: (KIND_META[st.kind] ?? KIND_META.aid).color })),
    plotWidth,
    3,
  );
  const sectionBand = sectionLayout.rows * ROW_H;
  const stationBand = stationLayout.rows * ROW_H;
  const topMargin = 10 + sectionBand + stationBand;
  const hiddenLabels = visibleSections.length + visibleStations.length - sectionLayout.placed.length - stationLayout.placed.length;

  const handleWheel = event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    if (event.deltaY < 0) zoomIn(); else zoomOut();
  };
  const hoverPoint = useMemo(() => (hoverKm == null ? null : pointAtKm(course, hoverKm)), [course, hoverKm]);
  const kindsInPlan = useMemo(() => {
    const kinds = new Set((plan?.stations ?? []).map(s => s.kind));
    return [...kinds].filter(k => KIND_META[k]);
  }, [plan]);

  const kmFromState = state => data[Number(state?.activeTooltipIndex)]?.km;

  const handleMove = state => {
    const km = kmFromState(state);
    if (km == null) return;
    onHoverKm?.(km);
    if (drag) setDrag(current => ({ ...current, toKm: km }));
  };

  const handleDown = state => {
    const km = kmFromState(state);
    if (km != null) setDrag({ fromKm: km, toKm: km });
  };

  const handleUp = () => {
    if (!drag) return;
    const fromKm = Math.min(drag.fromKm, drag.toKm);
    const toKm = Math.max(drag.fromKm, drag.toKm);
    const threshold = Math.max(0.02, span * 0.012);
    if (tool === 'zoom') {
      if (toKm - fromKm > threshold) setView(fromKm, toKm);
      else setView(fromKm - span / 4, fromKm + span / 4);
    } else if (toKm - fromKm > threshold) onSelectRange?.({ fromKm, toKm });
    else onAddAt?.(drag.fromKm);
    setDrag(null);
  };

  const handleLeave = () => {
    setDrag(null);
    onHoverKm?.(null);
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      onHoverKm?.(null);
      return;
    }
    if (event.key === '+' || event.key === '=') { zoomIn(); return; }
    if (event.key === '-') { zoomOut(); return; }
    if (event.key === '0') { onZoom?.(null); return; }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = span / 150;
    const base = hoverKm ?? viewFrom;
    const next = event.key === 'ArrowRight' ? base + step : base - step;
    onHoverKm?.(Math.min(viewTo, Math.max(viewFrom, next)));
  };

  return (
    <section
      role="group"
      aria-label="Profil altimétrique du parcours"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="glass-panel rounded-2xl p-5 sm:p-6 outline-none focus-visible:[outline:2px_solid_var(--accent-blue)] outline-offset-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            Profil altimétrique
          </p>
          <h3 className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Parcours et sections</h3>
        </div>
        <dl className="flex flex-wrap gap-2 text-xs">
          {[
            { label: 'D+', value: `${stats.gainM} m` },
            { label: 'D−', value: `${stats.lossM} m` },
            { label: 'Alt. max', value: `${stats.maxEle} m` },
          ].map(item => (
            <div key={item.label} className="rounded-lg border px-2.5 py-1" style={{ borderColor: 'var(--glass-border)', background: 'var(--surface-subtle)' }}>
              <dt className="inline font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</dt>{' '}
              <dd className="inline font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>


      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Outil du profil" className="inline-flex rounded-xl p-1" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
          {[
            { id: 'edit', label: 'Ravitos & sections', icon: MousePointer2 },
            { id: 'zoom', label: 'Zoom', icon: ZoomIn },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className="min-h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              style={tool === id ? { background: 'var(--accent-blue)', color: '#fff' } : { color: 'var(--text-secondary)' }}
            >
              {createElement(icon, { size: 14, 'aria-hidden': true })}{label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] tabular-nums mr-2" style={{ color: 'var(--text-muted)' }}>
            {zoomed ? `${viewFrom.toFixed(1)} → ${viewTo.toFixed(1)} km` : `0 → ${totalKm.toFixed(1)} km`}
          </span>
          <button type="button" className="btn-ghost !p-2" onClick={zoomIn} disabled={span <= MIN_ZOOM_KM} aria-label="Zoomer sur le profil" title="Zoomer (+)"><ZoomIn size={15} /></button>
          <button type="button" className="btn-ghost !p-2" onClick={zoomOut} disabled={!zoomed} aria-label="Dézoomer le profil" title="Dézoomer (−)"><ZoomOut size={15} /></button>
          <button type="button" className="btn-ghost !p-2" onClick={() => onZoom?.(null)} disabled={!zoomed} aria-label="Voir tout le parcours" title="Tout voir (0)"><Maximize2 size={15} /></button>
        </div>
      </div>

      <div ref={chartRef} className="relative mt-4 h-72 w-full sm:h-80 lg:h-96" onWheel={handleWheel} onDoubleClick={() => onZoom?.(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: topMargin, right: RIGHT_PAD, bottom: 0, left: 0 }}
            onMouseMove={handleMove}
            onMouseDown={handleDown}
            onMouseUp={handleUp}
            onMouseLeave={handleLeave}
            style={{ cursor: tool === 'zoom' ? 'zoom-in' : drag ? 'col-resize' : 'crosshair', userSelect: 'none' }}
          >
            <defs>
              <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                {gradeStops.map((stop, i) => (
                  <stop key={i} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6a9bcc" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#6a9bcc" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" vertical={false} />

            {(plan?.sections ?? []).map(section => (
              <ReferenceArea
                key={section.id}
                x1={section.fromKm}
                x2={section.toKm}
                ifOverflow="hidden"
                fill={section.color}
                fillOpacity={0.14}
                stroke="none"
              />
            ))}

            {drag && Math.abs(drag.toKm - drag.fromKm) > 0 && (
              <ReferenceArea x1={drag.fromKm} x2={drag.toKm} fill="var(--accent-blue)" fillOpacity={0.22} stroke="var(--accent-blue)" strokeDasharray="3 3" />
            )}

            <Area
              type="linear"
              dataKey="ele"
              stroke={`url(#${strokeId})`}
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />

            {(plan?.stations ?? []).map(station => (
              <ReferenceLine
                key={station.id}
                x={station.km}
                ifOverflow="hidden"
                stroke={(KIND_META[station.kind] ?? KIND_META.aid).color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            ))}

            <XAxis
              dataKey="km"
              type="number"
              domain={[viewFrom, viewTo]}
              allowDataOverflow
              ticks={xTicks}
              interval={0}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${Number.isInteger(v) ? v : v.toFixed(1)} km`}
              stroke="#a8a29e"
            />
            <YAxis
              dataKey="ele"
              domain={yDomain}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={v => `${Math.round(v)} m`}
            />
            <Tooltip cursor={false} content={<ProfileTooltip plan={plan} />} />

            {hoverPoint && (
              <>
                <ReferenceLine x={hoverPoint.km} stroke="#141413" strokeOpacity={0.35} ifOverflow="extendDomain" />
                <ReferenceDot x={hoverPoint.km} y={hoverPoint.ele} r={5} fill="#141413" stroke="#ffffff" strokeWidth={2} />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
        {chartWidth > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: topMargin }} aria-hidden="true">
            {sectionLayout.placed.map(item => (
              <span
                key={`s-${item.id}`}
                className="absolute whitespace-nowrap rounded px-1 font-bold leading-[13px]"
                style={{ left: Y_AXIS_W + item.left, top: 4 + item.row * ROW_H, fontSize: LABEL_FONT, color: item.color, background: `color-mix(in srgb, ${item.color} 14%, transparent)` }}
              >
                {item.text}
              </span>
            ))}
            {stationLayout.placed.map(item => (
              <span
                key={`r-${item.id}`}
                className="absolute whitespace-nowrap font-bold leading-[13px]"
                style={{ left: Y_AXIS_W + item.left, top: 4 + sectionBand + item.row * ROW_H, fontSize: LABEL_FONT, color: item.color }}
              >
                {item.text}
              </span>
            ))}
          </div>
        )}
      </div>
      {hiddenLabels > 0 && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {hiddenLabels} étiquette{hiddenLabels > 1 ? 's' : ''} masquée{hiddenLabels > 1 ? 's' : ''} faute de place : zoome pour les voir.
        </p>
      )}

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {tool === 'zoom'
          ? 'Glisse pour zoomer sur une portion · clic pour zoomer autour d’un point · double-clic pour tout voir'
          : 'Clique pour ajouter un ravito · glisse pour créer une section · Ctrl + molette pour zoomer'}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Pente">
          {GRADE_BINS.map(bin => (
            <li key={bin.label} className="flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full" style={{ background: gradeColor(bin.sample) }} aria-hidden="true" />
              <span className="tabular-nums">{bin.label}</span>
            </li>
          ))}
        </ul>
        {kindsInPlan.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Types de ravitaillements">
            {kindsInPlan.map(kind => {
              const { label, color, Icon } = KIND_META[kind];
              return (
                <li key={kind} className="flex items-center gap-1.5">
                  <Icon size={13} aria-hidden="true" style={{ color }} />
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Survole le profil ou utilise les flèches ← → pour lire un point · + / − / 0 pour zoomer · Échap pour effacer.
      </p>
    </section>
  );
};

export default CourseProfileChart;
