import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocument, { LegalTable } from '../../components/legal/LegalDocument';
import { CNIL, EDITOR, HOST, PRIVACY_POLICY_VERSION, PROCESSORS } from '../../data/legalInfo';

const ext = { target: '_blank', rel: 'noopener noreferrer', className: 'underline font-semibold', style: { color: 'var(--text-primary)' } };
const strong = { color: 'var(--text-primary)' };

const TREATMENTS = [
  ['Compte', 'Email, pseudo, pays, mot de passe (haché bcrypt)', 'Créer et sécuriser ton compte', 'Exécution du service (art. 6.1.b)', 'Jusqu’à la suppression du compte'],
  ['Profil sportif et santé', 'Taille, âge, genre, poids, fréquence cardiaque, objectifs', 'Calculer IMC, besoins caloriques, zones, stratégies', 'Consentement explicite (art. 6.1.a et 9.2.a), donné à l’inscription', 'Jusqu’à la suppression du compte ou le retrait du consentement'],
  ['Activités Strava (optionnel)', 'Activités, traces GPS, FC, puissance, jetons OAuth chiffrés', 'Importer et analyser tes entraînements', 'Consentement (connexion volontaire à Strava)', 'Jetons : jusqu’à la déconnexion. Activités : jusqu’à la suppression du compte'],
  ['Coach IA (optionnel)', 'Message et contexte sportif utile à la réponse', 'Répondre à tes questions', 'Exécution du service demandé (art. 6.1.b) et consentement (art. 9.2.a)', 'Contenu non conservé par Atifit ; seules des métadonnées d’usage (longueur, modèle, statut) sont journalisées'],
  ['Sécurité', 'Adresse IP, navigateur, journaux de connexion et d’audit', 'Prévenir les abus, tracer les actions sensibles', 'Intérêt légitime (art. 6.1.f) : sécuriser le service', 'Durée opérationnelle non définie à ce jour ; journaux liés au compte effacés lors de sa suppression'],
];

export default function PrivacyPolicy() {
  const contact = EDITOR.contactEmail
    ? <a href={`mailto:${EDITOR.contactEmail}`} className="underline font-semibold" style={strong}>{EDITOR.contactEmail}</a>
    : <span>contact vie privée non renseigné — à fournir par l’éditeur avant publication</span>;

  const sections = [
    {
      id: 'responsable',
      title: 'Responsable du traitement',
      content: (
        <>
          <p><strong style={strong}>{EDITOR.name}</strong>, éditeur d’Atifit, est responsable du traitement. Contact vie privée : {contact}.</p>
          <p>DPO : non désigné à ce jour ; l’applicabilité de l’article 37 du RGPD reste à confirmer.</p>
        </>
      ),
    },
    {
      id: 'traitements',
      title: 'Données, finalités et durées',
      content: (
        <>
          <p>Nous ne collectons que ce qui est nécessaire aux fonctions que tu utilises. Pas de publicité, pas de revente, pas de profilage marketing.</p>
          <LegalTable caption="Traitements de données" headers={['Traitement', 'Données', 'Finalité', 'Base légale', 'Conservation']} rows={TREATMENTS} />
          <p>Le poids et la fréquence cardiaque sont des <strong style={strong}>données de santé</strong> (art. 9 RGPD). Pour les nouveaux comptes, un accord explicite est recueilli à l’inscription et horodaté dans un journal (version {PRIVACY_POLICY_VERSION}).</p>
          <p>Les comptes créés avant cette version n’ont pas de preuve de cet accord dans le journal d’inscription. Une régularisation reste nécessaire avant de traiter leurs données de santé sur cette base.</p>
        </>
      ),
    },
    {
      id: 'destinataires',
      title: 'Destinataires et sous-traitants',
      content: (
        <>
          <p>Seul l’éditeur accède à tes données. Les prestataires suivants interviennent pour faire fonctionner le service :</p>
          <LegalTable
            caption="Prestataires"
            headers={['Prestataire', 'Rôle', 'Données', 'Localisation']}
            rows={PROCESSORS.map(p => [<a key={p.name} href={p.url} {...ext}>{p.name}</a>, p.role, p.data, p.location])}
          />
        </>
      ),
    },
    {
      id: 'transferts',
      title: 'Transferts hors Union européenne',
      content: (
        <p>L’hébergeur {HOST.name} opère notamment aux États-Unis et déclare s’appuyer sur le {HOST.transferMechanism} (<a href={HOST.privacyUrl} {...ext}>politique Railway</a>). Pour Strava, Anthropic ou Mistral AI selon la configuration, le pays effectivement utilisé et les garanties contractuelles doivent encore être vérifiés. Open-Meteo est établi en Suisse, pays reconnu adéquat.</p>
      ),
    },
    {
      id: 'droits',
      title: 'Tes droits',
      content: (
        <>
          <p>Tu disposes des droits d’accès, de rectification, d’effacement, de limitation, d’opposition, de portabilité et de retrait du consentement à tout moment, ainsi que du droit de définir des directives sur le sort de tes données après ton décès.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong style={strong}>Accès et portabilité</strong> : bouton « Exporter mes données » (JSON : profil, poids, objectifs, activités, traces GPS) dans <Link to="/profile" className="underline font-semibold" style={strong}>Mon profil</Link>.</li>
            <li><strong style={strong}>Rectification</strong> : modifie ton profil à tout moment.</li>
            <li><strong style={strong}>Effacement et retrait du consentement</strong> : bouton « Supprimer mon compte » dans Mon profil. La suppression efface les données actives ; les sauvegardes peuvent nécessiter un délai (à définir). La révocation du jeton Strava est tentée, y compris si Strava ne répond pas ; révoque aussi Atifit dans tes réglages Strava.</li>
            <li><strong style={strong}>Autres demandes</strong> : écris à {contact}. Réponse sous un mois.</li>
          </ul>
          <p>Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la {CNIL.name}, {CNIL.address} — <a href={CNIL.complaintUrl} {...ext}>déposer une plainte</a>.</p>
        </>
      ),
    },
    {
      id: 'securite',
      title: 'Sécurité',
      content: (
          <p>Connexion chiffrée (HTTPS), mots de passe hachés (bcrypt), jetons Strava chiffrés en base, jetons de session courts (15 min) renouvelés par rotation, limitation des tentatives de connexion, en-têtes de sécurité et journal d’audit des actions sensibles. Aucun système n’étant infaillible, toute violation présentant un risque doit être notifiée à la CNIL dans les 72 heures lorsque les conditions légales sont réunies, et aux personnes concernées en cas de risque élevé.</p>
      ),
    },
    {
      id: 'mineurs',
      title: 'Mineurs',
      content: <p>Atifit est réservé aux personnes de 15 ans et plus (article 45 de la loi Informatique et Libertés). L’âge est confirmé à l’inscription.</p>,
    },
    {
      id: 'decisions',
      title: 'Décisions automatisées',
      content: <p>Les recommandations (calories, allures, nutrition) sont calculées automatiquement mais restent indicatives. Aucune décision produisant des effets juridiques ou t’affectant de manière significative n’est prise sur cette seule base.</p>,
    },
    {
      id: 'cookies',
      title: 'Cookies et stockage local',
      content: <p>Voir la <Link to="/cookies" className="underline font-semibold" style={strong}>politique cookies</Link> : uniquement du stockage nécessaire, et les cartes CARTO seulement avec ton accord.</p>,
    },
  ];

  return <LegalDocument eyebrow="RGPD" title="Politique de confidentialité" intro="Quelles données Atifit traite, pourquoi, combien de temps, et comment exercer tes droits." sections={sections} />;
}
