import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Gestion du consentement (ePrivacy art. 5(3), recommandations CNIL 2020).
 * - Aucun contenu tiers optionnel avant choix explicite.
 * - « Tout accepter » et « Tout refuser » au même niveau.
 * - Choix conservé 6 mois puis redemandé.
 * - Retrait à tout moment depuis le footer (« Gérer les cookies »).
 */
const ConsentContext = createContext(null);

export const CONSENT_STORAGE_KEY = 'atifit_consent';
export const CONSENT_VERSION = 1;
const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182; // ≈ 6 mois

/** Catégories optionnelles soumises à consentement. */
export const CONSENT_CATEGORIES = [
  {
    id: 'maps',
    label: 'Cartes interactives',
    provider: 'CARTO / OpenStreetMap',
    description: 'Affiche le fond de carte de tes traces GPS. Ton navigateur contacte alors les serveurs de tuiles CARTO (adresse IP, zone affichée).',
  },
];

const EMPTY_CHOICES = Object.fromEntries(CONSENT_CATEGORIES.map(c => [c.id, false]));

function readStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.decidedAt) return null;
    if (Date.now() - new Date(parsed.decidedAt).getTime() > CONSENT_MAX_AGE_MS) return null;
    return { ...parsed, choices: { ...EMPTY_CHOICES, ...parsed.choices } };
  } catch {
    return null;
  }
}

export const ConsentProvider = ({ children }) => {
  const [consent, setConsent] = useState(readStoredConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const persist = useCallback(choices => {
    const next = { version: CONSENT_VERSION, decidedAt: new Date().toISOString(), choices: { ...EMPTY_CHOICES, ...choices } };
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Stockage indisponible : le choix vaut pour la session en cours.
    }
    setConsent(next);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo(() => ({
    consent,
    hasDecided: Boolean(consent),
    allows: category => Boolean(consent?.choices?.[category]),
    acceptAll: () => persist(Object.fromEntries(CONSENT_CATEGORIES.map(c => [c.id, true]))),
    rejectAll: () => persist(EMPTY_CHOICES),
    save: choices => persist(choices),
    grant: category => persist({ ...(consent?.choices || EMPTY_CHOICES), [category]: true }),
    preferencesOpen,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
  }), [consent, persist, preferencesOpen]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within a ConsentProvider');
  return ctx;
};
