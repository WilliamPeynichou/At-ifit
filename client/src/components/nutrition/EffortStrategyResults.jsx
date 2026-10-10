import React, { useMemo } from 'react';
import { AlertTriangle, Bike, Clock, Droplets, Info, Salad, PersonStanding, Waves, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AUBINEAU_SOURCE, getModelsByAthleteProfile, getProductRecommendations } from '../../data/nutritionKnowledge';
import { CONFIDENCE_COLORS, formatDuration, MetricCard, Range } from './NutritionUi';

export function EffortStrategyResults({ plan, sport, gutTolerance, sweatSodiumProfile }) {
  const during = plan?.during;
  const effort = plan?.effort;

  const productRecommendations = useMemo(() => (plan ? getProductRecommendations({
    sport,
    durationMinutes: effort?.estimatedDurationMinutes?.target,
    heatStress: effort?.heatStress,
  }) : []), [plan, sport, effort]);

  const athleteProfiles = useMemo(() => (plan ? getModelsByAthleteProfile({
    durationMinutes: effort?.estimatedDurationMinutes?.target,
    gutTolerance,
    sweatSodiumProfile,
    heatStress: effort?.heatStress,
  }) : []), [plan, effort, gutTolerance, sweatSodiumProfile]);

  if (!plan) return null;

  return (
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

      {effort.legs && (
        <section className="glass-panel p-6 mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Détail des disciplines</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['swimming', 'Natation', Waves],
              ['cycling', 'Vélo', Bike],
              ['running', 'Course à pied', PersonStanding],
            ].map(([key, label, Icon]) => (
              <MetricCard key={key} icon={Icon} label={label} accent="var(--accent-blue)">
                {formatDuration(effort.legs[key].estimatedDurationMinutes.target)}
                <span className="block text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {effort.legs[key].estimatedEnergyKcal.target} kcal
                </span>
              </MetricCard>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Transitions T1 + T2 : {formatDuration(effort.transitionMinutes)}
          </p>
        </section>
      )}

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

      <section className="glass-panel p-6 mb-8">
        <h2 className="text-xl font-bold mb-1">Produits adaptés à ce scénario</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Sélection issue des PDF comparatifs. Elle aide à choisir un format, sans remplacer les cibles calculées ci-dessus.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {productRecommendations.map(category => {
            const product = category.products[0];
            return (
              <article key={category.id} className="glass-card p-5">
                <p className="font-mono text-xs uppercase" style={{ color: 'var(--accent-blue)' }}>{category.title} · comparatif {category.edition}</p>
                <h3 className="text-lg mt-2">#{product.rank} {product.model}</h3>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {product.dose || product.format} · {product.carbohydratesG} g glucides · {product.sodiumMg} mg sodium
                  {product.proteinG ? ` · ${product.proteinG} g protéines` : ''}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Scores PDF : qualité {product.qualityScore} · qualité/prix {product.valueScore}. {category.dataBasis}</p>
              </article>
            );
          })}
        </div>
        <Link to="/nutrition/comparatifs" className="btn-ghost inline-flex items-center gap-2 mt-5">Comparer les trois premiers modèles</Link>
      </section>

      <section className="glass-panel p-6 mb-8">
        <h2 className="text-xl font-bold mb-1">Modèles par type d’athlète</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Ton profil est mis en avant selon la tolérance digestive, la sueur et la durée estimée. Les autres profils
          restent visibles pour comparer.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {athleteProfiles.map(profile => (
            <article
              key={profile.id}
              className="glass-card p-5"
              style={profile.matches ? { borderColor: 'var(--accent-blue)', borderWidth: '2px' } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg">{profile.label}</h3>
                {profile.matches && (
                  <span className="text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
                    Ton profil
                  </span>
                )}
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{profile.summary}</p>
              <ul className="mt-4 space-y-2">
                {profile.products.map(product => (
                  <li key={`${profile.id}-${product.model}`} className="text-sm">
                    <strong>{product.model}</strong>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {product.categoryTitle} {product.edition} · {product.dose || product.format} · {product.carbohydratesG} g glucides · {product.sodiumMg} mg sodium
                      {product.proteinG ? ` · ${product.proteinG} g protéines` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>{profile.advice}</p>
            </article>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Modèles tirés des comparatifs de {AUBINEAU_SOURCE.author}. Ils complètent les cibles calculées, ils ne les
          remplacent pas. Tester chaque produit à l’entraînement.
        </p>
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
  );
}
