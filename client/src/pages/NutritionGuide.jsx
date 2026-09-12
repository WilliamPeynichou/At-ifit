import React, { useState } from 'react';
import { Apple, ArrowUpRight, Bike, BookOpen, CalendarRange, ChevronRight, Droplets, FlaskConical, PersonStanding, ShieldCheck, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AUBINEAU_SOURCE,
  BASE_RULES,
  CARB_LOADING,
  HOURLY_TARGET,
  PRODUCT_COMPARISONS,
  RACE_PROTOCOLS,
  SPORT_FOOD_GUIDES,
} from '../data/nutritionKnowledge';

const sportIcons = { cycling: Bike, running: PersonStanding, swimming: Waves, triathlon: FlaskConical };

export default function NutritionGuide() {
  const [sport, setSport] = useState('running');
  const [protocolId, setProtocolId] = useState(RACE_PROTOCOLS[0].id);
  const guide = SPORT_FOOD_GUIDES[sport];
  const protocol = RACE_PROTOCOLS.find(item => item.id === protocolId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <header className="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-40 opacity-20" style={{ background: 'linear-gradient(135deg, transparent, var(--accent-blue))' }} />
        <div className="relative max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[.2em] mb-3" style={{ color: 'var(--accent-blue)' }}>Guide nutrition sportive</p>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">Manger pour soutenir l’effort</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Protocoles de ravitaillement par format de course, repères alimentaires par discipline et lecture des produits.
            Contenu adapté de la documentation de {AUBINEAU_SOURCE.author}.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link className="btn-primary flex items-center gap-2" to="/nutrition/strategie">Calculer ma stratégie <ChevronRight size={17} /></Link>
            <Link className="btn-ghost flex items-center gap-2" to="/preparer-course">Préparer une course</Link>
          </div>
        </div>
      </header>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1">Les bases, quelle que soit la course</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Socle rappelé dans chacun de ses articles de ravitaillement.</p>
        <ul className="grid md:grid-cols-2 gap-3 mb-6">
          {BASE_RULES.map(rule => (
            <li key={rule} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={17} style={{ color: '#788c5d', flexShrink: 0 }} />{rule}
            </li>
          ))}
        </ul>
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--accent-blue)' }}>
            <Droplets size={15} /> Cible théorique par heure de course
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            {[
              [`${HOURLY_TARGET.fluidMl} ml`, 'Boisson'],
              [`${HOURLY_TARGET.carbohydratesG} g`, 'Glucides'],
              [`${HOURLY_TARGET.sodiumMg} mg`, 'Sodium'],
              [`${HOURLY_TARGET.vitaminCMg} mg`, 'Vitamine C'],
              [`${HOURLY_TARGET.magnesiumMg} mg`, 'Magnésium'],
              [`${HOURLY_TARGET.vitaminBCount}`, 'Vitamines B'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-display">{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1">Protocole par format de course</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>En trail, court signifie moins de 6 h d’effort et forte dénivellation plus de 1 000 m D+.</p>
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Formats de course">
          {RACE_PROTOCOLS.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={protocolId === item.id}
              onClick={() => setProtocolId(item.id)}
              className="px-4 py-2.5 rounded-lg font-bold text-sm"
              style={{
                background: protocolId === item.id ? 'var(--accent-blue)' : 'var(--surface-subtle)',
                color: protocolId === item.id ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>{protocol.tagline}</p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['Base à emporter', protocol.base],
            ['Rythme de prise', protocol.rhythm],
            ['À éviter', protocol.avoid],
            ['Ravitaillements', protocol.aidStation],
          ].map(([title, text]) => (
            <article key={title} className="glass-card p-5">
              <h3 className="text-lg mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 p-4 rounded-xl text-sm" style={{ background: 'var(--surface-subtle)', borderLeft: '4px solid #d97757', color: 'var(--text-secondary)' }}>
          {protocol.highlight}
        </p>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1 flex items-center gap-2"><CalendarRange size={22} style={{ color: 'var(--accent-blue)' }} /> {CARB_LOADING.title}</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Objectif : réserves de glycogène pleines sans les effets secondaires du régime dissocié scandinave.</p>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {CARB_LOADING.steps.map(step => (
            <article key={step.phase} className="p-4 rounded-xl" style={{ background: 'var(--surface-subtle)', borderTop: '3px solid var(--accent-blue)' }}>
              <p className="font-mono text-xs" style={{ color: 'var(--accent-blue)' }}>{step.phase}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{step.detail}</p>
            </article>
          ))}
        </div>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {CARB_LOADING.notes.map(note => <li key={note}>— {note}</li>)}
        </ul>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-2xl font-black mb-1">Conseils par discipline</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Scénario avant, pendant et après l’effort.</p>
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Disciplines">
          {Object.entries(SPORT_FOOD_GUIDES).map(([key, value]) => {
            const Icon = sportIcons[key];
            return (
              <button
                key={key}
                role="tab"
                aria-selected={sport === key}
                onClick={() => setSport(key)}
                className="px-4 py-2.5 rounded-lg flex gap-2 items-center font-bold text-sm"
                style={{
                  background: sport === key ? 'var(--accent-blue)' : 'var(--surface-subtle)',
                  color: sport === key ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <Icon size={16} />{value.label}
              </button>
            );
          })}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[['Avant', guide.before], ['Pendant', guide.during], ['Après', guide.after]].map(([title, text], index) => (
            <article key={title} className="glass-card p-5">
              <span className="font-mono text-xs" style={{ color: 'var(--accent-blue)' }}>0{index + 1}</span>
              <h3 className="text-xl mt-2 mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
            </article>
          ))}
        </div>
        <ul className="grid sm:grid-cols-3 gap-3 mt-4">
          {guide.practical.map(item => (
            <li key={item} className="text-sm p-3 flex gap-2" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={17} style={{ color: '#788c5d', flexShrink: 0 }} />{item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-black">Choisir un produit</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Modèles bien classés dans ses comparatifs. Recettes et prix évoluent : vérifier l’étiquette du moment.</p>
          </div>
          <BookOpen style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {PRODUCT_COMPARISONS.map(item => (
            <article key={item.id} className="glass-panel p-5">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="text-xl">{item.title}</h3>
                  <span className="font-mono text-xs" style={{ color: 'var(--accent-blue)' }}>Comparatif {item.edition}</span>
                </div>
                <Apple size={20} />
              </div>
              <p className="text-sm my-4" style={{ color: 'var(--text-secondary)' }}>{item.use}</p>
              <p className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Exemples de modèles</p>
              <p className="text-sm font-semibold mb-4">{item.models.join(' · ')}</p>
              <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {item.checks.map(check => <li key={check}>— {check}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <aside className="glass-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5" style={{ borderColor: '#d97757' }}>
        <div>
          <p className="font-mono text-xs uppercase mb-1" style={{ color: '#d97757' }}>Source documentaire</p>
          <h2 className="text-xl">Documentation de {AUBINEAU_SOURCE.author}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{AUBINEAU_SOURCE.role}. {AUBINEAU_SOURCE.note}</p>
        </div>
        <a href={AUBINEAU_SOURCE.url} target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2 shrink-0">Voir son site <ArrowUpRight size={16} /></a>
      </aside>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Conseils généraux, non médicaux. Pathologie, grossesse, trouble alimentaire ou traitement : consulter un professionnel de santé.
      </p>
    </div>
  );
}
