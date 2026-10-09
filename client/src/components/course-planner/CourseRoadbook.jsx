import { Clock3, Download, Droplets, Flag, Mountain, Play, Timer, TrendingUp, UtensilsCrossed, Users } from 'lucide-react';
import { formatDuration, formatPace, planToCsv } from '../../utils/gpxCourse';

const KIND_META = {
  start: { label: 'Départ', Icon: Play },
  finish: { label: 'Arrivée', Icon: Flag },
  aid: { label: 'Ravitaillement', Icon: UtensilsCrossed },
  water: { label: 'Point d’eau', Icon: Droplets },
  crew: { label: 'Assistance', Icon: Users },
  checkpoint: { label: 'Contrôle', Icon: Flag },
};

const OK_COLOR = '#788c5d';
const ALERT_COLOR = '#c2410c';
const HOVER_TOLERANCE_KM = 0.25;

const fmtNumber = (value, digits = 1) => Number(value).toLocaleString('fr-FR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});
const fmtKm = value => `${fmtNumber(value, value % 1 ? 1 : 0)} km`;
const fmtSpeed = value => (Number.isFinite(value) && value > 0 ? `${fmtNumber(value)} km/h` : '—');
const fmtGain = (gain, loss) => `+${Math.round(gain)} / −${Math.round(loss)} m`;
const fmtGrade = grade => `${grade >= 0 ? '+' : ''}${fmtNumber(grade * 100)} %`;

const buildSlug = name => (name || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'roadbook';

function Label({ children }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{children}</p>;
}

function Metric({ label, value, hint, Icon }) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-subtle)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        {Icon && <Icon size={14} aria-hidden="true" />}
        <Label>{label}</Label>
      </div>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}

function CutoffBadge({ cutoff, margin }) {
  if (margin === null || margin === undefined) return null;
  const ok = margin >= 0;
  const color = ok ? OK_COLOR : ALERT_COLOR;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tabular-nums"
      style={{ color, borderColor: color, backgroundColor: `${color}1a` }}
    >
      {ok
        ? `Barrière ${cutoff} · marge ${formatDuration(margin)}`
        : `Barrière ${cutoff} dépassée de ${formatDuration(-margin)}`}
    </span>
  );
}

function TimelineRow({ kind, title, km, clock, elapsed, ele, stopMinutes, cutoff, cutoffMargin, fromPrev, active, onHover, isLast }) {
  const meta = KIND_META[kind];
  const Icon = meta?.Icon ?? Timer;
  return (
    <li
      className="relative flex gap-4 pb-6 last:pb-0"
      onMouseEnter={() => onHover?.(km)}
      onMouseLeave={() => onHover?.(null)}
    >
      {!isLast && (
        <span aria-hidden="true" className="absolute left-[19px] top-10 bottom-0 w-px bg-[var(--glass-border)]" />
      )}
      <span
        aria-hidden="true"
        className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full border transition-colors ${
          active ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)] text-white' : 'border-[var(--glass-border)] bg-[var(--chart-tooltip-bg)] text-[var(--accent-blue)]'
        }`}
      >
        <Icon size={18} />
      </span>
      <div
        className={`min-w-0 flex-1 rounded-2xl border p-4 transition-colors ${
          active ? 'border-[var(--accent-blue)] bg-[var(--accent-blue-light)]' : 'border-[var(--glass-border)] bg-[var(--surface-subtle)]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium leading-snug break-words">{title}</p>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {meta ? meta.label : 'Étape'} · {fmtKm(km)}{Number.isFinite(ele) ? ` · ${Math.round(ele)} m` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums">{clock}</p>
            {elapsed !== undefined && (
              <p className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">écoulé {formatDuration(elapsed)}</p>
            )}
          </div>
        </div>
        {(fromPrev || stopMinutes > 0 || cutoff) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            {fromPrev && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock3 size={12} aria-hidden="true" />
                {fmtKm(fromPrev.km)} en {formatDuration(fromPrev.minutes)} · {fmtGain(fromPrev.gain, fromPrev.loss)}
              </span>
            )}
            {stopMinutes > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Timer size={12} aria-hidden="true" />
                Arrêt {Math.round(stopMinutes)} min
              </span>
            )}
            <CutoffBadge cutoff={cutoff} margin={cutoffMargin} />
          </div>
        )}
      </div>
    </li>
  );
}

export default function CourseRoadbook({ course, plan, raceName = '', hoverKm = null, onHoverKm }) {
  const isCycling = plan.sport === 'cycling';
  const { stats, profile } = course;
  const hasHover = hoverKm !== null && hoverKm !== undefined;
  const isNear = km => hasHover && Math.abs(hoverKm - km) <= HOVER_TOLERANCE_KM;
  const isWithin = (from, to) => hasHover && hoverKm >= from && hoverKm < to;
  const hoverHandlers = km => ({
    onMouseEnter: () => onHoverKm?.(km),
    onMouseLeave: () => onHoverKm?.(null),
  });

  const exportCsv = () => {
    const blob = new Blob(['\uFEFF', planToCsv(plan)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buildSlug(raceName)}-roadbook.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const stations = plan.stations;
  const finishKm = stats.distanceKm;
  const startEle = profile[0]?.ele;
  const pacePrimary = isCycling ? 'Vitesse' : 'Allure';

  return (
    <section className="glass-panel space-y-8 rounded-3xl p-5 sm:p-8" aria-labelledby="course-roadbook-title">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Label>Roadbook</Label>
          <h2 id="course-roadbook-title" className="mt-1 font-display text-3xl sm:text-4xl break-words">
            {raceName || 'Plan de course'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {fmtKm(finishKm)} · {fmtGain(stats.gainM, stats.lossM)} · départ {plan.clockAt(0)}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="btn-ghost inline-flex items-center gap-2"
          aria-label="Exporter le roadbook au format CSV"
        >
          <Download size={16} aria-hidden="true" />
          Exporter CSV
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Temps total" value={formatDuration(plan.totalMinutes)} hint={`${formatDuration(plan.movingMinutes)} en mouvement`} Icon={Timer} />
        <Metric label="Arrivée" value={plan.finishClock} hint={`Départ ${plan.clockAt(0)}`} Icon={Clock3} />
        <Metric
          label={isCycling ? 'Puissance de base' : 'Allure de base'}
          value={isCycling ? `${Math.round(plan.baseLevel)} W` : formatPace(plan.baseLevel)}
          hint={`${formatDuration(plan.stopMinutes)} d’arrêts`}
          Icon={Mountain}
        />
        <Metric
          label="Dénivelé"
          value={`+${stats.gainM} m`}
          hint={`−${stats.lossM} m · max ${fmtGrade(stats.maxGrade)}`}
          Icon={TrendingUp}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">Ravitaillements et passages</h3>
          <Label>{stations.length} point{stations.length > 1 ? 's' : ''}</Label>
        </div>
        <ol className="pl-1" aria-label="Chronologie des ravitaillements">
          <TimelineRow
            kind="start"
            title="Départ"
            km={0}
            clock={plan.clockAt(0)}
            ele={startEle}
            onHover={onHoverKm}
            active={isNear(0)}
          />
          {stations.map((station, index) => (
            <TimelineRow
              key={station.id ?? index}
              kind={station.kind}
              title={station.name}
              km={station.km}
              clock={station.clock}
              elapsed={station.arrivalMinutes}
              ele={station.ele}
              stopMinutes={Number(station.stopMinutes) || 0}
              cutoff={station.cutoff}
              cutoffMargin={station.cutoffMarginMinutes}
              fromPrev={{ km: station.fromPrevKm, minutes: station.fromPrevMinutes, gain: station.gainFromPrevM, loss: station.lossFromPrevM }}
              active={isNear(station.km)}
              onHover={onHoverKm}
            />
          ))}
          <TimelineRow
            kind="finish"
            title="Arrivée"
            km={finishKm}
            clock={plan.finishClock}
            elapsed={plan.totalMinutes}
            ele={profile[profile.length - 1]?.ele}
            onHover={onHoverKm}
            active={isNear(finishKm)}
            isLast
          />
        </ol>
      </div>

      {plan.sections.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-2xl">Sections</h3>
          <div className="overflow-x-auto rounded-2xl border border-[var(--glass-border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-normal">Section</th>
                  <th scope="col" className="px-4 py-3 font-normal">Tronçon</th>
                  <th scope="col" className="px-4 py-3 font-normal">{pacePrimary}</th>
                  <th scope="col" className="px-4 py-3 font-normal">Durée</th>
                  <th scope="col" className="px-4 py-3 font-normal">Pente moy.</th>
                  <th scope="col" className="px-4 py-3 font-normal">D+ / D−</th>
                  <th scope="col" className="px-4 py-3 font-normal">Entrée → sortie</th>
                </tr>
              </thead>
              <tbody>
                {plan.sections.map(section => (
                  <tr
                    key={section.id}
                    className={`border-t border-[var(--glass-border)] tabular-nums transition-colors ${
                      isWithin(section.fromKm, section.toKm) ? 'bg-[var(--accent-blue-light)]' : ''
                    }`}
                    {...hoverHandlers((section.fromKm + section.toKm) / 2)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: section.color }} />
                        {section.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{fmtKm(section.fromKm)} → {fmtKm(section.toKm)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {isCycling ? fmtSpeed(section.avgSpeedKmh) : formatPace(section.avgPaceMinKm)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDuration(section.minutes)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{fmtGrade(section.avgGrade)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{fmtGain(section.gainM, section.lossM)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{section.enterClock} → {section.exitClock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">Splits {isCycling ? 'par 10 km' : 'au kilomètre'}</h3>
          <Label>{plan.splits.length} tronçons</Label>
        </div>
        <div className="max-h-[28rem] overflow-auto rounded-2xl border border-[var(--glass-border)]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--chart-tooltip-bg)] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] shadow-[inset_0_-1px_0_var(--glass-border)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-normal">Km</th>
                <th scope="col" className="px-4 py-3 font-normal">{pacePrimary}</th>
                <th scope="col" className="px-4 py-3 font-normal">Temps</th>
                <th scope="col" className="px-4 py-3 font-normal">D+ / D−</th>
                <th scope="col" className="px-4 py-3 font-normal">Écoulé</th>
                <th scope="col" className="px-4 py-3 font-normal">Heure</th>
              </tr>
            </thead>
            <tbody>
              {plan.splits.map(split => (
                <tr
                  key={split.fromKm}
                  className={`border-t border-[var(--glass-border)] font-mono text-xs tabular-nums transition-colors ${
                    isWithin(split.fromKm, split.toKm) ? 'bg-[var(--accent-blue-light)]' : ''
                  }`}
                  {...hoverHandlers((split.fromKm + split.toKm) / 2)}
                >
                  <td className="px-4 py-2.5">{fmtNumber(split.fromKm, 0)} → {fmtKm(split.toKm)}</td>
                  <td className="px-4 py-2.5">{isCycling ? fmtSpeed(split.speedKmh) : formatPace(split.paceMinKm)}</td>
                  <td className="px-4 py-2.5">{formatDuration(split.minutes)}</td>
                  <td className="px-4 py-2.5">{fmtGain(split.gainM, split.lossM)}</td>
                  <td className="px-4 py-2.5">{formatDuration(split.elapsedMinutes)}</td>
                  <td className="px-4 py-2.5">{split.clock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
