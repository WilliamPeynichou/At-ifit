import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTrainingSummary } from '../../services/racesApi';
import api from '../../api';

const ACTIVITY_FACTORS = [
  { maxWeeklyHours: 1, factor: 1.2 },
  { maxWeeklyHours: 3, factor: 1.375 },
  { maxWeeklyHours: 6, factor: 1.55 },
  { maxWeeklyHours: 10, factor: 1.725 },
  { maxWeeklyHours: Infinity, factor: 1.9 },
];

const PROTEIN_G_PER_KG = 1.6;
const FAT_G_PER_KG = 1;
const FLUID_ML_PER_KG = 35;

function bmrMifflin({ weightKg, heightCm, age, gender }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'female') return base - 161;
  if (gender === 'male') return base + 5;
  return base - 78;
}

function activityFactorFromSummary(summary) {
  if (!summary?.bySport) return { factor: 1.4, weeklyHours: null };
  const weeklyHours = Object.values(summary.bySport).reduce((sum, sport) => sum + (Number(sport?.weeklyHours) || 0), 0);
  const tier = ACTIVITY_FACTORS.find(item => weeklyHours < item.maxWeeklyHours);
  return { factor: tier.factor, weeklyHours };
}

export function computeDailyNeeds({ user, weightKg, summary }) {
  const heightCm = Number(user?.height);
  const age = Number(user?.age);
  if (!weightKg || !heightCm || !age) return null;

  const bmr = bmrMifflin({ weightKg, heightCm, age, gender: user?.gender });
  const { factor, weeklyHours } = activityFactorFromSummary(summary);
  const tdee = bmr * factor;
  const targetKcal = Number(user?.consoKcal) > 0 ? Number(user.consoKcal) : null;
  const kcal = targetKcal ?? tdee;

  const proteinG = Math.round(PROTEIN_G_PER_KG * weightKg);
  const fatG = Math.round(FAT_G_PER_KG * weightKg);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    activityFactor: factor,
    weeklyHours,
    kcal: Math.round(kcal),
    kcalSource: targetKcal ? 'objectif calculé dans Calculateur kcal' : 'dépense estimée (pas d’objectif calculé)',
    proteinG,
    fatG,
    carbsG,
    carbsGPerKg: weightKg ? Number((carbsG / weightKg).toFixed(1)) : null,
    fluidMl: Math.round(FLUID_ML_PER_KG * weightKg / 50) * 50,
    weightKg,
  };
}

function Macro({ label, value, unit, hint }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </p>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

export default function DailyNeeds() {
  const [state, setState] = useState({ loading: true, needs: null, missing: [] });

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/user').then(r => r.data).catch(() => null),
      api.get('/weight').then(r => r.data?.data ?? r.data).catch(() => []),
      getTrainingSummary().catch(() => null),
    ]).then(([user, weights, summary]) => {
      if (!active) return;
      const list = Array.isArray(weights) ? weights : [];
      const latest = list[list.length - 1];
      const weightKg = latest?.weight ? Number(latest.weight) : null;
      const missing = [];
      if (!weightKg) missing.push('poids');
      if (!user?.height) missing.push('taille');
      if (!user?.age) missing.push('âge');
      const needs = computeDailyNeeds({ user, weightKg, summary });
      setState({ loading: false, needs, missing });
    });
    return () => { active = false; };
  }, []);

  if (state.loading) {
    return (
      <section className="glass-panel p-6 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Calcul de tes besoins journaliers...
      </section>
    );
  }

  const { needs, missing } = state;

  return (
    <section className="glass-panel p-6">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Mes besoins journaliers</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Calculés depuis ton poids, ta taille, ton âge et ton volume d’entraînement des 12 dernières semaines.
      </p>

      {!needs ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Renseigne {missing.length > 0 ? missing.join(', ') : 'tes données'} pour obtenir tes besoins :
          {' '}<Link to="/profile" className="underline" style={{ color: 'var(--accent-blue)' }}>mettre à jour mon profil</Link>
          {' '}et <Link to="/" className="underline" style={{ color: 'var(--accent-blue)' }}>enregistrer mon poids</Link>.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Macro label="Énergie" value={needs.kcal} unit="kcal/j" hint={needs.kcalSource} />
            <Macro label="Glucides" value={needs.carbsG} unit="g/j" hint={`${needs.carbsGPerKg} g/kg`} />
            <Macro label="Protéines" value={needs.proteinG} unit="g/j" hint={`${PROTEIN_G_PER_KG} g/kg`} />
            <Macro label="Lipides" value={needs.fatG} unit="g/j" hint={`${FAT_G_PER_KG} g/kg`} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Métabolisme de base {needs.bmr} kcal · dépense totale estimée {needs.tdee} kcal (facteur d’activité {needs.activityFactor}
            {needs.weeklyHours !== null ? `, ${needs.weeklyHours.toFixed(1)} h/semaine` : ', sans historique Strava'}).
            Boisson de base : environ {needs.fluidMl} ml/j, à adapter à la chaleur et à la sudation.
            Repères généraux, non médicaux.
          </p>
        </>
      )}
    </section>
  );
}

