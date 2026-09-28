import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocument from '../../components/legal/LegalDocument';
import { EDITOR, HOST } from '../../data/legalInfo';

const ext = { target: '_blank', rel: 'noopener noreferrer', className: 'underline font-semibold', style: { color: 'var(--text-primary)' } };

export default function LegalNotice() {
  const missing = <span>non renseigné — à compléter par l’éditeur</span>;
  const contact = EDITOR.contactEmail
    ? <a href={`mailto:${EDITOR.contactEmail}`} className="underline font-semibold" style={{ color: 'var(--text-primary)' }}>{EDITOR.contactEmail}</a>
    : <span data-testid="contact-missing">non renseignée — à fournir par l’éditeur avant publication</span>;

  const sections = [
    {
      id: 'editeur',
      title: 'Éditeur',
      content: (
        <>
          <p><strong style={{ color: 'var(--text-primary)' }}>{EDITOR.product}</strong> ({EDITOR.url}) est édité par <strong style={{ color: 'var(--text-primary)' }}>{EDITOR.name} (EI)</strong>, entrepreneur individuel.</p>
          <p>Statut déclaré par l’éditeur : <strong style={{ color: 'var(--text-primary)' }}>{EDITOR.status}</strong>. Le service est gratuit, sans publicité, sans abonnement ni achat intégré.</p>
          <p>Adresse professionnelle : {EDITOR.businessAddress || missing}.</p>
          <p>Immatriculation (SIREN / RCS selon situation) : {EDITOR.siren || missing}.</p>
          <p>TVA : {EDITOR.vatNumber ? `n° ${EDITOR.vatNumber}` : 'TVA non applicable, art. 293 B du CGI'}.</p>
          <p>Téléphone professionnel : {EDITOR.businessPhone || missing}.</p>
          <p>Directeur de la publication : {EDITOR.publicationDirector}.</p>
          <p>Adresse électronique de contact : {contact}.</p>
        </>
      ),
    },
    {
      id: 'hebergeur',
      title: 'Hébergeur',
      content: (
        <>
          <p><strong style={{ color: 'var(--text-primary)' }}>{HOST.name}</strong></p>
          <p>{HOST.address}</p>
          <p>Téléphone : {HOST.phone} · <a href={HOST.url} {...ext}>railway.com</a></p>
        </>
      ),
    },
    {
      id: 'propriete',
      title: 'Propriété intellectuelle',
      content: (
        <>
          <p>La licence applicable au code et aux créations originales doit être précisée par l’éditeur ; aucune autorisation de réutilisation n’est accordée par ces mentions.</p>
          <p>La documentation nutritionnelle (comparatifs de gels, barres, boissons, électrolytes et récupération) provient des travaux de <a href="https://www.nicolas-aubineau.com/" {...ext}>Nicolas Aubineau</a>. Cette documentation est publique ; elle est reprise avec attribution et lien vers la source ; le détail figure sur la page <Link to="/sources" className="underline font-semibold" style={{ color: 'var(--text-primary)' }}>Sources</Link>.</p>
          <p>Les marques et noms de produits cités (dont Strava et les marques de nutrition sportive) appartiennent à leurs titulaires. Leur mention est informative et n’implique aucun partenariat ni rémunération.</p>
          <p>Données cartographiques © contributeurs <a href="https://www.openstreetmap.org/copyright" {...ext}>OpenStreetMap</a> (ODbL), fonds de carte © <a href="https://carto.com/attributions" {...ext}>CARTO</a>. Polices Bebas Neue, Outfit et Geist Mono sous licence SIL Open Font License, hébergées sur nos serveurs.</p>
        </>
      ),
    },
    {
      id: 'sante',
      title: 'Avertissement santé',
      content: (
        <>
          <p>Atifit fournit des informations générales d’entraînement et de nutrition sportive. Ce n’est <strong style={{ color: 'var(--text-primary)' }}>pas un dispositif médical</strong> : les calculs (calories, allures, stratégies nutritionnelles) sont indicatifs et ne remplacent ni un diagnostic ni l’avis d’un médecin, d’un diététicien ou d’un entraîneur qualifié.</p>
          <p>En cas de pathologie, de grossesse, de trouble alimentaire ou de symptôme inhabituel à l’effort, consulte un professionnel de santé avant d’appliquer une recommandation.</p>
        </>
      ),
    },
    {
      id: 'ia',
      title: 'Coach IA',
      content: (
        <p>Les réponses du Coach IA sont générées automatiquement par un modèle d’intelligence artificielle (Anthropic ou Mistral AI selon la configuration). Elles peuvent contenir des erreurs : vérifie toute information importante. Aucune décision produisant un effet juridique n’est prise automatiquement.</p>
      ),
    },
    {
      id: 'donnees',
      title: 'Données personnelles et cookies',
      content: (
        <p>Le traitement de tes données est décrit dans la <Link to="/confidentialite" className="underline font-semibold" style={{ color: 'var(--text-primary)' }}>politique de confidentialité</Link>. Le stockage local et les contenus tiers sont détaillés dans la <Link to="/cookies" className="underline font-semibold" style={{ color: 'var(--text-primary)' }}>politique cookies</Link>.</p>
      ),
    },
    {
      id: 'accessibilite',
      title: 'Accessibilité',
      content: (
        <p>Atifit vise le niveau WCAG 2.2 AA (navigation clavier, contrastes, libellés, zoom). Aucun audit RGAA officiel n’a été réalisé : le site n’est donc pas déclaré conforme. Signale toute difficulté d’accès à l’adresse de contact ci-dessus.</p>
      ),
    },
    {
      id: 'securite',
      title: 'Signaler une vulnérabilité',
      content: (
        <p>Si tu découvres une faille de sécurité, contacte l’éditeur de façon privée (adresse ci-dessus) sans exploiter la faille ni accéder aux données d’autres utilisateurs. Merci de laisser un délai raisonnable de correction avant toute divulgation.</p>
      ),
    },
    {
      id: 'droit',
      title: 'Droit applicable',
      content: (
        <p>Les présentes mentions sont régies par le droit français. Fondement : loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN), article 6.</p>
      ),
    },
  ];

  return <LegalDocument eyebrow="Informations légales" title="Mentions légales" intro="Qui édite Atifit, qui l’héberge et dans quelles conditions l’utiliser." sections={sections} />;
}
