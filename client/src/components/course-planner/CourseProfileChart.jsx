import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Droplets, Flag, Users, Utensils } from 'lucide-react';
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

function buildGradeStops(profile, totalKm) {
  const step = Math.max(1, Math.floor(profile.length / MAX_GRADIENT_STOPS));
  const stops = [];
  for (let i = 0; i < profile.length; i += step) {
    const end = Math.min(profile.length, i + step);
    let sum = 0;
    for (let j = i; j < end; j += 1) sum += profile[j].grade;
    stops.push({ offset: `${(profile[i].km / totalKm) * 100}%`, color: gradeColor(sum / (end - i)) });
  }
  const last = profile[profile.length - 1];
  stops.push({ offset: '100%', color: gradeColor(last.grade) });
  return stops;
}

function yDomainFor(minEle, maxEle) {
  const pad = Math.max(15, (maxEle - minEle) * 0.12);
  return [Math.floor((minEle - pad) / 10) * 10, Math.ceil((maxEle + pad) / 10) * 10];
}

function StationLabel({ viewBox, station }) {
  if (!viewBox) return null;
  const meta = KIND_META[station.kind] ?? KIND_META.aid;
  return (
    <text x={viewBox.x + 6} y={viewBox.y + 14} fill={meta.color} fontSize={11} fontWeight={700}>
      {station.name}
    </text>
  );
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

const CourseProfileChart = ({ course, plan = null, hoverKm = null, onHoverKm, onAddAt, onSelectRange }) => {
  const [drag, setDrag] = useState(null);
  const idPrefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const strokeId = `${idPrefix}-grade`;
  const fillId = `${idPrefix}-fill`;

  const { profile, stats } = course;
  const totalKm = stats.distanceKm || 1;

  const gradeStops = useMemo(() => buildGradeStops(profile, totalKm), [profile, totalKm]);
  const yDomain = useMemo(() => yDomainFor(stats.minEle, stats.maxEle), [stats.minEle, stats.maxEle]);
  const hoverPoint = useMemo(() => (hoverKm == null ? null : pointAtKm(course, hoverKm)), [course, hoverKm]);
  const kindsInPlan = useMemo(() => {
    const kinds = new Set((plan?.stations ?? []).map(s => s.kind));
    return [...kinds].filter(k => KIND_META[k]);
  }, [plan]);

  const kmFromState = state => profile[Number(state?.activeTooltipIndex)]?.km;

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
    if (toKm - fromKm > 0.2) onSelectRange?.({ fromKm, toKm });
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
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = totalKm / 150;
    const base = hoverKm ?? 0;
    const next = event.key === 'ArrowRight' ? base + step : base - step;
    onHoverKm?.(Math.min(totalKm, Math.max(0, next)));
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

      <div className="mt-5 h-64 w-full sm:h-72 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={profile}
            margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
            onMouseMove={handleMove}
            onMouseDown={handleDown}
            onMouseUp={handleUp}
            onMouseLeave={handleLeave}
            style={{ cursor: drag ? 'col-resize' : 'crosshair', userSelect: 'none' }}
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
                fill={section.color}
                fillOpacity={0.14}
                stroke="none"
                label={{ value: section.name, position: 'insideTopLeft', fill: section.color, fontSize: 11, fontWeight: 700 }}
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
              isAnimationActive
              animationDuration={600}
            />

            {(plan?.stations ?? []).map(station => (
              <ReferenceLine
                key={station.id}
                x={station.km}
                stroke={(KIND_META[station.kind] ?? KIND_META.aid).color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={<StationLabel station={station} />}
              />
            ))}

            <XAxis
              dataKey="km"
              type="number"
              domain={[0, totalKm]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${Math.round(v)} km`}
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
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Clique pour ajouter un ravito · glisse pour créer une section
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
        Survolez le profil ou utilisez les flèches ← → pour lire un point, Échap pour l’effacer.
      </p>
    </section>
  );
};

export default CourseProfileChart;
