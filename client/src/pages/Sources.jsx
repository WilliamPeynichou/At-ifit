import React from 'react';
import { ArrowUpRight, BookOpen, Database, FileText, Info, Link2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AUBINEAU_SOURCE, PRODUCT_COMPARISONS } from '../data/nutritionKnowledge';

/** Documents de Nicolas Aubineau exploités pour les conseils et les comparatifs. */
const AUBINEAU_DOCUMENTS = [
  {
    title: 'Articles de ravitaillement',
    detail: 'Semi-marathon, marathon, trail court, trail long et ultra, triathlon.',
    usedFor: 'Protocoles par format de course, règles de base, régime dissocié modifié.',
  },
  {
    title: 'Comparatif des gels énergétiques',
    detail: 'PDF 2026 · valeurs normalisées à 25 g de gel.',
    usedFor: 'Comparer glucides, sodium, qualité et qualité/prix des gels à base commune.',
    route: '/nutrition/comparatifs?categorie=gels',
  },
  {
    title: 'Comparatif des barres énergétiques',
    detail: 'PDF 2025 · valeurs ramenées à 40 g de barre.',
    usedFor: 'Comparer glucides, protéines, sodium, qualité et qualité/prix à portion comparable.',
    route: '/nutrition/comparatifs?categorie=bars',
  },
  {
    title: 'Comparatif des boissons de l’effort',
    detail: 'PDF 2026 · valeurs par bidon de 500 ml.',
    usedFor: 'Comparer glucides, sodium, ratio sucres/glucides, qualité et qualité/prix.',
    route: '/nutrition/comparatifs?categorie=drinks',
  },
  {
    title: 'Comparatif des boissons de récupération',
    detail: 'PDF 2024 · valeurs par dose conseillée.',
    usedFor: 'Comparer glucides, protéines, sodium, qualité et qualité/prix des produits de récupération.',
    route: '/nutrition/comparatifs?categorie=recovery',
  },
  {
    title: 'Comparatif des boissons électrolytes',
    detail: 'PDF 2024 · valeurs par bidon de 500 ml.',
    usedFor: 'Comparer sodium, glucides, qualité et qualité/prix ; ces produits ne couvrent pas seuls les glucides.',
    route: '/nutrition/comparatifs?categorie=electrolytes',
  },
];

/** Littérature scientifique du référentiel versionné côté serveur. */
const SCIENTIFIC_REFERENCES = [
  {
    citation: 'Jeukendrup A. A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med. 2014;44(S1):25-33.',
    usedFor: 'Glucides pendant l’effort.',
  },
  {
    citation: 'Thomas DT, Erdman KA, Burke LM. ACSM Position Stand: Nutrition and Athletic Performance. Med Sci Sports Exerc. 2016;48(3):543-568.',
    usedFor: 'Glucides, protéines de récupération, hydratation.',
  },
  {
    citation: 'Sawka MN et al. ACSM Position Stand: Exercise and Fluid Replacement. Med Sci Sports Exerc. 2007;39(2):377-390.',
    usedFor: 'Hydratation et sodium pendant l’effort.',
  },
  {
    citation: 'Hew-Butler T et al. Statement of the 3rd International Exercise-Associated Hyponatremia Consensus. Clin J Sport Med. 2015;25(4):303-320.',
    usedFor: 'Plafond de sécurité hydrique, prévention de l’hyponatrémie.',
  },
  {
    citation: 'Burke LM, Hawley JA, Wong SH, Jeukendrup AE. Carbohydrates for training and competition. J Sports Sci. 2011;29(S1):S17-27.',
    usedFor: 'Glucides avant l’effort et en récupération.',
  },
];

/** Origine des données personnelles et contextuelles affichées dans l’application. */
const DATA_SOURCES = [
  {
    name: 'Strava',
    detail: 'Activités synchronisées via l’API officielle après autorisation explicite.',
    usedFor: 'Durées estimées, dépense énergétique, sorties comparables, statistiques et profils d’effort.',
  },
  {
    name: 'CARTO',
    detail: 'Service cartographique utilisé côté serveur avec un jeton d’accès stocké en variable d’environnement.',
    usedFor: 'Fonds de carte et couches géographiques ; aucun jeton n’est exposé au navigateur.',
  },
  {
    name: 'Services météo',
    detail: 'Données météo interrogées côté serveur selon la disponibilité du scénario.',
    usedFor: 'Estimation du stress thermique ; à défaut, le moteur annonce une hypothèse tempérée.',
  },
  {
    name: 'Profil athlète Atifit',
    detail: 'Poids, tolérance digestive et profil de sueur saisis par l’utilisateur.',
    usedFor: 'Personnalisation des cibles glucides, hydratation et sodium.',
  },
];

const SEPARATION = [
  'Les cibles chiffrées proviennent uniquement du moteur déterministe versionné côté serveur.',
  'Les comparatifs produits servent à choisir un format concret, jamais à recalculer une cible.',
  'Aucune valeur affichée n’est générée par un modèle de langage.',
  'Chaque conseil éditorial est rattaché à sa source d’origine.',
];

export default function Sources() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <header className="glass-panel p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[.2em] mb-3" style={{ color: 'var(--accent-blue)' }}>
          Transparence
        </p>
        <h1 className="text-4xl sm:text-5xl font-black mb-3">D’où viennent les informations</h1>
        <p className="max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
          Atifit distingue deux familles de contenus : les cibles nutritionnelles calculées à partir de littérature
          scientifique référencée, et les conseils pratiques ainsi que les modèles de produits issus de la documentation
          de {AUBINEAU_SOURCE.author}, {AUBINEAU_SOURCE.role.toLowerCase()}.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <a href={AUBINEAU_SOURCE.url} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
            Site de {AUBINEAU_SOURCE.author} <ArrowUpRight size={16} />
          </a>
          <Link to="/nutrition" className="btn-ghost inline-flex items-center gap-2"><BookOpen size={16} /> Guide nutrition</Link>
          <Link to="/preparer-course" className="btn-ghost inline-flex items-center gap-2">Préparer une course</Link>
        </div>
      </header>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
          <FileText size={21} style={{ color: 'var(--accent-blue)' }} /> Documentation de {AUBINEAU_SOURCE.author}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {AUBINEAU_SOURCE.role}. Conseils pratiques et comparatifs produits repris dans le guide, la stratégie et la
          préparation de course.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {AUBINEAU_DOCUMENTS.map(doc => (
            <article key={doc.title} className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              <h3 className="text-lg">{doc.title}</h3>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--accent-blue)' }}>{doc.detail}</p>
              <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>{doc.usedFor}</p>
            </article>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Les recettes, formats et prix évoluent : vérifier l’étiquette du produit au moment de l’achat.
        </p>
      </section>

      <section id="comparatifs" className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Link2 size={21} style={{ color: 'var(--accent-blue)' }} /> Comparatifs alimentaires : méthode et lecture
            </h2>
            <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--text-muted)' }}>
              Les cinq PDF sont des comparatifs éditoriaux de {AUBINEAU_SOURCE.author}. Atifit reprend uniquement les
              modèles cités, leurs valeurs relevées et le classement. Les unités sont normalisées quand le PDF le précise,
              afin de comparer des formats différents à base commune.
            </p>
          </div>
          <Link to="/nutrition/comparatifs" className="btn-primary inline-flex items-center gap-2 shrink-0">Ouvrir les comparatifs <ArrowUpRight size={16} /></Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {AUBINEAU_DOCUMENTS.filter(doc => doc.route).map(doc => (
            <article key={doc.title} className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              <h3 className="text-lg">{doc.title}</h3>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--accent-blue)' }}>{doc.detail}</p>
              <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>{doc.usedFor}</p>
              <Link to={doc.route} className="text-sm font-bold inline-flex items-center gap-1 mt-4" style={{ color: 'var(--accent-blue)' }}>Voir les modèles <ArrowUpRight size={14} /></Link>
            </article>
          ))}
        </div>
        <div className="mt-5 p-4 rounded-xl text-sm" style={{ background: 'var(--surface-subtle)', borderLeft: '4px solid #d97757', color: 'var(--text-secondary)' }}>
          <strong>Lire un classement correctement.</strong> Qualité et qualité/prix sont des scores du PDF, pas des cibles
          nutritionnelles. Une boisson électrolyte apporte peu de glucides et doit être complétée ; un gel exige de l’eau ;
          une barre est surtout adaptée au vélo ou au trail à allure modérée. Vérifie toujours la recette actuelle et teste
          la tolérance à l’entraînement.
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
          <Link2 size={21} style={{ color: 'var(--accent-blue)' }} /> Où ces documents apparaissent
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Chaque page indique sa source et renvoie vers le comparatif correspondant.
        </p>
        <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>— <strong>Guide nutrition</strong> : protocoles par format, conseils par discipline, top 3 de chaque comparatif.</li>
          <li>— <strong>Stratégie nutritionnelle</strong> : cibles calculées, puis produits adaptés au scénario.</li>
          <li>— <strong>Préparer une course</strong> : plan, stratégie jour J et modèles conseillés pour la course saisie.</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-5">
          {PRODUCT_COMPARISONS.map(item => (
            <span key={item.id} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              {item.title} · {item.edition}
            </span>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
          <ShieldCheck size={21} style={{ color: '#788c5d' }} /> Référentiel scientifique du moteur
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Référentiel v1.0.0 · moteur v1.0.0. Population visée : adultes en bonne santé de 18 ans et plus.
        </p>
        <ul className="space-y-4">
          {SCIENTIFIC_REFERENCES.map(reference => (
            <li key={reference.citation} className="pl-4" style={{ borderLeft: '3px solid var(--accent-blue)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{reference.citation}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Utilisé pour : {reference.usedFor}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
          <Database size={21} style={{ color: 'var(--accent-blue)' }} /> Données utilisées pour personnaliser
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Aucune donnée personnelle n’est achetée ni revendue.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {DATA_SOURCES.map(source => (
            <article key={source.name} className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              <h3 className="text-lg">{source.name}</h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{source.detail}</p>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>{source.usedFor}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6" style={{ borderColor: '#d97757' }}>
        <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
          <Info size={21} style={{ color: '#d97757' }} /> Séparation des rôles
        </h2>
        <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {SEPARATION.map(rule => <li key={rule}>— {rule}</li>)}
        </ul>
        <p className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          Recommandations générales de nutrition sportive. Elles ne remplacent ni un médecin ni un diététicien, et aucune
          carence n’est diagnostiquée. Pathologie, grossesse, trouble alimentaire ou traitement : consulter un
          professionnel de santé.
        </p>
      </section>
    </div>
  );
}
