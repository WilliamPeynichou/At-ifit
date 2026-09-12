export const AUBINEAU_SOURCE = {
  author: 'Nicolas Aubineau',
  role: 'Diététicien nutritionniste du sport',
  url: 'https://www.nicolas-aubineau.com/',
  note: 'Conseils de ravitaillement et comparatifs produits issus de sa documentation (articles ravitaillement trail, triathlon, semi-marathon, marathon ; comparatifs 2024 à 2026).',
};

/** Socle commun rappelé dans tous ses articles. */
export const BASE_RULES = [
  'Boisson énergétique : 500 ml par heure au minimum.',
  'Boire peu mais souvent : 2 à 3 gorgées toutes les 10 min en trail, tous les kilomètres sur route.',
  'Liquide prioritaire sur solide : la digestibilité conditionne la performance finale.',
  'Ratio sucres / glucides sous 75 % pour varier les types de glucides.',
  'Aucun produit nouveau le jour J : tout se teste à l’entraînement, en conditions réelles.',
];

/** Cible horaire théorique détaillée dans l'article marathon. */
export const HOURLY_TARGET = {
  fluidMl: 500,
  carbohydratesG: 30,
  sodiumMg: 300,
  vitaminCMg: 12,
  magnesiumMg: 56,
  vitaminBCount: 2,
};

export const RACE_PROTOCOLS = [
  {
    id: 'semi',
    label: 'Semi-marathon',
    tagline: 'Autonomie énergétique d’environ 1 h à 80–85 % de VMA : au-delà, il faut apporter.',
    base: 'Boisson énergétique emportée en ceinture (2 fioles de 250 ml ou bidon de 500 ml).',
    rhythm: '1 gorgée tous les kilomètres, ou 2 gorgées tous les 2 km.',
    avoid: 'Barres à éviter en courant. Gel seulement si testé, toujours avec de l’eau.',
    aidStation: 'Fruits frais ou séchés (abricot, orange, raisin, pomme, banane). Éviter laitages, cola et céréales.',
    highlight: 'Courir un semi sans rien consommer ne devrait jamais se faire.',
  },
  {
    id: 'marathon',
    label: 'Marathon',
    tagline: 'Apport réparti sur 42,195 km, pas seulement aux tables de ravitaillement.',
    base: '500 ml/h de boisson énergétique, complétés éventuellement par 2 à 3 gels (1 gel/h maximum).',
    rhythm: '2 à 3 gorgées tous les kilomètres ; recharge en eau aux ravitaillements tous les 5 km.',
    avoid: 'Un gel sans eau (≈ 300 ml) expose aux troubles digestifs et à l’hypoglycémie réactionnelle.',
    aidStation: 'Poche à eau 1 à 1,5 L possible pour limiter les arrêts de recharge.',
    highlight: 'Au km 25, une fiole de 125 ml de boisson de récupération limite la casse musculaire — surtout au-delà de 3 h.',
  },
  {
    id: 'trail-court',
    label: 'Trail court (< 6 h)',
    tagline: 'Semi-autonomie : ce que tu portes compte autant que les tables.',
    base: '500 ml/h de boisson énergétique. Gels limités, barres réservées au-delà de 4 h.',
    rhythm: '2 à 3 gorgées toutes les 10 min, montre programmée si besoin.',
    avoid: 'Sur faible dénivelé, inutile de piocher dans les ravitaillements de l’organisation.',
    aidStation: 'Forte dénivellation : 1 dose de boisson de récupération vers 2 h–2 h 30, idéalement en descente.',
    highlight: 'Les protéines et BCAA de la boisson de récupération limitent la casse musculaire des descentes.',
  },
  {
    id: 'trail-long',
    label: 'Trail long / ultra (> 6 h)',
    tagline: 'Nausées et vomissements figurent parmi les premières causes d’abandon sur ultra.',
    base: 'Bases respectées + boisson de récupération ou barre hyperprotéinée toutes les 2 à 3 h.',
    rhythm: 'Manger les barres en marchant et sur-mastiquer. Varier arômes et textures.',
    avoid: 'Allergènes (lactose, gluten) écartés 1 semaine avant, idéalement 3. Aucun produit inhabituel.',
    aidStation: 'Salé bienvenu : soupes diluées, TUC, jambon, fromage à pâte dure, purées d’oléagineux, compotes, féculents bien cuits.',
    highlight: 'Alterner sucré et salé entretient l’envie de manger, facteur clé en ultra.',
  },
  {
    id: 'triathlon',
    label: 'Triathlon',
    tagline: 'Un sprint et un Ironman n’appellent pas la même préparation alimentaire.',
    base: 'Apports construits surtout sur le vélo, puis simplifiés en course à pied.',
    rhythm: 'Hydratation organisée et régulière, jamais improvisée le jour J.',
    avoid: 'Repas sautés, apports en lipides trop réduits, menus monotones, déficit en sodium/magnésium/potassium.',
    aidStation: 'Semaine J-6 → J : régime dissocié modifié plutôt que scandinave, mieux toléré.',
    highlight: 'Objectif : glycogène musculaire et hépatique plein, zéro trouble digestif, hydratation optimale.',
  },
];

export const CARB_LOADING = {
  title: 'Semaine d’avant : régime dissocié modifié (RDM)',
  steps: [
    { phase: 'J-6 à J-4', detail: 'Alimentation légèrement hypoglucidique (40 à 50 % de l’apport énergétique total).' },
    { phase: 'J-3 à J', detail: 'Phase hyperglucidique (> 70 % de l’apport énergétique total), entraînement allégé.' },
    { phase: 'Format court', detail: 'Possible de ne garder que la phase hyperglucidique, étalée sur 4 jours.' },
  ],
  notes: [
    'Le RDM est mieux toléré que le régime dissocié scandinave (perte de poids, fatigue, troubles digestifs).',
    'Hydratation renforcée : minimum 2 L/jour. 1 g de glycogène est stocké avec 2,7 g d’eau.',
    'Resynthèse favorisée par une alimentation riche en glucides (8 à 12 g/kg/j) après les séances.',
  ],
};

export const PRODUCT_COMPARISONS = [
  {
    id: 'drinks',
    title: 'Boissons de l’effort',
    edition: '2026',
    use: 'Meilleur apport selon Nicolas Aubineau : eau, glucides variés, sodium, vitamines et minéraux dans un seul produit.',
    models: ['Aptonia Iso+ Pêche', 'Mulebar Boisson de l’effort Fruits rouges', 'Apurna Boisson Hydratation Orange'],
    checks: ['≈ 30 g de glucides par heure', '≈ 300 mg de sodium par heure', 'Ratio sucres/glucides sous 75 %'],
  },
  {
    id: 'gels',
    title: 'Gels énergétiques',
    edition: '2026',
    use: 'Pratique mais qualitativement limité : peu de vitamines et minéraux.',
    models: ['Decathlon Energy Gel+', 'Authentic Nutrition Boost Gel', 'Effinov Sport Hydraminov Gel+'],
    checks: ['1 gel par heure maximum', 'Toujours accompagné d’environ 300 ml d’eau', 'Risque d’hypoglycémie réactionnelle si pris seul'],
  },
  {
    id: 'bars',
    title: 'Barres énergétiques',
    edition: '2025',
    use: 'À réserver au vélo, au trail et aux allures modérées, jamais en courant vite.',
    models: ['Aptonia Barre énergétique aux dattes', 'Clif Bar Energy Bar myrtilles-amandes', 'Mulebar Barre énergétique bio'],
    checks: ['Mastication longue, de préférence en marchant', 'Sur ultra, viser 4 à 6 g de protéines par barre', 'Moins digestes que le liquide'],
  },
  {
    id: 'electrolytes',
    title: 'Boissons électrolytes',
    edition: '2024',
    use: 'Hydratation et minéraux, mais apport glucidique insuffisant seul.',
    models: ['Aptonia Boisson Sport Électrolytes', 'Aptonia Electrolytes Tabs', 'Nutripure Pure Electrolytes'],
    checks: ['≈ 300 mg de sodium par bidon', 'À compléter par une source de glucides', 'Utile par forte chaleur'],
  },
  {
    id: 'recovery',
    title: 'Boissons de récupération',
    edition: '2024',
    use: 'Aussi utilisables pendant l’effort long pour apporter protéines et BCAA.',
    models: ['Isostar After Reload Drink', 'Powerbar Recovery Active', 'Apurna Boisson de récupération'],
    checks: ['Trail : 1 dose toutes les 2 à 3 h', 'Marathon > 3 h : 125 ml vers le km 25', 'Glucides + protéines + sodium'],
  },
];

export const SPORT_FOOD_GUIDES = {
  cycling: {
    label: 'Vélo',
    before: 'Repas digeste 2 à 4 h avant, riche en glucides, pauvre en fibres et en lipides.',
    during: 'Boisson énergétique comme base (500 ml/h). Les barres sont plus faciles à gérer qu’en course à pied.',
    after: 'Glucides + protéines dans les heures qui suivent, repas salé pour la rétention hydrique.',
    practical: ['Ouvrir les emballages avant le départ', 'Recharger les bidons aux points prévus', 'Tester dilution et goûts à l’entraînement'],
  },
  running: {
    label: 'Course à pied',
    before: 'Dernier repas 2 à 4 h avant, sans aliment nouveau, pauvre en fibres et lipides.',
    during: 'Privilégier le liquide. Gel uniquement avec eau, 1 par heure maximum. Barres déconseillées en courant.',
    after: 'Réhydratation progressive puis repas associant glucides et protéines.',
    practical: ['Ceinture porte-fiole pour rester autonome', 'Petites gorgées régulières plutôt que grosses prises', 'Répéter le protocole en sortie longue'],
  },
  swimming: {
    label: 'Natation',
    before: 'Arriver hydraté, collation digeste si le repas est éloigné, sans volume excessif avant la mise à l’eau.',
    during: 'Bidon au bord du bassin pour les séances longues, prises aux pauses planifiées.',
    after: 'Boire dès la sortie, puis glucides et protéines selon la durée et la prochaine séance.',
    practical: ['Anticiper la faible sensation de soif', 'Bidon identifiable', 'Prévoir le ravitaillement en eau libre'],
  },
  triathlon: {
    label: 'Triathlon',
    before: 'Semaine en régime dissocié modifié, petit-déjeuner testé terminé environ 3 h avant.',
    during: 'Majorité des apports sur le vélo, puis stratégie simplifiée en course à pied.',
    after: 'Réhydratation, sodium, glucides et protéines dès que la tolérance revient.',
    practical: ['Étiqueter les bidons par heure', 'Planifier T1 et T2', 'Répéter la stratégie en enchaînement vélo-course'],
  },
};
