import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../Layout';
import Footer from '../Footer';
import { LEGAL_LAST_UPDATE } from '../../data/legalInfo';

/** Pages légales accessibles sans compte : Layout complet si connecté, en-tête minimal sinon. */
export function LegalRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Layout>{children}</Layout>;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <Link to="/login" className="font-display text-2xl tracking-widest" style={{ color: 'var(--text-primary)' }}>Atifit</Link>
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold min-h-11 px-3 rounded-lg" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={16} aria-hidden="true" /> Se connecter
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Mise en page d'un document légal : titre, sommaire, sections. */
export default function LegalDocument({ eyebrow, title, intro, sections }) {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <header className="glass-panel p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>{eyebrow}</p>
        <h1 className="text-4xl sm:text-5xl mt-2" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {intro && <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{intro}</p>}
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Dernière mise à jour : <time dateTime={LEGAL_LAST_UPDATE}>{new Date(LEGAL_LAST_UPDATE).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
        <nav aria-label="Sommaire" className="mt-5 flex flex-wrap gap-2">
          {sections.map(section => (
            <a key={section.id} href={`#${section.id}`} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>{section.title}</a>
          ))}
        </nav>
      </header>

      {sections.map(section => (
        <section key={section.id} id={section.id} className="glass-panel p-6 sm:p-8 scroll-mt-24" aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`} className="text-2xl sm:text-3xl" style={{ color: 'var(--text-primary)' }}>{section.title}</h2>
          <div className="legal-prose mt-4 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{section.content}</div>
        </section>
      ))}
    </article>
  );
}

/** Tableau lisible, défilable sur mobile. */
export function LegalTable({ caption, headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--glass-border)' }}>
      <table className="w-full text-left text-xs sm:text-sm min-w-[560px]">
        <caption className="sr-only">{caption}</caption>
        <thead style={{ background: 'var(--surface-subtle)' }}>
          <tr>{headers.map(h => <th key={h} scope="col" className="p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--glass-border)' }}>
              {row.map((cell, j) => <td key={j} className="p-3 align-top" style={{ color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
