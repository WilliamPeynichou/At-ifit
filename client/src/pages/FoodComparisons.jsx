import React, { useMemo, useState } from 'react';
import { ArrowUpDown, BookOpen, ChevronRight, Filter, FlaskConical, Info, Search, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AUBINEAU_SOURCE, PRODUCT_COMPARISONS } from '../data/nutritionKnowledge';

const SORT_OPTIONS = [
  { id: 'rank', label: 'Classement PDF' },
  { id: 'quality', label: 'Qualité' },
  { id: 'value', label: 'Qualité / prix' },
  { id: 'carbohydrates', label: 'Glucides' },
  { id: 'sodium', label: 'Sodium' },
];

const formatMetric = (value, suffix = '') => (value === undefined || value === null ? '—' : `${value}${suffix}`);

/** Comparateur de modèles explicitement issus des PDF, sans modifier le calcul scientifique. */
export default function FoodComparisons() {
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('categorie');
  const initialCategory = PRODUCT_COMPARISONS.some(category => category.id === requestedCategory) ? requestedCategory : 'all';
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [onlyBestValue, setOnlyBestValue] = useState(false);

  const visibleCategories = useMemo(() => PRODUCT_COMPARISONS
    .filter(category => categoryId === 'all' || category.id === categoryId)
    .map(category => ({
      ...category,
      products: category.products
        .filter(product => {
          const normalized = `${product.model} ${category.title}`.toLocaleLowerCase('fr');
          return normalized.includes(query.trim().toLocaleLowerCase('fr')) && (!onlyBestValue || product.rank === 1);
        })
        .sort((a, b) => {
          if (sortBy === 'quality') return b.qualityScore - a.qualityScore;
          if (sortBy === 'value') return b.valueScore - a.valueScore;
          if (sortBy === 'carbohydrates') return b.carbohydratesG - a.carbohydratesG;
          if (sortBy === 'sodium') return b.sodiumMg - a.sodiumMg;
          return a.rank - b.rank;
        }),
    }))
    .filter(category => category.products.length > 0), [categoryId, query, sortBy, onlyBestValue]);

  const resultCount = visibleCategories.reduce((total, category) => total + category.products.length, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-7">
      <header className="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full opacity-20" style={{ background: 'var(--accent-blue)' }} />
        <div className="relative max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[.2em] mb-3" style={{ color: 'var(--accent-blue)' }}>Comparatifs alimentaires</p>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">Choisir un produit adapté</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Explore les modèles classés dans les comparatifs PDF de {AUBINEAU_SOURCE.author}. Compare les valeurs à unité
            égale, puis rapproche-les de ta stratégie nutritionnelle ; le meilleur produit dépend aussi de ta tolérance.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/nutrition/strategie" className="btn-primary inline-flex items-center gap-2">Calculer ma stratégie <ChevronRight size={17} /></Link>
            <Link to="/nutrition" className="btn-ghost inline-flex items-center gap-2"><BookOpen size={16} /> Guide nutrition</Link>
            <Link to="/sources#comparatifs" className="btn-ghost inline-flex items-center gap-2"><Info size={16} /> Méthode et sources</Link>
          </div>
        </div>
      </header>

      <section className="glass-panel p-4 sm:p-5" aria-label="Filtres du comparateur">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <label className="block flex-1 text-xs font-bold uppercase">
            Rechercher un modèle
            <span className="relative block mt-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input className="input-cyber pl-10" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex. Aptonia, boisson, gel…" />
            </span>
          </label>
          <label className="block text-xs font-bold uppercase min-w-[11rem]">
            Trier par
            <span className="relative block mt-2">
              <ArrowUpDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <select className="input-cyber pl-9" value={sortBy} onChange={event => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </span>
          </label>
          <label className="flex items-center gap-2 min-h-[44px] text-sm font-bold shrink-0 cursor-pointer">
            <input type="checkbox" checked={onlyBestValue} onChange={event => setOnlyBestValue(event.target.checked)} className="w-4 h-4" />
            Seulement #1 PDF
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label="Catégories de produits">
          <button type="button" role="tab" aria-selected={categoryId === 'all'} onClick={() => setCategoryId('all')} className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: categoryId === 'all' ? 'var(--accent-blue)' : 'var(--surface-subtle)', color: categoryId === 'all' ? '#fff' : 'var(--text-primary)', border: '1px solid var(--glass-border)' }}>
            Tous ({PRODUCT_COMPARISONS.length})
          </button>
          {PRODUCT_COMPARISONS.map(category => (
            <button type="button" key={category.id} role="tab" aria-selected={categoryId === category.id} onClick={() => setCategoryId(category.id)} className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: categoryId === category.id ? 'var(--accent-blue)' : 'var(--surface-subtle)', color: categoryId === category.id ? '#fff' : 'var(--text-primary)', border: '1px solid var(--glass-border)' }}>
              {category.title}
            </button>
          ))}
        </div>
      </section>

      <p className="text-sm flex gap-2 items-center" aria-live="polite" style={{ color: 'var(--text-muted)' }}><Filter size={15} /> {resultCount} modèle{resultCount > 1 ? 's' : ''} affiché{resultCount > 1 ? 's' : ''}</p>

      {visibleCategories.map(category => (
        <section key={category.id} className="glass-panel p-5 sm:p-6" aria-labelledby={`comparison-${category.id}`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--accent-blue)' }}>Comparatif PDF · {category.edition}</p>
              <h2 id={`comparison-${category.id}`} className="text-2xl font-black mt-1">{category.title}</h2>
              <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>{category.use}</p>
            </div>
            <span className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              {category.products.length} modèle{category.products.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_15rem] gap-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th className="text-left py-3 pr-4">Modèle</th>
                    <th className="text-right py-3 px-3">Glucides</th>
                    <th className="text-right py-3 px-3">Sodium</th>
                    <th className="text-right py-3 px-3">Protéines</th>
                    <th className="text-right py-3 px-3">Qualité</th>
                    <th className="text-right py-3 pl-3">Qualité / prix</th>
                  </tr>
                </thead>
                <tbody>
                  {category.products.map(product => (
                    <tr key={product.model} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td className="py-4 pr-4 align-top">
                        <strong className="block">#{product.rank} {product.model}</strong>
                        <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {product.dose || product.format}{product.normalizedTo ? ` · valeurs pour ${product.normalizedTo}` : ''}
                        </span>
                      </td>
                      <td className="text-right px-3 font-mono">{formatMetric(product.carbohydratesG, ' g')}</td>
                      <td className="text-right px-3 font-mono">{formatMetric(product.sodiumMg, ' mg')}</td>
                      <td className="text-right px-3 font-mono">{formatMetric(product.proteinG, ' g')}</td>
                      <td className="text-right px-3 font-mono">{product.qualityScore}</td>
                      <td className="text-right pl-3 font-mono">{product.valueScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--accent-blue)' }}>Lecture rapide</p>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {category.checks.map(check => <li key={check} className="flex gap-2"><ShieldCheck size={16} style={{ color: '#788c5d', flexShrink: 0 }} />{check}</li>)}
              </ul>
            </aside>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>{category.dataBasis}</p>
        </section>
      ))}

      {visibleCategories.length === 0 && (
        <section className="glass-panel p-8 text-center">
          <FlaskConical size={28} className="mx-auto" style={{ color: 'var(--accent-blue)' }} />
          <h2 className="text-xl mt-3">Aucun modèle trouvé</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Essaie un autre mot-clé ou retire le filtre #1 PDF.</p>
          <button type="button" className="btn-ghost mt-4" onClick={() => { setQuery(''); setOnlyBestValue(false); setCategoryId('all'); }}>Réinitialiser les filtres</button>
        </section>
      )}

      <aside className="glass-panel p-5 sm:p-6" style={{ borderColor: '#d97757' }}>
        <h2 className="text-xl flex items-center gap-2"><Info size={20} style={{ color: '#d97757' }} /> Limites du comparateur</h2>
        <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
          Un classement PDF n’est ni un avis médical ni une prescription. Il ne remplace pas les cibles glucides, hydratation
          et sodium calculées pour ton effort. Formules, formats et prix changent : vérifie l’étiquette actuelle et teste à
          l’entraînement, jamais le jour J.
        </p>
      </aside>
    </div>
  );
}
