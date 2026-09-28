/**
 * Informations légales centralisées d'Atifit.
 * Règle : aucune donnée inventée. Les champs non fournis restent `null`
 * et s'affichent comme « non renseigné ». Coordonnées et références de
 * l'entreprise individuelle configurables via variables Vite au build.
 */
export const LEGAL_LAST_UPDATE = '2026-09-28';
export const PRIVACY_POLICY_VERSION = '2026-09-28';

export const EDITOR = {
  product: 'Atifit',
  name: 'William Peynichou',
  status: 'Entrepreneur individuel (micro-entrepreneur)',
  publicationDirector: 'William Peynichou',
  contactEmail: import.meta.env.VITE_LEGAL_CONTACT_EMAIL || 'wilishkar@gmail.com',
  businessAddress: import.meta.env.VITE_LEGAL_BUSINESS_ADDRESS || null,
  businessPhone: import.meta.env.VITE_LEGAL_BUSINESS_PHONE || null,
  siren: import.meta.env.VITE_LEGAL_SIREN || null,
  vatNumber: import.meta.env.VITE_LEGAL_VAT_NUMBER || null,
  url: 'https://atifit.up.railway.app',
};

/** Source : https://railway.com/legal/privacy (consultée le 2026-09-28). */
export const HOST = {
  name: 'Railway Corporation',
  address: '548 Market St PMB 68956, San Francisco, California 94104, États-Unis',
  phone: '+1 (415) 707-7675',
  url: 'https://railway.com',
  privacyUrl: 'https://railway.com/legal/privacy',
  transferMechanism: 'Data Privacy Framework déclaré par Railway ; autres garanties contractuelles : à confirmer',
};

/** Services tiers réellement appelés par l'application (inventaire du code). */
export const PROCESSORS = [
  {
    name: 'Railway Corporation',
    role: 'Hébergement de l’application et de la base de données',
    data: 'Toutes les données du compte, journaux techniques (adresse IP, requêtes)',
    location: 'États-Unis (Data Privacy Framework)',
    url: 'https://railway.com/legal/privacy',
  },
  {
    name: 'Strava, Inc.',
    role: 'Import des activités sportives, uniquement si tu connectes ton compte',
    data: 'Jetons OAuth chiffrés, activités, traces GPS, fréquence cardiaque, puissance',
    location: 'Hors UE possible — pays et garanties à confirmer avec Strava',
    url: 'https://www.strava.com/legal/privacy',
  },
  {
    name: 'Anthropic PBC ou Mistral AI SAS (selon configuration)',
    role: 'Coach IA : génération des réponses de l’assistant',
    data: 'Ton message et le contexte sportif nécessaire à la réponse (sans email ni mot de passe)',
    location: 'Selon le fournisseur et sa configuration — à confirmer',
    url: 'https://www.anthropic.com/legal/privacy',
  },
  {
    name: 'Open-Meteo',
    role: 'Météo de course, appelée par le serveur Atifit',
    data: 'Lieu et date de la course saisis (aucune donnée de compte)',
    location: 'Suisse (pays reconnu adéquat par la Commission européenne)',
    url: 'https://open-meteo.com/en/terms',
  },
  {
    name: 'CartoDB Inc. (CARTO) / OpenStreetMap',
    role: 'Fond de carte des traces GPS, chargé seulement après ton accord',
    data: 'Adresse IP et zone de carte affichée (requêtes de tuiles)',
    location: 'États-Unis (Data Privacy Framework)',
    url: 'https://carto.com/privacy',
  },
];

export const CNIL = {
  name: 'Commission nationale de l’informatique et des libertés (CNIL)',
  address: '3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07',
  complaintUrl: 'https://www.cnil.fr/fr/plaintes',
};
