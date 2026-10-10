import React, { useState } from 'react';
import { AlertTriangle, Loader2, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import AidNutritionPlan from '../course-planner/AidNutritionPlan';
import { EffortStrategyResults } from '../nutrition/EffortStrategyResults';
import { previewEffortStrategy } from '../../services/nutritionApi';
import { buildEffortInput } from './raceModel';
import { StepHeader, cardStyle } from './steps';

const LEG_TITLES = { cycling: 'Vélo', running: 'Course à pied' };

export default function StepNutrition({ form, legs, strategy, onStrategy, profile }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rates = strategy?.during ? {
    carbs: strategy.during.carbohydratesGPerHour.target,
    fluid: strategy.during.fluidMlPerHour.target,
    sodium: strategy.during.sodiumMgPerHour.target,
  } : null;

  const compute = async () => {
    setBusy(true);
    setError('');
    try {
      onStrategy(await previewEffortStrategy(buildEffortInput(form), profile || {}));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de calculer la stratégie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <StepHeader
          step={4}
          title="Nutrition le jour J"
          text="La stratégie reprend ton profil nutrition général (tolérance digestive, sueur) et les données de la course. Elle sert ensuite à calculer ce qu’il faut emporter à chaque ravito."
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Profil : tolérance <strong>{profile?.gutTolerance || 'medium'}</strong> · sueur <strong>{profile?.sweatSodiumProfile || 'normal'}</strong>
          </p>
          <Link to="/nutrition" className="btn-ghost inline-flex items-center gap-2 self-start">Modifier mon profil nutrition</Link>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={compute} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Utensils size={18} />}
          {busy ? 'Calcul en cours…' : strategy ? 'Recalculer la stratégie' : 'Calculer ma stratégie'}
        </button>
        {error && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}
      </div>

      {strategy && (
        <div className="glass-panel p-5 sm:p-6" aria-live="polite">
          <EffortStrategyResults
            plan={strategy}
            sport={form.sport}
            gutTolerance={profile?.gutTolerance}
            sweatSodiumProfile={profile?.sweatSodiumProfile}
          />
        </div>
      )}

      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: '#788c5d' }}>Ravitos</p>
          <h3 className="text-xl mt-1">Ravitaillements du parcours</h3>
          {!strategy && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Valeurs par défaut tant que la stratégie n’est pas calculée.</p>}
        </div>
        {legs.length === 0 && (
          <div className="rounded-xl p-4 text-sm" style={cardStyle}>
            Pas de ravitaillement à planifier pour cette discipline. Utilise les apports par heure de la stratégie ci-dessus.
          </div>
        )}
        {legs.map(leg => (
          <div key={leg.key} className="space-y-3">
            {leg.key !== 'single' && <p className="font-bold">{LEG_TITLES[leg.key]}</p>}
            <AidNutritionPlan plan={leg.plan} nutrition={rates} />
          </div>
        ))}
      </div>
    </section>
  );
}
