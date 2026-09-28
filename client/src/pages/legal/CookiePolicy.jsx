import React from 'react';
import LegalDocument, { LegalTable } from '../../components/legal/LegalDocument';
import { useConsent, CONSENT_CATEGORIES } from '../../context/ConsentContext';

const strong = { color: 'var(--text-primary)' };

const NECESSARY = [
  ['accessToken, refreshToken', 'localStorage', 'Maintenir ta session connectée', '15 min / 5 jours, effacés à la déconnexion'],
  ['atifit_theme', 'localStorage', 'Mémoriser le thème clair ou sombre', 'Jusqu’à effacement du navigateur'],
  ['onboarding_completed', 'localStorage', 'Ne pas réafficher l’accueil déjà terminé', 'Jusqu’à effacement du navigateur'],
  ['atifit:race-context:v1', 'localStorage', 'Relier ta course préparée à ta stratégie nutritionnelle', 'Jusqu’à effacement ou nouvelle course'],
  ['atifit:race-pace-calculator:v1', 'localStorage', 'Garder la saisie de la calculette d’allure', 'Jusqu’à effacement du navigateur'],
  ['atifit_consent', 'localStorage', 'Mémoriser tes choix de consentement', '6 mois, puis nouveau choix'],
  ['strava_oauth_return_path', 'sessionStorage', 'Te ramener à la bonne page après la connexion Strava', 'Fin de l’onglet'],
];

export default function CookiePolicy() {
  const { consent, openPreferences, allows } = useConsent();

  const sections = [
    {
      id: 'resume',
      title: 'En bref',
      content: (
        <>
          <p><strong style={strong}>Atifit ne dépose aucun cookie publicitaire ni de mesure d’audience.</strong> Le serveur ne dépose pas de cookie : la session utilise le stockage local de ton navigateur.</p>
          <p>Seul un contenu tiers est soumis à ton accord : les fonds de carte CARTO. Refuser ne bloque aucune autre fonction.</p>
          <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
            <p data-testid="consent-status">
              Ton choix actuel : {consent
                ? CONSENT_CATEGORIES.map(c => `${c.label} ${allows(c.id) ? 'autorisées' : 'refusées'}`).join(', ')
                : 'aucun choix enregistré'}
              {consent && <> (le {new Date(consent.decidedAt).toLocaleDateString('fr-FR')})</>}.
            </p>
            <button type="button" onClick={openPreferences} className="min-h-11 px-4 rounded-xl text-sm font-semibold shrink-0" style={{ background: '#141413', color: '#faf9f5' }}>Modifier mes choix</button>
          </div>
        </>
      ),
    },
    {
      id: 'necessaires',
      title: 'Stockage strictement nécessaire',
      content: (
        <>
          <p>Exempté de consentement (article 82 de la loi Informatique et Libertés) car indispensable au service que tu demandes. Tu peux l’effacer via les réglages de ton navigateur ; tu seras alors déconnecté.</p>
          <LegalTable caption="Stockage nécessaire" headers={['Nom', 'Type', 'Finalité', 'Durée']} rows={NECESSARY} />
        </>
      ),
    },
    {
      id: 'optionnels',
      title: 'Contenus tiers soumis à consentement',
      content: (
        <>
          <LegalTable
            caption="Contenus tiers"
            headers={['Contenu', 'Fournisseur', 'Ce qui est transmis', 'Durée du choix']}
            rows={CONSENT_CATEGORIES.map(c => [c.label, c.provider, c.description, '6 mois'])}
          />
          <p>Avant ton accord, la carte n’est pas chargée et aucune requête n’est envoyée à CARTO. Après retrait, la carte n’est plus chargée.</p>
        </>
      ),
    },
    {
      id: 'externes',
      title: 'Sites externes',
      content: <p>Quand tu connectes Strava, tu es redirigé vers strava.com, qui applique ses propres cookies et sa <a href="https://www.strava.com/legal/cookie_policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold" style={strong}>politique cookies</a>. Les polices sont hébergées par Atifit : aucun appel à Google Fonts.</p>,
    },
    {
      id: 'retrait',
      title: 'Changer d’avis',
      content: <p>Le lien « Gérer les cookies » est présent en bas de chaque page. Retirer ton accord est aussi simple que le donner.</p>,
    },
  ];

  return <LegalDocument eyebrow="ePrivacy" title="Politique cookies" intro="Ce qu’Atifit stocke dans ton navigateur et ce qui dépend de ton accord." sections={sections} />;
}
