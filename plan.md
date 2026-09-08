# Plan de développement — Nutrition sportive intelligente

## 1. Vision produit

Atifit doit intégrer une page de **data analyse nutritionnelle personnalisée pour l’athlète**, et non un simple compteur de calories ou un chatbot donnant des conseils génériques.

La fonctionnalité principale est une **card de préparation nutritionnelle d’un effort**. L’utilisateur décrit une activité future, Atifit rapproche cette activité de ses performances Strava, estime son scénario d’effort, récupère les conditions saisonnières et météorologiques du lieu, puis génère un objectif nutritionnel avant, pendant et après l’exercice.

La recommandation repose sur trois couches séparées :

1. un moteur data science estime la durée, l’intensité, la dépense et les contraintes de l’effort à partir de l’historique personnel ;
2. un moteur nutritionnel déterministe calcule des plages de glucides, hydratation, sodium, protéines et autres nutriments ;
3. l’IA interprète l’objectif libre, demande les données manquantes, explique les résultats et traduit les cibles en stratégie compréhensible.

L’IA ne doit jamais inventer les valeurs nutritionnelles ou dépasser les bornes du moteur scientifique.

---

## 2. Décisions de cadrage validées

| Sujet | Décision |
|---|---|
| Public initial | Athlète individuel |
| Positionnement | Data analyse nutritionnelle sportive |
| Card principale V1 | Préparer la nutrition d’un effort futur |
| Sports de la card V1 | Cyclisme, course à pied, natation |
| Extension ultérieure | Tous les sports, regroupés par familles physiologiques |
| Activités | Analyse passée et préparation future |
| Création future avancée | Conversation avec l’IA puis confirmation |
| Nutrition quotidienne | Objectifs et recommandations, sans journal repas détaillé |
| Produits commerciaux | Open Food Facts avec cache et score qualité Atifit |
| Consommation réelle | Confirmation globale après l’effort |
| Météo | Automatique selon date, heure et lieu |
| Localisation | Coordonnées précises conservées avec consentement explicite |
| Nutriments | Calories, macros, eau, électrolytes, caféine, vitamines et minéraux |
| Précautions | Profil santé facultatif et fortement protégé |
| Référentiel | Scientifique, documenté et versionné dans le projet |
| Calculs | Déterministes, testables et reproductibles |
| Rôle de l’IA | Extraction, clarification, orchestration et explication |

---

## 3. Expérience centrale — Card « Nutrition pour mon effort »

### 3.1 Emplacement

La card doit être le point d’entrée principal de la page `/nutrition`. Elle doit être visible immédiatement avant les analyses secondaires.

### 3.2 Entrées utilisateur

#### Sport

Sélection obligatoire parmi :

- vélo ;
- course à pied ;
- natation.

Le sport détermine les données Strava comparables, les modèles de durée et les contraintes de ravitaillement.

#### Distance

- obligatoire ;
- exprimée en kilomètres ;
- bornes adaptées au sport ;
- validation stricte côté frontend et backend.

#### Dénivelé positif

- exprimé en mètres ;
- utile principalement pour le vélo et la course ;
- facultatif ou égal à zéro pour la natation ;
- peut servir à distinguer route, trail, parcours vallonné ou montagneux.

#### Objectif libre

Textarea interprétée par l’IA, par exemple :

> Je veux terminer mon premier marathon sans baisse d’énergie, autour de 4 h 15, avec une allure prudente au départ.

ou :

> Sortie vélo soutenue de 120 km avec 1 500 m de D+, objectif performance, mais j’ai du mal à manger solide après trois heures.

L’IA extrait uniquement des variables autorisées :

- objectif de temps ;
- objectif de performance ou de complétion ;
- intensité perçue ;
- contraintes digestives ;
- stratégie prudente ou agressive ;
- contexte entraînement ou compétition ;
- informations manquantes à demander.

Le texte original est conservé comme demande utilisateur, mais les calculs reposent sur la structure validée, pas directement sur le texte libre.

#### Date et heure prévues

Nécessaires pour :

- déterminer la saison ;
- récupérer une prévision météo lorsqu’elle est disponible ;
- sinon utiliser des normales saisonnières clairement identifiées comme estimations ;
- calculer le temps disponible pour le repas avant l’effort.

#### Lieu

Recherche géographique puis sélection explicite :

- nom du lieu ;
- latitude ;
- longitude ;
- pays et fuseau horaire.

Le lieu sert uniquement au contexte environnemental et à l’explicabilité. Les coordonnées précises ne sont jamais envoyées au LLM.

### 3.3 Données automatiques utilisées

Après validation des entrées, Atifit récupère :

- profil, poids et objectifs de l’utilisateur ;
- profil nutritionnel et restrictions ;
- activités Strava comparables du même sport ;
- performances calculées dans les services vélo, course et natation ;
- charge et forme récentes lorsqu’elles sont pertinentes ;
- données cardio, puissance, allure, vitesse et cadence disponibles ;
- saison, météo ou climat historique du lieu ;
- taux de sudation personnel s’il est renseigné ;
- tolérance digestive et habitudes glucidiques.

### 3.4 Sortie de la card

La card affiche d’abord un scénario d’effort estimé :

- durée prévisible sous forme de plage ;
- durée cible retenue ;
- niveau d’intensité ;
- dépense énergétique estimée ;
- difficulté relative par rapport à l’historique ;
- stress thermique et hydrique ;
- confiance de la prédiction ;
- données manquantes et hypothèses.

Elle présente ensuite la stratégie nutritionnelle :

#### Avant

- glucides totaux et plage ;
- eau et sodium ;
- timing du repas et de la collation ;
- recommandations sur fibres et lipides proches de l’effort ;
- exemples de produits ou repas compatibles.

#### Pendant — résultat principal

- objectif de glucides en g/h ;
- objectif total de glucides ;
- eau en ml/h et volume total ;
- sodium en mg/h et total ;
- potassium et magnésium seulement lorsque justifiés ;
- caféine éventuelle avec limites de sécurité ;
- fréquence des prises ;
- chronologie de ravitaillement ;
- nombre de gels, barres, portions ou bidons ;
- variantes liquide, solide ou mixte ;
- alertes de tolérance digestive et d’entraînement de l’intestin.

#### Après

- glucides de récupération ;
- protéines ;
- réhydratation ;
- sodium ;
- délai conseillé ;
- priorité selon le temps avant la prochaine séance.

### 3.5 Actions

- ajuster les hypothèses ;
- demander une explication à l’IA ;
- remplacer un produit ;
- choisir une variante de stratégie ;
- confirmer et enregistrer le plan ;
- exporter une checklist ;
- confirmer globalement après l’effort : suivi, majoritairement suivi, partiellement suivi ou non suivi.

---

## 4. Volet data science

## 4.1 Objectif

Le volet data science ne doit pas « prédire combien manger » directement. Il doit d’abord estimer le **scénario physiologique probable de l’effort**. Ce scénario devient l’entrée du moteur nutritionnel.

Pipeline cible :

```text
Entrées activité future
        ↓
Sélection des activités Strava comparables
        ↓
Features personnelles + parcours + environnement
        ↓
Prédiction durée / intensité / dépense / stress thermique
        ↓
Score de confiance et intervalles
        ↓
Moteur nutritionnel scientifique
        ↓
Stratégie avant / pendant / après
        ↓
Explication et personnalisation par l’IA
```

## 4.2 Sélection des activités comparables

Filtrer strictement par utilisateur et par sport, puis calculer une similarité selon :

- distance ;
- D+ absolu ;
- D+ par kilomètre ;
- durée ;
- type d’activité ;
- saison ;
- température ;
- niveau d’intensité ;
- terrain ou profil disponible ;
- récence ;
- statut entraînement/compétition lorsque connu.

Une pondération de récence évite qu’une performance très ancienne domine le modèle.

Si le volume de données personnelles est insuffisant, utiliser progressivement :

1. un modèle personnel ;
2. des heuristiques issues des dernières activités comparables ;
3. des formules génériques documentées ;
4. une demande de temps cible à l’utilisateur.

Ne jamais entraîner un modèle global multi-utilisateurs sans consentement, anonymisation et gouvernance dédiés.

## 4.3 Features par sport

### Vélo

- distance et D+ ;
- D+/km ;
- vitesse moyenne historique ;
- puissance moyenne et normalisée ;
- FTP et W/kg avec niveau de confiance ;
- IF et TSS ;
- fréquence cardiaque ;
- cadence ;
- part de montée ;
- vent et température ;
- type de vélo et home trainer ;
- poids ;
- fatigue récente.

### Course

- distance et D+ ;
- allure historique ;
- allure équivalente sur plat si calcul fiable ;
- fréquence cardiaque ;
- charge et dérive cardio ;
- type route/trail ;
- rythme des sorties longues ;
- records récents ;
- température et humidité ;
- poids ;
- fatigue récente.

### Natation

- distance ;
- allure par 100 m ;
- durée ;
- type piscine/eau libre ;
- fréquence de mouvements si disponible ;
- température de l’eau si disponible ;
- pauses et accès au ravitaillement ;
- historique sur distances comparables.

Le D+ n’intervient pas pour la natation.

## 4.4 Modèles par niveau de maturité

### Niveau 0 — Heuristiques robustes

À livrer en premier :

- médiane pondérée des activités similaires ;
- ratios personnels temps/km ou vitesse ;
- ajustement documenté pour D+ ;
- correction environnementale bornée ;
- intervalles issus de la dispersion historique.

Avantages : explicable, testable et viable avec peu de données.

### Niveau 1 — Régression personnelle

Quand l’utilisateur possède assez d’activités valides :

- régression robuste ou gradient boosting léger ;
- validation temporelle, jamais de split aléatoire naïf ;
- comparaison systématique au baseline heuristique ;
- activation uniquement si le modèle améliore réellement l’erreur hors échantillon.

### Niveau 2 — Calibration continue

Après activité :

- rapprocher activité prévue et activité Strava réelle ;
- mesurer erreur de durée et d’intensité ;
- recalibrer les coefficients personnels ;
- suivre la dérive du modèle ;
- ne pas assimiler automatiquement une mauvaise performance à un problème nutritionnel.

## 4.5 Cibles prédites

Le moteur data science retourne au minimum :

```json
{
  "estimatedDurationMinutes": {
    "low": 210,
    "target": 235,
    "high": 270
  },
  "intensityClass": "moderate_high",
  "estimatedEnergyKcal": {
    "low": 2200,
    "target": 2550,
    "high": 2950
  },
  "heatStress": "high",
  "estimatedSweatRateMlPerHour": {
    "low": 500,
    "target": 700,
    "high": 900
  },
  "confidence": 0.74,
  "modelType": "personal_weighted_baseline",
  "comparableActivitiesCount": 12,
  "assumptions": [],
  "missingFeatures": []
}
```

Le moteur nutritionnel calcule la cible horaire sur la durée centrale. La durée haute sert uniquement à dimensionner une **réserve de produits transportables**, jamais à forcer la consommation d’eau, de sodium ou de glucides. La prise reste plafonnée par les bornes horaires et s’arrête avec l’effort afin d’éviter surhydratation et surconsommation.

## 4.6 Définition de la confiance

La confiance affichée n’est pas une probabilité clinique. C’est un indice de qualité de prédiction borné entre 0 et 1, accompagné d’un libellé faible, modéré ou élevé.

Version V1 :

- 35 % couverture de distance/D+ par les activités comparables ;
- 25 % quantité effective de comparables ;
- 20 % récence ;
- 10 % complétude des capteurs utiles ;
- 10 % disponibilité météo ou climatique.

Les intervalles V1 proviennent des quantiles empiriques pondérés des erreurs du baseline sur validation temporelle. Ils ne doivent pas être présentés comme des intervalles médicaux. Les pondérations et seuils seront calibrés sur les fixtures puis versionnés.

Seuils initiaux :

- faible : moins de 0,45 ;
- modéré : 0,45 à 0,74 ;
- élevé : au moins 0,75.

## 4.7 Saison, météo et lieu

### Prévision proche

Lorsque la date est couverte par l’API météo :

- température ;
- humidité ;
- vent ;
- pluie ;
- rayonnement ou indice apparent si disponible ;
- heure locale.

### Date lointaine

Une météo précise ne doit pas être inventée. Utiliser :

- saison locale ;
- normales climatiques du lieu et du mois ;
- plage probable ;
- confiance plus faible ;
- recalcul automatique proposé 24 heures puis quelques heures avant l’effort.

La saison doit dépendre de l’hémisphère et de la localisation, pas seulement du mois français.

### Impact nutritionnel

L’environnement ajuste dans des bornes documentées :

- besoin hydrique ;
- sodium ;
- forme des produits ;
- facilité d’ingestion ;
- risque de surhydratation ;
- prudence sur les hautes températures.

Il ne doit pas modifier arbitrairement les glucides sans justification liée à la durée ou à l’intensité.

## 4.8 Qualité des données

Chaque feature possède un indicateur :

- présente ;
- absente ;
- mesurée ;
- estimée ;
- ancienne ;
- aberrante.

Exemples de contrôles :

- puissance capteur vs puissance estimée ;
- fréquence cardiaque manquante ;
- activité manuelle sans streams ;
- GPS incohérent ;
- poids trop ancien ;
- météo indisponible ;
- durée avec pauses extrêmes.

Les lignes invalides peuvent être exclues du modèle mais doivent rester visibles dans l’historique utilisateur.

## 4.9 Métriques de qualité du modèle

Suivre par sport :

- MAE et MAPE sur la durée ;
- erreur sur la dépense énergétique ;
- couverture des intervalles de prédiction ;
- nombre d’activités comparables ;
- erreur par plage de distance et D+ ;
- erreur par saison et stress thermique ;
- comparaison baseline vs modèle personnel ;
- dérive sur les 90 derniers jours.

Le modèle personnel n’est utilisé que s’il dépasse le baseline sur une validation temporelle minimale.

## 4.10 Explicabilité

La card doit pouvoir afficher :

> Estimation fondée sur 9 sorties vélo récentes de 80 à 130 km, dont 4 parcours vallonnés. Ta vitesse médiane corrigée du dénivelé est de 27,1 km/h. La chaleur prévue augmente surtout le besoin hydrique. Confiance : modérée, car seules 3 sorties disposent de puissance mesurée.

Aucun identifiant interne, token, coordonnées précises ou stream brut n’est envoyé au LLM.

---

## 5. Moteur nutritionnel déterministe

## 5.1 Interface

```js
generateNutritionAnalysis({
  athlete,
  healthRestrictions,
  predictedEffort,
  weather,
  nutritionProfile,
  objective,
  availableProducts,
  rulesVersion
})
```

## 5.2 Résultat attendu

```json
{
  "before": {},
  "during": {
    "carbohydratesGPerHour": {},
    "carbohydratesTotalG": {},
    "fluidMlPerHour": {},
    "fluidTotalMl": {},
    "sodiumMgPerHour": {},
    "sodiumTotalMg": {},
    "timeline": []
  },
  "after": {},
  "productSuggestions": [],
  "assumptions": [],
  "missingData": [],
  "warnings": [],
  "confidence": {},
  "algorithmVersion": "1.0.0",
  "knowledgeVersion": "1.0.0"
}
```

Les résultats doivent être des plages avec une cible centrale, et non une précision artificielle.

## 5.3 Règles générales

- glucides pendant l’effort selon durée, intensité, sport et tolérance digestive ;
- montée progressive des cibles élevées, jamais sans entraînement digestif ;
- hydratation limitée par des bornes de sécurité ;
- sodium fondé sur sudation et environnement, avec incertitude explicite ;
- récupération adaptée au délai avant la séance suivante ;
- caféine facultative et bloquée par les restrictions ;
- micronutriments présentés comme objectifs, jamais comme diagnostic de carence ;
- recommandations à risque bloquées ou orientées vers un professionnel.

---

## 6. Nutrition quotidienne

La page fournit des objectifs sans imposer un journal alimentaire complet :

- énergie quotidienne ;
- glucides variables selon jour de repos, entraînement ou compétition ;
- protéines ;
- lipides ;
- fibres ;
- eau ;
- références en vitamines et minéraux ;
- recommandations alimentaires compatibles avec le régime.

Sans journal alimentaire détaillé ou analyse biologique, Atifit ne doit jamais affirmer une carence en fer, vitamine D, magnésium ou autre micronutriment.

---

## 7. Référentiel scientifique et skills

## 7.1 Emplacement versionné

Le dossier `skills/` actuel étant ignoré et imbriqué, le référentiel applicatif doit être stocké dans :

```text
server/knowledge/sports-nutrition/
├── README.md
├── manifest.json
├── rules/
│   ├── energy/
│   ├── carbohydrates/
│   ├── proteins/
│   ├── fats/
│   ├── hydration/
│   ├── sodium/
│   ├── electrolytes/
│   ├── caffeine/
│   ├── micronutrients/
│   └── recovery/
├── sports/
│   ├── cycling.md
│   ├── running.md
│   ├── swimming.md
│   ├── endurance.md
│   ├── intermittent.md
│   ├── strength.md
│   ├── ultra-endurance.md
│   └── aquatic.md
├── safety/
│   ├── allergies.md
│   ├── diabetes.md
│   ├── hypertension.md
│   ├── renal-risk.md
│   ├── pregnancy.md
│   ├── eating-disorders.md
│   └── medical-escalation.md
├── sources/
│   └── bibliography.json
├── schemas/
└── fixtures/
```

## 7.2 Contrat d’une règle

Chaque règle contient :

- identifiant stable ;
- version ;
- statut ;
- population concernée ;
- entrées nécessaires ;
- formule ou table de décision ;
- unité de sortie ;
- bornes de sécurité ;
- références ;
- niveau de confiance ;
- date de revue ;
- cas limites et exceptions.

Les sources privilégiées sont les consensus, position stands, publications revues par les pairs et organismes reconnus de nutrition sportive.

---

## 8. Open Food Facts et produits commerciaux

L’utilisateur peut rechercher un produit ou saisir/scanner son code-barres. Atifit met les réponses utiles en cache dans sa propre base.

### Score qualité Atifit

Le score vérifie la présence et la cohérence de :

- énergie ;
- glucides et sucres ;
- protéines ;
- lipides ;
- fibres ;
- sel ou sodium ;
- portion ;
- ingrédients ;
- allergènes ;
- date de mise à jour.

Un produit recommandé pendant l’effort doit au minimum disposer de glucides et d’une portion exploitable. Il ne peut être proposé comme source d’électrolytes si sel/sodium manque.

Conversions obligatoires et testées :

- sel vers sodium ;
- sodium vers sel ;
- pour 100 g vers portion ;
- ml vers g uniquement si la densité est connue.

### Sécurité allergènes et traçabilité

Open Food Facts est une source collaborative et ne peut pas garantir l’exhaustivité des allergènes. En conséquence :

- un produit dont les allergènes ou ingrédients sont absents reçoit le statut `unsafe_for_personalized_matching` pour un utilisateur ayant déclaré une allergie ;
- aucune absence d’allergène ne peut être déduite d’un champ vide ;
- chaque recommandation conserve un snapshot normalisé, l’identifiant OFF, la date source et un hash de la réponse ;
- l’utilisateur voit la provenance communautaire et doit vérifier l’étiquette physique ;
- les restrictions déclarées excluent le produit avant tout classement par l’IA.

Les allergènes et exclusions du profil sont prioritaires sur toute suggestion IA.

---

## 9. Météo et localisation

Utiliser une abstraction fournisseur, avec Open-Meteo comme candidat V1 :

```js
weatherProvider.getForecast({ latitude, longitude, dateTime });
weatherProvider.getClimateNormals({ latitude, longitude, month });
```

Règles :

- consentement explicite pour conserver la localisation ;
- coordonnées protégées et supprimables ;
- coordonnées jamais envoyées au LLM ;
- snapshot météo enregistré avec le plan ;
- distinction visible entre prévision et normale climatique ;
- actualisation avant l’effort ;
- proposition de recalcul si les conditions changent fortement.

---

## 10. Profil nutritionnel et précautions santé

## 10.1 Profil

- régime alimentaire ;
- allergies et intolérances ;
- ingrédients exclus ;
- préférence gels/barres/boissons/solide ;
- sensibilité digestive ;
- niveau d’entraînement intestinal ;
- taux de sudation mesuré ou perçu ;
- sueur salée ;
- consommation habituelle de caféine ;
- objectif nutritionnel.

## 10.2 Précautions facultatives

- diabète ;
- hypertension ;
- maladie rénale ou cardiovasculaire ;
- troubles gastro-intestinaux ;
- grossesse/allaitement ;
- médicaments influençant hydratation, glycémie ou électrolytes ;
- troubles du comportement alimentaire déclarés.

Le backend transforme ces informations en restrictions abstraites. Les diagnostics et notes sensibles ne sont pas nécessaires dans le prompt IA.

---

## 11. Modèle de données proposé

### `NutritionProfile`

Préférences, tolérance digestive, sudation, caféine et objectifs.

### `HealthPrecaution`

Catégorie, restrictions calculées, statut actif et notes chiffrées limitées.

### `PlannedActivity`

```text
id, userId, sportType, sportFamily, title, objectiveText,
objectiveStructured, plannedStartAt, estimatedDurationMinutes,
distanceEstimate, elevationEstimate, latitude, longitude,
locationLabel, timeZone, status, createdBy, createdAt, updatedAt
```

### `WeatherSnapshot`

Fournisseur, coordonnées, température, humidité, vent, pluie, date prévue, type prévision/normale, confiance et date de récupération.

### `EffortPrediction`

Features versionnées, activités comparables, modèle, durée, intensité, dépense, sudation, intervalles, score de confiance et métriques du modèle.

### `NutritionPlan`

Lien vers activité Strava ou activité future, version algorithme, version connaissance, stratégies avant/pendant/après, hypothèses, alertes et confiance.

### `NutritionProduct`

Cache Open Food Facts normalisé avec code-barres, portion, nutriments, allergènes et score qualité.

### `NutritionPlanItem`

Phase, timing, produit, quantité, unité et nutriments calculés.

### `NutritionCompletion`

Confirmation globale, adhérence estimée, ajustements et ressenti facultatif après effort.

---

## 12. Services backend proposés

```text
server/services/nutrition/
├── nutritionEngine.js
├── preExerciseCalculator.js
├── duringExerciseCalculator.js
├── recoveryCalculator.js
├── dailyTargetsCalculator.js
├── hydrationCalculator.js
├── electrolyteCalculator.js
├── micronutrientCalculator.js
├── productMatcher.js
├── safetyRules.js
└── explainability.js

server/services/effortPrediction/
├── featureBuilder.js
├── comparableActivities.js
├── cyclingPredictor.js
├── runningPredictor.js
├── swimmingPredictor.js
├── environmentalAdjustments.js
├── confidenceScorer.js
└── modelEvaluation.js

server/services/providers/
├── weatherProvider.js
├── geocodingProvider.js
└── openFoodFactsProvider.js
```

Tous les services doivent être indépendants du LLM et testables avec des fixtures.

---

## 13. Couche IA agentique

## 13.1 Intentions supplémentaires

- `plan_nutrition_effort` ;
- `create_planned_activity` ;
- `clarify_effort_objective` ;
- `replace_nutrition_product` ;
- `explain_nutrition_plan` ;
- `confirm_nutrition_plan`.

## 13.2 Actions avec confirmation

- créer une activité future ;
- générer ou recalculer un plan ;
- remplacer les produits ;
- enregistrer le plan ;
- marquer globalement le plan après l’effort.

## 13.3 Garde-fous

- schéma JSON strict pour l’objectif extrait ;
- aucune formule décidée par le LLM ;
- aucune coordonnée précise dans le prompt ;
- aucune donnée médicale brute ;
- aucune suggestion allergène ;
- aucune affirmation de carence ;
- aucun diagnostic ;
- limites du moteur prioritaires ;
- données manquantes explicitement signalées.

---

## 14. API proposée

### Profil

```text
GET    /api/nutrition/profile
PUT    /api/nutrition/profile
GET    /api/nutrition/health-precautions
PUT    /api/nutrition/health-precautions
```

### Card et prédiction

```text
POST   /api/nutrition/effort/preview
POST   /api/nutrition/effort/propose
POST   /api/nutrition/effort/proposals/:id/confirm
GET    /api/nutrition/effort-predictions/:id
```

`preview` peut calculer depuis un formulaire structuré. `propose` utilise l’objectif libre et le dialogue IA, mais ne persiste rien avant confirmation.

### Plans

```text
POST   /api/nutrition/analyze/strava/:activityId
POST   /api/nutrition/analyze/planned/:plannedActivityId
GET    /api/nutrition/plans
GET    /api/nutrition/plans/:id
POST   /api/nutrition/plans/:id/confirm
POST   /api/nutrition/plans/:id/complete
```

### Produits

```text
GET    /api/nutrition/products/search
GET    /api/nutrition/products/barcode/:barcode
POST   /api/nutrition/plans/:id/products
DELETE /api/nutrition/plans/:id/products/:itemId
```

### Objectifs quotidiens

```text
GET    /api/nutrition/daily-targets
POST   /api/nutrition/daily-targets/recalculate
```

---

## 15. Interface `/nutrition`

## 15.1 Card principale

Ordre UX recommandé :

1. choisir vélo, course ou natation ;
2. renseigner distance ;
3. renseigner D+ si applicable ;
4. sélectionner date et heure ;
5. sélectionner le lieu ;
6. décrire l’objectif ;
7. demander l’analyse ;
8. répondre aux clarifications IA éventuelles ;
9. examiner le scénario prédit ;
10. générer puis confirmer la stratégie.

## 15.2 Autres sections

- objectifs nutritionnels du jour ;
- prochaine activité et météo ;
- plans enregistrés ;
- activités Strava passées à analyser ;
- catalogue de produits ;
- profil nutritionnel ;
- historique des confirmations.

## 15.3 Visualisations

- timeline des prises ;
- glucides g/h cible et cumul ;
- eau ml/h et cumul ;
- sodium mg/h et cumul ;
- comparaison de l’effort futur aux activités similaires ;
- intervalle de durée ;
- impact météo ;
- niveau de confiance ;
- origine de chaque donnée : mesurée, calculée ou estimée.

---

## 16. Stratégie de tests

## 16.1 Tests unitaires scientifiques

- calculs par sport, durée et intensité ;
- D+ ;
- température et humidité ;
- taux de sudation connu ou inconnu ;
- glucides, eau, sodium, protéines et caféine ;
- micronutriments ;
- conversions de produits ;
- valeurs manquantes et extrêmes ;
- restrictions santé et allergènes.

## 16.2 Tests data science

- sélection des comparables strictement limitée à l’utilisateur ;
- récence et similarité ;
- prédictions sans fuite temporelle ;
- validation temporelle ;
- baseline toujours disponible ;
- intervalles cohérents ;
- pas de résultat négatif ;
- augmentation raisonnable de durée avec distance/D+ ;
- fallback quand aucune activité comparable n’existe ;
- mesure de MAE/MAPE sur fixtures ;
- activation du modèle uniquement s’il dépasse le baseline.

## 16.3 Tests IA

- extraction sport/distance/D+/objectif/date/lieu ;
- clarification des champs absents ;
- résistance à la prompt injection dans le textarea ;
- confirmation obligatoire ;
- respect du JSON moteur ;
- aucune invention météo ;
- aucune fuite de coordonnées ou santé ;
- refus des dosages médicaux.

## 16.4 Tests E2E

1. compléter le profil nutritionnel ;
2. ouvrir `/nutrition` ;
3. sélectionner un sport ;
4. saisir distance, D+, date, lieu et objectif ;
5. obtenir une prédiction fondée sur Strava ;
6. consulter les comparables et la confiance ;
7. générer avant/pendant/après ;
8. rechercher et remplacer un produit ;
9. confirmer le plan ;
10. confirmer globalement après l’effort.

---

## 17. Sécurité, conformité et gouvernance

Cette section est un prérequis de conception, pas une tâche de fin de projet.

### 17.1 Positionnement santé

La V1 cible uniquement des adultes sains de 18 ans ou plus. Pour les utilisateurs déclarant diabète, maladie rénale ou cardiovasculaire, hypertension non contrôlée, grossesse/allaitement, TCA actif ou médicament à interaction potentielle :

- les recommandations personnalisées à risque sont désactivées ;
- aucune dose personnalisée de sodium, caféine ou complément n’est produite ;
- le produit affiche une orientation vers un médecin ou diététicien du sport ;
- les restrictions ont priorité sur toute autre règle.

Avant ouverture à ces populations, une analyse réglementaire formelle devra décider si le logiciel entre dans le champ du règlement européen sur les dispositifs médicaux. Un avertissement seul ne suffit pas.

### 17.2 RGPD et consentements

Les précautions santé relèvent de données sensibles. Avant la Phase 2, réaliser une analyse juridique et une DPIA, puis documenter :

- consentement explicite et granulaire pour santé, localisation, Strava et traitement IA ;
- finalités et base légale ;
- durée de conservation ;
- export, rectification et suppression ;
- sous-traitants, localisation et contrats de traitement ;
- politique de suppression des plans dérivés lorsque le profil santé est supprimé ;
- registre d’accès et journalisation des consentements.

L’éligibilité ou non à un hébergement HDS doit être confirmée juridiquement avant collecte en production.

### 17.3 Contrat de données LLM

Autorisé après minimisation : pseudo facultatif, sport, objectif nettoyé, scénario agrégé, cibles calculées et restrictions abstraites.

Interdit : coordonnées, diagnostic, médicaments nominatifs, notes santé, tokens, identifiants internes, streams bruts, parcours GPS, historique complet et données non nécessaires.

Le fournisseur IA devra offrir un contrat de traitement, une politique de rétention acceptable et l’absence de réutilisation des données pour entraîner ses modèles. Chaque appel journalise les catégories de données transmises, jamais leurs valeurs sensibles.

### 17.4 Prompt injection et actions

- textarea limité en taille et nettoyé comme donnée non fiable ;
- extraction par schéma JSON strict avec allow-list et validation serveur ;
- aucune instruction, URL ou tool-call issu du texte n’est exécuté ;
- propositions et confirmations utilisent un identifiant opaque, une expiration et l’utilisateur authentifié ;
- endpoints de confirmation idempotents avec verrou optimiste ;
- quotas IA par utilisateur et par IP ;
- aucune confirmation implicite générée par le LLM.

### 17.5 Priorité des données de sudation

Ordre déterministe : mesure personnelle récente issue d’un protocole documenté, puis moyenne de mesures personnelles, puis estimation environnementale bornée, puis plage générique prudente. La source et la date sont toujours affichées.

### 17.6 Versionnement et audit

Un `recommendationSnapshotVersion` référence ensemble :

- version du code moteur ;
- version du référentiel scientifique ;
- version du feature builder ;
- version du prédicteur ;
- snapshot météo ;
- snapshot produit ;
- entrées minimisées et sorties finales.

Les plans passés restent reproductibles. Une correction de sécurité ne les réécrit pas silencieusement : elle les marque obsolètes et propose un recalcul. Un journal append-only trace création, calcul, confirmation, recalcul et complétion.

### 17.7 MLOps V1

- conserver features dérivées, prédiction et vérité observée ;
- exécuter baseline et candidat en shadow mode avant activation ;
- validation rolling-origin avec au moins trois fenêtres temporelles ;
- ne pas activer de modèle personnel avant un minimum initial de 30 activités valides et 10 observations de validation ;
- exiger une amélioration de MAE d’au moins 10 % sur le baseline sans dégrader fortement un sous-groupe de distance/saison ;
- rollback immédiat vers le baseline versionné ;
- alertes sur dérive, couverture des intervalles et données manquantes.

Avec peu de données, rester sur le baseline explicable. Le gradient boosting est hors V1 tant que le volume personnel ne justifie pas sa complexité.

### 17.8 Unités, temps et concurrence

Toutes les valeurs sont stockées en unités SI canoniques et converties uniquement à l’affichage. `plannedStartAt` est stocké en UTC avec le fuseau IANA du lieu. Les API de création et confirmation acceptent une clé d’idempotence et une version de ressource pour empêcher doublons et écrasements concurrents.

---

## 18. Phases de réalisation

### Phase 0 — Corrections analytics préalables

Avant de fonder la nutrition sur les performances actuelles :

- traiter les findings critiques de `auditData.md` ;
- unifier ATL/CTL/TSB ;
- corriger les zones de puissance ;
- supprimer les planchers FC max arbitraires ou les rendre explicites ;
- améliorer la confiance FTP ;
- fiabiliser les unités et validations.

### Phase 1 — Référentiel scientifique

- bibliographie ;
- format versionné des règles ;
- règles glucides/hydratation/sodium/protéines ;
- limites de sécurité ;
- fixtures et tests.

### Phase 2 — Profil nutritionnel et santé

- migrations ;
- modèles ;
- chiffrement et permissions ;
- API ;
- onboarding nutritionnel.

### Phase 3 — Card verticale vélo

- formulaire card ;
- sélection des sorties comparables ;
- prédiction heuristique de durée ;
- météo ;
- moteur pendant l’effort ;
- affichage explicable.

Cette phase doit livrer une chaîne complète fonctionnelle avant généralisation.

### Phase 4 — Course puis natation

- predictors dédiés ;
- features spécifiques ;
- contraintes de ravitaillement ;
- tests par sport.

### Phase 5 — Avant et après l’effort

- repas/collation ;
- hydratation préalable ;
- récupération ;
- délai avant prochaine séance.

### Phase 6 — Open Food Facts

- recherche et code-barres ;
- cache ;
- score qualité ;
- allergènes ;
- portions ;
- moteur de sélection de produits.

### Phase 7 — IA conversationnelle

- parsing de l’objectif ;
- clarification ;
- création de l’activité ;
- actions confirmées ;
- explications personnalisées.

### Phase 8 — Nutrition quotidienne et micronutriments

- objectifs variables selon la charge ;
- vitamines et minéraux ;
- limites d’interprétation visibles ;
- recommandations alimentaires générales.

### Phase 9 — Calibration et suivi

- rapprochement prévu/réalisé ;
- confirmation globale ;
- mesure des erreurs ;
- calibration personnelle ;
- dashboard qualité du modèle.

### Phase 10 — Généralisation autres sports

- familles endurance, intermittent, force, ultra-endurance, aquatique et récupération ;
- règles et UX adaptées ;
- nouveaux sports activés seulement après validation.

---

## 19. Critères d’acceptation V1 de la card

La card est prête lorsque :

- les trois sports sont disponibles ;
- distance, D+, date, lieu et objectif sont validés ;
- l’IA transforme l’objectif en structure sans piloter les formules ;
- les activités Strava comparables sont limitées au bon utilisateur ;
- la durée et l’intensité sont accompagnées d’un intervalle empirique et d’un indice de confiance défini ;
- saison et lieu influencent la météo ou les normales climatiques ;
- la différence entre météo prévue et climat estimé est visible ;
- la stratégie pendant l’effort fournit glucides, eau et sodium par heure et au total ;
- une chronologie et une liste de produits sont proposées ;
- les allergènes sont exclus ;
- toutes les hypothèses sont visibles ;
- les coordonnées et données de santé ne sont jamais envoyées au LLM ;
- le plan ne peut être enregistré sans confirmation ;
- les calculs restent disponibles si l’IA est indisponible ;
- un utilisateur de moins de 18 ans ne peut pas recevoir de plan personnalisé ;
- les populations à risque définies sont bloquées ou orientées vers un professionnel ;
- les consentements santé, localisation et IA sont séparés et révocables ;
- chaque recommandation est reproductible depuis son snapshot versionné ;
- un produit aux allergènes inconnus n’est pas proposé à un utilisateur allergique ;
- le mode sans IA permet de saisir le formulaire structuré et de calculer le plan ;
- les endpoints de confirmation sont idempotents ;
- les critères de passage baseline vers modèle personnel sont testés ;
- les tests unitaires, data science, sécurité et E2E passent.

---

## 20. Limites explicites

Atifit ne doit pas prétendre :

- diagnostiquer une carence ;
- remplacer un médecin ou un diététicien ;
- connaître précisément la dépense énergétique ;
- connaître les pertes de sodium sans mesure ;
- connaître la consommation réelle sans confirmation ;
- garantir une prévision météo lointaine ;
- garantir la qualité des données Open Food Facts ;
- attribuer automatiquement une mauvaise performance à la nutrition ;
- recommander des compléments à forte dose sur une simple estimation.

---

## 21. Ordre recommandé de livraison

Le périmètre cible est large, mais le développement doit rester vertical :

1. décider le positionnement réglementaire, réaliser la DPIA et définir les consentements ;
2. corriger les métriques sportives critiques existantes ;
3. versionner le référentiel scientifique ;
4. créer profil et restrictions avec blocage des populations hors périmètre ;
5. livrer la card vélo complète avec baseline, météo et glucides/eau/sodium ;
6. ajouter course puis natation ;
7. ajouter avant/après ;
8. intégrer Open Food Facts avec politique allergènes stricte ;
9. ajouter la création et l’explication IA ;
10. ajouter nutrition quotidienne et micronutriments ;
11. calibrer les prédictions avec les activités réalisées ;
12. étendre aux autres sports.

Ce séquencement conserve la vision complète tout en permettant de tester tôt la valeur principale : **transformer les données de performance personnelles en une stratégie nutritionnelle concrète, explicable et adaptée à l’effort prévu**.
