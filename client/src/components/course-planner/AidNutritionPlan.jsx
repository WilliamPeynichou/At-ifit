import React, { useMemo } from 'react';
import { Droplets, Flame, Package, Zap } from 'lucide-react';
import { formatDuration } from '../../utils/gpxCourse';

const GEL_CARBS_G = 25;
const FLASK_ML = 500;

function defaultRates(totalMinutes) {
  if (totalMinutes < 75) return { carbs: 30, fluid: 450, sodium: 300 };
  if (totalMinutes < 150) return { carbs: 60, fluid: 550, sodium: 450 };
  return { carbs: 75, fluid: 600, sodium: 600 };
}

export default function AidNutritionPlan({ plan, nutrition }) {
  const rates = nutrition || defaultRates(plan.totalMinutes);

  const legs = useMemo(() => {
    const points = [
      { id: 'start', name: 'Départ', km: 0, clock: plan.clockAt(0), leaveMinutes: 0 },
      ...plan.stations.map(s => ({ id: s.id, name: s.name, km: s.km, kind: s.kind, clock: s.clock, leaveMinutes: s.departureMinutes })),
    ];
    return points.map((point, index) => {
      const next = plan.stations[index];
      const untilKm = next ? next.km : plan.timeline[plan.timeline.length - 1].km;
      const untilMinutes = next ? next.arrivalMinutes : plan.totalMinutes;
      const hours = Math.max(0, untilMinutes - point.leaveMinutes) / 60;
      const carbs = Math.round(rates.carbs * hours);
      const fluid = Math.round((rates.fluid * hours) / 50) * 50;
      return {
        ...point,
        nextName: next ? next.name : 'Arrivée',
        distanceKm: untilKm - point.km,
        minutes: hours * 60,
        carbs,
        fluid,
        sodium: Math.round((rates.sodium * hours) / 10) * 10,
        gels: Math.max(0, Math.ceil(carbs / GEL_CARBS_G)),
        flasks: Math.max(0, Math.ceil(fluid / FLASK_ML)),
        canRefill: index === 0 || point.kind !== 'checkpoint',
      };
    });
  }, [plan, rates]);

  const totals = legs.reduce((acc, leg) => ({ carbs: acc.carbs + leg.carbs, fluid: acc.fluid + leg.fluid, sodium: acc.sodium + leg.sodium }), { carbs: 0, fluid: 0, sodium: 0 });
  const longestLeg = legs.reduce((max, leg) => (leg.minutes > max.minutes ? leg : max), legs[0]);

  return (
    <section className="glass-panel p-5 sm:p-6" style={{ borderColor: '#788c5d' }}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: '#788c5d' }}>Nutrition × ravitos</p>
          <h2 className="text-2xl mt-1">Quoi prendre à chaque ravito</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Quantités à emporter pour tenir jusqu’au point suivant, à {rates.carbs} g glucides · {rates.fluid} ml · {rates.sodium} mg sodium par heure
            {nutrition ? ' (ta stratégie calculée).' : ' (valeurs par défaut : construis ton plan pour les personnaliser).'}
          </p>
        </div>
        <dl className="flex flex-wrap gap-2 text-xs">
          {[[Zap, `${totals.carbs} g`], [Droplets, `${(totals.fluid / 1000).toFixed(1)} L`], [Flame, `${(totals.sodium / 1000).toFixed(1)} g Na`]].map(([icon, value]) => (
            <div key={value} className="rounded-lg px-3 py-1.5 flex items-center gap-1.5" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              {React.createElement(icon, { size: 13 })}<strong className="tabular-nums">{value}</strong>
            </div>
          ))}
        </dl>
      </div>

      <ol className="space-y-2">
        {legs.map(leg => (
          <li key={leg.id} className="grid grid-cols-2 md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-3 items-center rounded-xl p-3"
            style={{ background: 'var(--surface-subtle)', border: leg === longestLeg && legs.length > 1 ? '1px solid #d97757' : '1px solid var(--glass-border)' }}>
            <div className="col-span-2 md:col-span-1 min-w-0">
              <p className="font-bold truncate">{leg.name} <span className="font-mono text-xs font-normal" style={{ color: 'var(--text-muted)' }}>km {leg.km.toFixed(1)} · {leg.clock}</span></p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                → {leg.nextName} · {leg.distanceKm.toFixed(1)} km · {formatDuration(leg.minutes)}
                {leg === longestLeg && legs.length > 1 && <span style={{ color: '#d97757' }}> · plus long tronçon en autonomie</span>}
              </p>
            </div>
            <p className="text-sm"><Zap size={13} className="inline mr-1" />{leg.carbs} g</p>
            <p className="text-sm"><Droplets size={13} className="inline mr-1" />{leg.fluid} ml</p>
            <p className="text-sm"><Flame size={13} className="inline mr-1" />{leg.sodium} mg</p>
            <p className="text-sm font-bold"><Package size={13} className="inline mr-1" />{leg.gels} gel{leg.gels > 1 ? 's' : ''} · {leg.flasks} flasque{leg.flasks > 1 ? 's' : ''}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
        Équivalences : gel ≈ {GEL_CARBS_G} g de glucides, flasque {FLASK_ML} ml. Fractionne les prises toutes les 15–20 min et teste tout à l’entraînement.
      </p>
    </section>
  );
}
