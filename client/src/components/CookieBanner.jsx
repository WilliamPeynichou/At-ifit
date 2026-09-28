import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { CONSENT_CATEGORIES, useConsent } from '../context/ConsentContext';

const panelStyle = {
  background: '#faf9f5',
  color: '#141413',
  border: '1px solid #e8e6dc',
  boxShadow: '0 18px 50px rgba(20,20,19,0.22)',
};

/** Boutons de même taille, même poids visuel : refuser aussi simple qu'accepter. */
const choiceButton = 'min-h-11 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]';
const darkButton = { background: '#141413', color: '#faf9f5', border: '1px solid #141413' };
const lightButton = { background: '#faf9f5', color: '#141413', border: '1px solid #141413' };

function PreferencesDialog() {
  const { consent, save, acceptAll, rejectAll, closePreferences } = useConsent();
  const [choices, setChoices] = useState(() => ({ ...Object.fromEntries(CONSENT_CATEGORIES.map(c => [c.id, false])), ...consent?.choices }));
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('button, input')?.focus();
    const onKey = event => { if (event.key === 'Escape') closePreferences(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [closePreferences]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(20,20,19,0.55)' }} onMouseDown={e => { if (e.target === e.currentTarget) closePreferences(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-prefs-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6"
        style={panelStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="consent-prefs-title" className="text-2xl font-display tracking-wide" style={{ color: '#141413' }}>Gérer mes préférences</h2>
          <button type="button" onClick={closePreferences} aria-label="Fermer les préférences" className="p-2 rounded-lg" style={{ color: '#141413' }}><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3 text-sm" style={{ color: '#3d3d3a' }}>
          <div className="rounded-xl p-4" style={{ background: '#f0eee6', border: '1px solid #e8e6dc' }}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold" style={{ color: '#141413' }}>Stockage strictement nécessaire</p>
              <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: '#141413', color: '#faf9f5' }}>Toujours actif</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed">Session de connexion, thème, préparation de course, choix de consentement. Exempté de consentement : sans lui, le service demandé ne fonctionne pas.</p>
          </div>

          {CONSENT_CATEGORIES.map(category => (
            <label key={category.id} className="block rounded-xl p-4 cursor-pointer" style={{ background: '#ffffff', border: '1px solid #e8e6dc' }}>
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold" style={{ color: '#141413' }}>{category.label} <span className="font-normal text-xs" style={{ color: '#5e5d59' }}>· {category.provider}</span></span>
                <input
                  type="checkbox"
                  role="switch"
                  name={`consent-${category.id}`}
                  checked={Boolean(choices[category.id])}
                  onChange={e => setChoices(current => ({ ...current, [category.id]: e.target.checked }))}
                  className="h-5 w-5 shrink-0 accent-[#d97757]"
                  aria-describedby={`consent-desc-${category.id}`}
                />
              </span>
              <span id={`consent-desc-${category.id}`} className="block mt-2 text-xs leading-relaxed">{category.description}</span>
            </label>
          ))}

          <p className="text-xs" style={{ color: '#5e5d59' }}>Aucun traceur publicitaire ni de mesure d’audience n’est utilisé. Détails : <Link to="/cookies" onClick={closePreferences} className="underline font-semibold" style={{ color: '#141413' }}>politique cookies</Link>.</p>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button type="button" className={choiceButton} style={darkButton} onClick={rejectAll}>Tout refuser</button>
          <button type="button" className={choiceButton} style={lightButton} onClick={() => save(choices)}>Enregistrer</button>
          <button type="button" className={choiceButton} style={darkButton} onClick={acceptAll}>Tout accepter</button>
        </div>
      </div>
    </div>
  );
}

/** Bandeau non bloquant : le site reste utilisable sans choix. */
export default function CookieBanner() {
  const { hasDecided, acceptAll, rejectAll, preferencesOpen, openPreferences } = useConsent();

  return (
    <>
      {!hasDecided && !preferencesOpen && (
        <section
          role="region"
          aria-label="Consentement cookies"
          data-testid="cookie-banner"
          className="fixed z-[110] bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-md rounded-2xl p-5"
          style={panelStyle}
        >
          <div className="flex items-start gap-3">
            <Cookie size={22} className="shrink-0 mt-0.5" style={{ color: '#d97757' }} aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl tracking-wide" style={{ color: '#141413' }}>Cookies et contenus tiers</h2>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#3d3d3a' }}>
                Atifit n’utilise ni publicité ni mesure d’audience. Seul le stockage nécessaire au fonctionnement est actif.
                Avec ton accord, nous chargeons aussi les fonds de carte CARTO pour tes traces GPS. Tu peux changer d’avis à tout moment via « Gérer les cookies » en bas de page.
              </p>
              <Link to="/cookies" className="inline-block mt-2 text-xs underline font-semibold" style={{ color: '#141413' }}>En savoir plus</Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className={choiceButton} style={darkButton} onClick={rejectAll}>Tout refuser</button>
            <button type="button" className={choiceButton} style={darkButton} onClick={acceptAll}>Tout accepter</button>
          </div>
          <button type="button" onClick={openPreferences} className="mt-2 w-full min-h-10 text-xs font-semibold underline" style={{ color: '#141413' }}>Personnaliser</button>
        </section>
      )}
      {preferencesOpen && <PreferencesDialog />}
    </>
  );
}
