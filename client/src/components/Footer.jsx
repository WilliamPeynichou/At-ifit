import React from 'react';
import { Link } from 'react-router-dom';
import { useConsent } from '../context/ConsentContext';
import { EDITOR } from '../data/legalInfo';

const COLUMNS = [
  {
    title: 'Entraînement',
    links: [
      { to: '/', label: 'Dashboard' },
      { to: '/strava-stats', label: 'Analyse Strava' },
      { to: '/running-dashboard', label: 'Running' },
      { to: '/cycling-dashboard', label: 'Cyclisme' },
      { to: '/swimming-dashboard', label: 'Natation' },
    ],
  },
  {
    title: 'Nutrition & course',
    links: [
      { to: '/nutrition', label: 'Guide nutrition' },
      { to: '/nutrition/strategie', label: 'Stratégie nutritionnelle' },
      { to: '/nutrition/comparatifs', label: 'Comparatifs produits' },
      { to: '/preparer-course', label: 'Préparer une course' },
      { to: '/kcal-calculator', label: 'Calculateur kcal' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { to: '/sources', label: 'Sources & documentation' },
      { to: '/stats-explanation', label: 'Comprendre les stats' },
      { to: '/profile', label: 'Mon profil' },
    ],
  },
];

const LEGAL_LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/confidentialite', label: 'Confidentialité' },
  { to: '/cookies', label: 'Politique cookies' },
];

const linkClass = 'inline-flex items-center min-h-9 text-sm rounded-md transition-colors hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]';

/** Footer toujours sombre (texte clair) : contraste stable en thème clair comme sombre. */
const Footer = () => {
  const year = new Date().getFullYear();
  const { openPreferences } = useConsent();

  return (
    <footer className="dark-surface" style={{ background: '#141413', borderTop: '1px solid rgba(250,249,245,0.08)' }} data-testid="site-footer">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-10 pb-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-3">
            <Link to="/" className="font-display text-2xl tracking-widest" style={{ color: '#faf9f5' }}>Atifit</Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#b0aea5' }}>
              Analyse d’entraînement, nutrition sportive et préparation de course. Gratuit, sans publicité.
            </p>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: '#b0aea5' }}>
              Documentation nutrition : <a href="https://www.nicolas-aubineau.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#faf9f5' }}>Nicolas Aubineau</a>.
              Données d’activité : Powered by Strava.
            </p>
          </div>

          {COLUMNS.map(column => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-mono text-[11px] uppercase tracking-[.18em] mb-3" style={{ color: '#d97757' }}>{column.title}</h2>
              <ul className="space-y-0.5">
                {column.links.map(({ to, label }) => (
                  <li key={to}><Link to={to} className={linkClass} style={{ color: '#e8e6dc' }}>{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 rounded-xl p-4 text-xs leading-relaxed" style={{ background: 'rgba(250,249,245,0.05)', border: '1px solid rgba(250,249,245,0.08)', color: '#b0aea5' }}>
          <strong style={{ color: '#faf9f5' }}>Avertissement santé.</strong> Atifit n’est pas un dispositif médical. Les calculs et recommandations sont indicatifs et ne remplacent pas l’avis d’un professionnel de santé. Les réponses du Coach IA sont générées automatiquement et peuvent contenir des erreurs.
        </div>

        <div className="mt-6 pt-5 flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4" style={{ borderTop: '1px solid rgba(250,249,245,0.08)' }}>
          <p className="text-xs" style={{ color: '#b0aea5' }}>
            © {year} Atifit par {EDITOR.name} · Hébergé par Railway
          </p>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {LEGAL_LINKS.map(({ to, label }) => (
                <li key={to}><Link to={to} className={`${linkClass} text-xs`} style={{ color: '#e8e6dc' }}>{label}</Link></li>
              ))}
              <li>
                <button type="button" onClick={openPreferences} className={`${linkClass} text-xs`} style={{ color: '#e8e6dc' }}>Gérer les cookies</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
