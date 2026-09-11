import React, { useState } from 'react';
import { Apple, Bike, Droplets, Zap, Clock, AlertTriangle, Info, Loader2, Salad, PersonStanding, Waves } from 'lucide-react';
import api from '../api';

const SPORTS = [
  { id: 'cycling', label: 'Vélo', icon: Bike, available: true },
  { id: 'running', label: 'Course à pied', icon: PersonStanding, available: true },
  { id: 'swimming', label: 'Natation', icon: Waves, available: true },
];

const GUT_TOLERANCE_OPTIONS = [
  { value: '', label: 'Non renseignée' },
  { value: 'low', label: 'Sensible' },
  { value: 'medium', label: 'Normale' },
  { value: 'high', label: 'Solide' },
  { value: 'trained', label: 'Entraînée (>90 g/h)' },
];

const SWEAT_PROFILE_OPTIONS = [
  { value: '', label: 'Non renseigné' },
  { value: 'low', label: 'Peu salée' },
  { value: 'normal', label: 'Normale' },
  { value: 'salty', label: 'Très salée (traces blanches)' },
];

const CONFIDENCE_COLORS = {
  faible: '#f97316',
  modérée: '#0055ff',
  élevée: '#22c55e',
  inconnue: 'var(--text-muted)',
};

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours > 0 ? `${hours} h ${String(mins).padStart(2, '0')}` : `${mins} min`;
}

function Range({ range, unit, digits = 0 }) {
  if (!range) return <span>-</span>;
  const fmt = (v) => Number(v).toFixed(digits);
  return (
    <span>
      <strong>{fmt(range.target)}</strong>
      <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
        {unit} · {fmt(range.low)}–{fmt(range.high)}
      </span>
    </span>
  );
}

function MetricCard({ icon, label, children, accent }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        {React.createElement(icon, { className: 'w-3.5 h-3.5', style: { color: accent } })}
        {label}
      </p>
      <p className="text-lg" style={{ color: 'var(--text-primary)' }}>{children}</p>
    </div>
  );
}

const Nutrition = () => {
  const [form, setForm] = useState({
    sport: 'cycling',
    distanceKm: '',
    elevationGainM: '',
    plannedStartAt: '',
    locationLabel: '',
    objectiveText: '',
    gutTolerance: '',
    sweatSodiumProfile: '',
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/nutrition/effort/preview', {
        sport: form.sport,
        distanceKm: Number(form.distanceKm),
        elevationGainM: form.elevationGainM === '' ? 0 : Number(form.elevationGainM),
        plannedStartAt: form.plannedStartAt || null,
        locationLabel: form.locationLabel || null,
        objectiveText: form.objectiveText || null,
        nutritionProfile: {
          gutTolerance: form.gutTolerance || undefined,
          sweatSodiumProfile: form.sweatSodiumProfile || undefined,
        },
      });
      setPlan(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de calculer le plan nutritionnel.');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const during = plan?.during;
  const effort = plan?.effort;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <Apple className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
          Nutrition
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Stratégie glucides, hydratation et sodium calculée depuis tes données Strava.
        </p>
      </div>

      <section className="glass-panel p-6 mb-8">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Nutrition pour mon effort
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Décris ton effort à venir : Atifit estime sa durée depuis tes sorties comparables puis en déduit tes besoins.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Sport</label>
            <div className="flex gap-3 flex-wrap">
              {SPORTS.map(sport => (
                <button
                  key={sport.id}
                  type="button"
                  disabled={!sport.available}
                  onClick={() => setForm(prev => ({ ...prev, sport: sport.id }))}
                  className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition"
                  style={{
                    background: form.sport === sport.id ? 'var(--accent-blue)' : 'var(--glass-bg)',
                    color: form.sport === sport.id ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--glass-border)',
                    opacity: sport.available ? 1 : 0.4,
                  }}
                >
                  <sport.icon className="w-4 h-4" />
                  {sport.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Distance (km)</label>
              <input
                type="number" name="distanceKm" value={form.distanceKm} onChange={handleChange}
                className="input-cyber" min="0.1" max="1000" step="0.1" required placeholder={form.sport === 'swimming' ? '3.8' : '120'}
              />
            </div>
            {form.sport !== 'swimming' && (
              <div>
                <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">D+ (m)</label>
                <input
                  type="number" name="elevationGainM" value={form.elevationGainM} onChange={handleChange}
                  className="input-cyber" min="0" max="20000" step="10" placeholder="1500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Lieu</label>
              <input
                type="text" name="locationLabel" value={form.locationLabel} onChange={handleChange}
                className="input-cyber" maxLength={120} placeholder="Annecy, France"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Date et heure</label>
              <input
                type="datetime-local" name="plannedStartAt" value={form.plannedStartAt}
                onChange={handleChange} className="input-cyber"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Tolérance digestive</label>
              <select name="gutTolerance" value={form.gutTolerance} onChange={handleChange} className="input-cyber">
                {GUT_TOLERANCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)' }}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Sueur</label>
              <select name="sweatSodiumProfile" value={form.sweatSodiumProfile} onChange={handleChange} className="input-cyber">
                {SWEAT_PROFILE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)' }}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Objectif</label>
            <textarea
              name="objectiveText" value={form.objectiveText} onChange={handleChange}
              className="input-cyber" rows={3} maxLength={1000}
              placeholder="Sortie soutenue de 120 km, objectif performance, j'ai du mal à manger solide après trois heures."
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Conservé avec ton plan. L'interprétation automatique par l'IA arrive dans une prochaine version :
              les calculs actuels reposent uniquement sur le formulaire.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-cyber flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? 'Calcul en cours...' : 'Calculer ma stratégie'}
          </button>
        </form>

        {error && (
          <div className="mt-5 p-4 rounded-lg flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f97316' }} />
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{error}</p>
          </div>
        )}
      </section>

      {plan && (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Scénario d'effort estimé</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard icon={Clock} label="Durée" accent="var(--accent-blue)">
                {formatDuration(effort.estimatedDurationMinutes.target)}
                <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                  {formatDuration(effort.estimatedDurationMinutes.low)}–{formatDuration(effort.estimatedDurationMinutes.high)}
                </span>
              </MetricCard>
              <MetricCard icon={Zap} label="Dépense" accent="#eab308">
                <Range range={effort.estimatedEnergyKcal} unit="kcal" />
              </MetricCard>
              <MetricCard icon={Droplets} label="Stress thermique" accent="#ef4444">
                {effort.heatStress}
              </MetricCard>
              <MetricCard icon={Info} label="Confiance" accent={CONFIDENCE_COLORS[plan.confidence.label]}>
                <span style={{ color: CONFIDENCE_COLORS[plan.confidence.label] }}>{plan.confidence.label}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                  {effort.comparableActivitiesCount} sorties comparables
                </span>
              </MetricCard>
            </div>
          </section>

          <section className="glass-panel p-6 mb-8" style={{ borderColor: 'var(--accent-blue)' }}>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Pendant l'effort</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Cibles horaires à respecter. Les totaux sont calculés sur la durée cible.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetricCard icon={Zap} label="Glucides" accent="#eab308">
                <Range range={during.carbohydratesGPerHour} unit="g/h" />
                <span className="block text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Total : {during.carbohydratesTotalG.target} g
                </span>
              </MetricCard>
              <MetricCard icon={Droplets} label="Hydratation" accent="#0055ff">
                <Range range={during.fluidMlPerHour} unit="ml/h" />
                <span className="block text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Total : {(during.fluidTotalMl.target / 1000).toFixed(1)} L
                </span>
              </MetricCard>
              <MetricCard icon={Salad} label="Sodium" accent="#22c55e">
                <Range range={during.sodiumMgPerHour} unit="mg/h" />
                <span className="block text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Total : {during.sodiumTotalMg.target} mg
                </span>
              </MetricCard>
            </div>

            {during.timeline.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Chronologie · toutes les {during.feedingIntervalMinutes} min
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: 'var(--text-muted)' }}>
                        <th className="text-left py-2">Temps</th>
                        <th className="text-right py-2">Glucides</th>
                        <th className="text-right py-2">Boisson</th>
                        <th className="text-right py-2">Sodium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {during.timeline.slice(0, 12).map(step => (
                        <tr key={step.atMinute} style={{ borderTop: '1px solid var(--glass-border)' }}>
                          <td className="py-2" style={{ color: 'var(--text-primary)' }}>{formatDuration(step.atMinute)}</td>
                          <td className="py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{step.carbohydratesG} g</td>
                          <td className="py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{step.fluidMl} ml</td>
                          <td className="py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{step.sodiumMg} mg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {during.timeline.length > 12 && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      +{during.timeline.length - 12} prises supplémentaires au même rythme.
                    </p>
                  )}
                </div>
                <p className="text-xs mt-4 p-3 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--glass-bg)' }}>
                  À emporter pour le scénario long ({formatDuration(during.carryReserve.basedOnDurationMinutes)}) :
                  {' '}{during.carryReserve.carbohydratesG} g de glucides, {(during.carryReserve.fluidMl / 1000).toFixed(1)} L,
                  {' '}{during.carryReserve.sodiumMg} mg de sodium. {during.carryReserve.note}
                </p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <section className="glass-panel p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Avant</h2>
              {plan.before.available ? (
                <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Glucides :</strong> <Range range={plan.before.carbohydratesG} unit="g" /></p>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Boisson :</strong> <Range range={plan.before.fluidMl} unit="ml" /></p>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Sodium :</strong> <Range range={plan.before.sodiumMg} unit="mg" /></p>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Timing :</strong> repas {plan.before.timing.mealHoursBefore} h avant, collation {plan.before.timing.snackMinutesBefore} min avant.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {plan.before.guidance.map(g => <li key={g}>{g}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{plan.before.reason}</p>
              )}
            </section>

            <section className="glass-panel p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Après</h2>
              {plan.after.available ? (
                <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Glucides :</strong> <Range range={plan.after.carbohydratesG} unit="g" /></p>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Protéines :</strong> <Range range={plan.after.proteinG} unit="g" /></p>
                  {plan.after.fluidMl && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Réhydratation :</strong> <Range range={plan.after.fluidMl} unit="ml" /></p>
                  )}
                  <p><strong style={{ color: 'var(--text-primary)' }}>Première prise :</strong> {plan.after.timing.firstIntakeMinutes} min après l'arrivée.</p>
                  <p>{plan.after.timing.note}</p>
                  <p>{plan.after.sodiumGuidance}</p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{plan.after.reason}</p>
              )}
            </section>
          </div>

          {plan.warnings.length > 0 && (
            <section className="glass-panel p-6 mb-6" style={{ borderColor: 'rgba(249,115,22,0.4)' }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#f97316' }}>
                <AlertTriangle className="w-5 h-5" /> Points de vigilance
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {plan.warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            </section>
          )}

          <section className="glass-panel p-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Info className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /> Hypothèses et limites
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {plan.assumptions.map(a => <li key={a}>{a}</li>)}
            </ul>
            {plan.missingData.length > 0 && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Données manquantes : {plan.missingData.join(', ')}. Les compléter améliorera la précision.
              </p>
            )}
            <p className="text-xs pt-4" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)' }}>
              {plan.disclaimer}
              <br />
              Moteur v{plan.algorithmVersion} · référentiel scientifique v{plan.knowledgeVersion}
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default Nutrition;
