import { useId, useMemo, useState } from 'react';
import { AlertTriangle, Droplets, Flag, Plus, Trash2, Users, Utensils } from 'lucide-react';
import { formatDuration, formatPace } from '../../utils/gpxCourse';

const SECTION_COLORS = ['#6a9bcc', '#788c5d', '#d97757', '#e0b25a', '#b07aa1', '#3b5f8a'];
const DANGER = '#c2410c';
const OK = '#788c5d';

const SECTION_MODES = [
  { value: 'pace', label: 'Allure imposée', unit: 'min/km' },
  { value: 'speed', label: 'Vitesse imposée', unit: 'km/h' },
  { value: 'intensity', label: 'Intensité relative', unit: '%' },
];

const KIND_META = {
  aid: { label: 'Ravitaillement', Icon: Utensils },
  water: { label: 'Point d’eau', Icon: Droplets },
  crew: { label: 'Assistance', Icon: Users },
  checkpoint: { label: 'Contrôle', Icon: Flag },
};

const ICON_BUTTON = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:text-(--accent-blue) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-blue)';

const makeId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const round2 = value => Math.round(value * 100) / 100;
const formatKm = value => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const formatOneDecimal = value => Number(value).toFixed(1).replace('.', ',');
const isBlank = text => String(text).trim() === '';
const parseDecimal = text => (isBlank(text) ? NaN : Number(String(text).trim().replace(',', '.')));
const toDraft = value => (Number.isFinite(value) ? String(value).replace('.', ',') : '');
const modeUnit = mode => SECTION_MODES.find(m => m.value === mode)?.unit ?? '';

function defaultValueFor(mode, sport) {
  if (mode === 'intensity') return 100;
  if (mode === 'speed') return sport === 'cycling' ? 25 : 10;
  return 6;
}

function sectionIssue(section, all, distanceKm) {
  if (!(section.toKm > section.fromKm)) return 'Le km de fin doit être supérieur au km de début.';
  if (section.fromKm < 0 || section.toKm > distanceKm + 0.01) return `Hors parcours : la trace fait ${formatKm(distanceKm)} km.`;
  if (!(Number(section.value) > 0)) return 'Renseignez une valeur positive.';
  const overlap = all.find(o => o.id !== section.id && section.fromKm < o.toKm && section.toKm > o.fromKm);
  if (overlap) return `Chevauche « ${overlap.name} ».`;
  return null;
}

function stationIssue(station, distanceKm) {
  if (!(station.km >= 0 && station.km <= distanceKm + 0.01)) return `Km hors parcours (0 à ${formatKm(distanceKm)} km).`;
  if (!(Number(station.stopMinutes) >= 0)) return 'Durée d’arrêt invalide.';
  return null;
}

function Field({ id, label, hint, className = '', children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {hint && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}

function NumberField({ id, label, value, onCommit, unit, hint, invalid }) {
  const [draft, setDraft] = useState(() => toDraft(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (parseDecimal(draft) !== value) setDraft(toDraft(value));
  }

  return (
    <Field id={id} label={label} hint={hint}>
      <span className="relative block">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-invalid={invalid || undefined}
          onChange={e => {
            const text = e.target.value;
            setDraft(text);
            const next = parseDecimal(text);
            if (Number.isFinite(next) && next !== value) onCommit(next);
          }}
          onBlur={() => setDraft(toDraft(value))}
          className="input-cyber w-full font-mono text-sm"
          style={{ paddingRight: unit ? '3.5rem' : undefined, borderColor: invalid ? DANGER : undefined }}
        />
        {unit && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </span>
    </Field>
  );
}

function Metrics({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-5" style={{ borderColor: 'var(--glass-border)' }}>
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</dt>
          <dd className="truncate font-mono text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IssueLine({ message }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-xs" style={{ color: DANGER }}>
      <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
      {message}
    </p>
  );
}

function SectionRow({ section, sport, issue, result, onPatch, onRemove, onHoverKm }) {
  const uid = useId();
  const modeOptions = SECTION_MODES.filter(m => sport !== 'cycling' || m.value !== 'pace' || section.mode === 'pace');
  const paceHint = section.mode === 'pace' && Number.isFinite(section.value) && section.value > 0
    ? `soit ${formatPace(section.value)}`
    : null;

  return (
    <li
      className="space-y-4 rounded-2xl border p-4"
      style={{ borderColor: issue ? DANGER : 'var(--glass-border)', background: 'var(--surface-subtle)' }}
      onMouseEnter={() => onHoverKm?.((section.fromKm + section.toKm) / 2)}
      onMouseLeave={() => onHoverKm?.(null)}
    >
      <div className="flex items-end gap-3">
        <Field id={`${uid}-name`} label="Nom" className="flex-1">
          <input
            id={`${uid}-name`}
            type="text"
            maxLength={60}
            value={section.name}
            onChange={e => onPatch({ name: e.target.value })}
            className="input-cyber w-full text-sm"
          />
        </Field>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Supprimer la section ${section.name}`}
          className={ICON_BUTTON}
          style={{ color: 'var(--text-muted)', borderColor: 'var(--glass-border)' }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField id={`${uid}-from`} label="Du km" value={section.fromKm} unit="km" invalid={!!issue} onCommit={fromKm => onPatch({ fromKm })} />
        <NumberField id={`${uid}-to`} label="Au km" value={section.toKm} unit="km" invalid={!!issue} onCommit={toKm => onPatch({ toKm })} />
        <Field id={`${uid}-mode`} label="Mode">
          <select
            id={`${uid}-mode`}
            value={section.mode}
            onChange={e => onPatch({ mode: e.target.value, value: defaultValueFor(e.target.value, sport) })}
            className="input-cyber w-full text-sm"
          >
            {modeOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <NumberField
          id={`${uid}-value`}
          label="Valeur"
          value={section.value}
          unit={modeUnit(section.mode)}
          hint={paceHint}
          onCommit={value => onPatch({ value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Couleur de la section">
        {SECTION_COLORS.map(color => {
          const selected = section.color === color;
          return (
            <button
              key={color}
              type="button"
              aria-label={`Couleur ${color}`}
              aria-pressed={selected}
              onClick={() => onPatch({ color })}
              className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-blue)"
              style={{ background: color, borderColor: selected ? 'var(--text-secondary)' : 'transparent' }}
            />
          );
        })}
      </div>

      {issue && <IssueLine message={issue} />}
      {result && (
        <Metrics
          items={[
            ['Durée', formatDuration(result.minutes)],
            ['Allure', formatPace(result.avgPaceMinKm)],
            ['Vitesse', `${formatOneDecimal(result.avgSpeedKmh)} km/h`],
            ['D+ / D−', `${result.gainM} / ${result.lossM} m`],
            ['Passage', `${result.enterClock} → ${result.exitClock}`],
          ]}
        />
      )}
    </li>
  );
}

function StationRow({ station, issue, result, onPatch, onRemove, onHoverKm }) {
  const uid = useId();
  const meta = KIND_META[station.kind] ?? KIND_META.aid;
  const { Icon } = meta;
  const margin = result?.cutoffMarginMinutes ?? null;

  return (
    <li
      className="space-y-4 rounded-2xl border p-4"
      style={{ borderColor: issue ? DANGER : 'var(--glass-border)', background: 'var(--surface-subtle)' }}
      onMouseEnter={() => onHoverKm?.(station.km)}
      onMouseLeave={() => onHoverKm?.(null)}
      onFocus={() => onHoverKm?.(station.km)}
      onBlur={() => onHoverKm?.(null)}
    >
      <div className="flex items-end gap-3">
        <span
          aria-hidden="true"
          className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}
        >
          <Icon size={18} />
        </span>
        <Field id={`${uid}-name`} label="Nom" className="flex-1">
          <input
            id={`${uid}-name`}
            type="text"
            maxLength={60}
            value={station.name}
            onChange={e => onPatch({ name: e.target.value })}
            className="input-cyber w-full text-sm"
          />
        </Field>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Supprimer ${station.name}`}
          className={ICON_BUTTON}
          style={{ color: 'var(--text-muted)', borderColor: 'var(--glass-border)' }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField id={`${uid}-km`} label="Km" value={station.km} unit="km" invalid={!!issue} onCommit={km => onPatch({ km })} />
        <NumberField id={`${uid}-stop`} label="Arrêt" value={station.stopMinutes} unit="min" invalid={!!issue} onCommit={stopMinutes => onPatch({ stopMinutes })} />
        <Field id={`${uid}-kind`} label="Type">
          <select id={`${uid}-kind`} value={station.kind} onChange={e => onPatch({ kind: e.target.value })} className="input-cyber w-full text-sm">
            {Object.entries(KIND_META).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id={`${uid}-cutoff`} label="Barrière horaire">
          <input
            id={`${uid}-cutoff`}
            type="time"
            value={station.cutoff ?? ''}
            onChange={e => onPatch({ cutoff: e.target.value || undefined })}
            className="input-cyber w-full font-mono text-sm"
          />
        </Field>
      </div>

      {issue && <IssueLine message={issue} />}
      {margin !== null && (
        <p className="font-mono text-xs" style={{ color: margin < 0 ? DANGER : OK }}>
          {margin < 0 ? `Barrière dépassée de ${formatDuration(-margin)}` : `Marge de ${formatDuration(margin)} avant la barrière`}
        </p>
      )}
      {result && (
        <Metrics
          items={[
            ['Passage', result.clock],
            ['Écoulé', formatDuration(result.arrivalMinutes)],
            ['Depuis précédent', `${formatKm(result.fromPrevKm)} km · ${formatDuration(result.fromPrevMinutes)}`],
            ['D+ / D−', `${result.gainFromPrevM} / ${result.lossFromPrevM} m`],
            ['Altitude', `${result.ele} m`],
          ]}
        />
      )}
    </li>
  );
}

function EmptyState({ children }) {
  return (
    <p className="rounded-2xl border border-dashed p-5 text-sm" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>
      {children}
    </p>
  );
}

function PanelHeader({ id, eyebrow, title, action }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{eyebrow}</p>
        <h3 id={id} className="mt-1 text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </header>
  );
}

export default function CourseEditors({
  distanceKm,
  sport = 'running',
  sections,
  aidStations,
  plan,
  onSectionsChange,
  onAidStationsChange,
  onHoverKm,
}) {
  const uid = useId();
  const planSections = useMemo(() => new Map((plan?.sections || []).map(s => [s.id, s])), [plan]);
  const planStations = useMemo(() => new Map((plan?.stations || []).map(s => [s.id, s])), [plan]);
  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.fromKm - b.fromKm), [sections]);
  const sortedStations = useMemo(() => [...aidStations].sort((a, b) => a.km - b.km), [aidStations]);

  const patchSection = (id, patch) => onSectionsChange(sections.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = id => onSectionsChange(sections.filter(s => s.id !== id));
  const addSection = () => {
    const last = sortedSections[sortedSections.length - 1];
    const fromKm = last ? round2(Math.min(last.toKm, distanceKm)) : 0;
    const toKm = round2(Math.min(distanceKm, fromKm + Math.max(1, distanceKm / 4)));
    const mode = sport === 'cycling' ? 'speed' : 'pace';
    onSectionsChange([
      ...sections,
      {
        id: makeId('section'),
        name: `Section ${sections.length + 1}`,
        fromKm,
        toKm,
        mode,
        value: defaultValueFor(mode, sport),
        color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      },
    ]);
  };

  const patchStation = (id, patch) => onAidStationsChange(aidStations.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const removeStation = id => onAidStationsChange(aidStations.filter(s => s.id !== id));
  const addStation = () => {
    const last = sortedStations[sortedStations.length - 1];
    const km = last ? round2(Math.min(distanceKm, last.km + distanceKm / 8)) : round2(distanceKm / 2);
    onAidStationsChange([
      ...aidStations,
      { id: makeId('station'), name: `Ravitaillement ${aidStations.length + 1}`, km, stopMinutes: 3, kind: 'aid' },
    ]);
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-3xl p-5 sm:p-6" aria-labelledby={`${uid}-sections-title`}>
        <PanelHeader
          id={`${uid}-sections-title`}
          eyebrow="Tronçons"
          title="Allures par section"
          action={(
            <button type="button" onClick={addSection} className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm">
              <Plus size={16} aria-hidden="true" />
              Ajouter une section
            </button>
          )}
        />
        {sortedSections.length === 0 ? (
          <EmptyState>Aucune section : le temps est réparti sur tout le parcours selon l’effort.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {sortedSections.map(section => (
              <SectionRow
                key={section.id}
                section={section}
                sport={sport}
                issue={sectionIssue(section, sections, distanceKm)}
                result={planSections.get(section.id)}
                onPatch={patch => patchSection(section.id, patch)}
                onRemove={() => removeSection(section.id)}
                onHoverKm={onHoverKm}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="glass-panel rounded-3xl p-5 sm:p-6" aria-labelledby={`${uid}-stations-title`}>
        <PanelHeader
          id={`${uid}-stations-title`}
          eyebrow="Ravitaillements"
          title={`Points de passage · ${sortedStations.length}`}
          action={(
            <button type="button" onClick={addStation} className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm">
              <Plus size={16} aria-hidden="true" />
              Ajouter un point
            </button>
          )}
        />
        {sortedStations.length === 0 ? (
          <EmptyState>Aucun ravitaillement défini. Ajoutez-en pour calculer les arrêts et les barrières horaires.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {sortedStations.map(station => (
              <StationRow
                key={station.id}
                station={station}
                issue={stationIssue(station, distanceKm)}
                result={planStations.get(station.id)}
                onPatch={patch => patchStation(station.id, patch)}
                onRemove={() => removeStation(station.id)}
                onHoverKm={onHoverKm}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
