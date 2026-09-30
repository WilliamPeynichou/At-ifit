import React from 'react';
import { Link } from 'react-router-dom';
import PersonalMl from '../components/predictions/PersonalMl';
import PertPlanner from '../components/predictions/PertPlanner';
import { ArrowLeft, FlaskConical, Activity, ShieldCheck } from 'lucide-react';

export default function MyPredictions() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6" style={{ color: 'var(--text-primary)' }}>
      <Link to="/profile" className="inline-flex items-center gap-2 rounded-lg p-2 focus-visible:outline focus-visible:outline-2"><ArrowLeft size={18} />Mon profil</Link>
      <header>
        <p className="text-sm font-semibold" style={{ color: 'var(--accent-blue)' }}>Profil athlète</p>
        <h1 className="text-4xl sm:text-5xl mt-2">Mes prédictions</h1>
        <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Comprendre tes estimations et les méthodes utilisées pour préparer tes prochaines sorties.</p>
      </header>
      <section className="glass-panel p-5 sm:p-6" aria-labelledby="current-prediction">
        <h2 id="current-prediction" className="text-2xl flex items-center gap-2"><Activity size={22} />Estimer une prochaine sortie</h2>
        <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Les estimations disponibles restent fondées sur les sorties comparables de ton historique. Le modèle ML expérimental ne remplace pas encore ce calcul.</p>
        <Link to="/preparer-course" className="btn-primary inline-flex mt-5">Préparer ma course</Link>
      </section>
      <PersonalMl />
      <PertPlanner />
      <section className="glass-panel p-5 sm:p-6" aria-labelledby="ml-prototype">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="ml-prototype" className="text-2xl flex items-center gap-2"><FlaskConical size={22} />Laboratoire ML · Vélo</h2>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}>Prototype hors ligne</span>
        </div>
        <p className="mt-4" role="status" style={{ color: 'var(--text-secondary)' }}>Le rapport et le formulaire ci-dessus utilisent uniquement le modèle personnel activé côté serveur. Sans activation, le laboratoire reste hors ligne ; aucune donnée d’un autre compte n’est affichée.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          {[
            ['Données de tes sorties passées', 'Puissance normalisée et dérive cardiaque, lorsque les capteurs le permettent. Aucune donnée de la sortie future utilisée.'],
            ['Données simulées', 'Montées, descentes, vent, ralentissements et arrêts. Elles aident à entraîner le prototype ; elles ne servent jamais à mesurer sa précision.'],
            ['Fourchette de durée', 'Intervalle nominal de 80 %, calibré sur les erreurs antérieures. Couverture réelle à vérifier : ce n’est pas une garantie.'],
            ['Validation chronologique', 'Comparaison sur de vraies sorties, puis bootstrap par blocs pour vérifier si le gain dépasse les fluctuations du petit échantillon.'],
          ].map(([title, description]) => <article key={title} className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}><h3 className="font-bold">{title}</h3><p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{description}</p></article>)}
        </div>
        <p className="text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>Cible du prototype : temps en mouvement d’une sortie vélo extérieure. Pas encore un pronostic de compétition ni une estimation du temps total avec arrêts.</p>
      </section>
      <aside className="glass-panel p-5 flex gap-3">
        <ShieldCheck size={22} className="shrink-0" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tes résultats doivent rester privés. Aucun rapport d’un autre athlète n’est affiché ici. Le prototype ne constitue pas un avis médical.</p>
      </aside>
    </main>
  );
}
