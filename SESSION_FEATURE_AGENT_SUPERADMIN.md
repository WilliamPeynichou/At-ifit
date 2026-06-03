# SESSION_FEATURE_AGENT_SUPERADMIN

## Contexte de la session

Cette session documente l’implémentation réalisée par l’Agent Swarm autour de deux grands axes :

1. **Réparer et fiabiliser la récupération Strava** pour les utilisateurs.
2. **Donner au super-admin un vrai contrôle CRUD global** sur les données métier, avec diagnostics, actions destructives, logs en lecture seule, audit obligatoire et protection stricte des secrets.

Le plan de référence utilisé comme source de vérité était :

```text
.claakecode/plans/1780486556593-fe5d399a-plan-r-parer-la-r-cup-ration-strava-et-donner-au.md
```

Le commit contenant l’implémentation est :

```text
8c9a2bd Implement Strava sync reliability and super admin CRUD
```

Statistiques du commit :

```text
14 files changed, 1061 insertions(+), 82 deletions(-)
```

Fichiers modifiés ou ajoutés :

```text
client/src/pages/NewUserStrava.jsx
client/src/pages/StravaConnect.jsx
client/src/pages/StravaStats.jsx
client/src/pages/SuperAdmin.jsx
server/migrations/20260305-create-activity.js
server/migrations/20260307-activity-user-strava-unique.js
server/models/Activity.js
server/routes/strava.js
server/routes/superAdmin.js
server/routes/user.js
server/scripts/migrate.js
server/services/stravaSync.js
server/tests/stravaSync.test.js
server/tests/superAdmin.test.js
```

---

# 1. Objectifs fonctionnels couverts

## 1.1 Récupération Strava utilisateur rendue observable

Avant cette session, la récupération Strava pouvait être déclenchée en arrière-plan avec peu de visibilité utilisateur.

Après implémentation, l’utilisateur dispose maintenant d’un état compréhensible de sa synchronisation Strava :

- compte Strava connecté ou non ;
- identifiant athlète Strava disponible côté diagnostic public ;
- synchronisation en cours ou non ;
- statut courant de la tâche ;
- date de dernière synchronisation ;
- date de dernière synchronisation complète ;
- nombre total d’activités locales ;
- nombre d’activités avec détails récupérés ;
- nombre d’activités avec streams récupérés ;
- erreur ou recommandation si un problème bloque la récupération ;
- invitation à reconnecter Strava si les tokens ou autorisations ne sont plus valides.

## 1.2 Mode hybride de synchronisation Strava

Le mode hybride demandé dans le plan a été ajouté :

- si une synchronisation peut être résolue rapidement, l’API peut retourner un bilan directement ;
- si elle est longue, elle démarre en arrière-plan et l’utilisateur peut suivre son état via une route de statut.

Le bilan expose notamment :

- nombre d’activités récupérées ;
- nombre d’activités synchronisées ;
- nombre d’activités créées ;
- nombre d’activités mises à jour ;
- nombre d’activités enrichies ;
- nombre de streams récupérés ;
- statut final ou en cours ;
- erreurs publiques sans secrets.

## 1.3 Synchronisation Strava fiabilisée

La synchronisation a été renforcée pour éviter les cas suivants :

- pagination incomplète ;
- doublons ;
- écrasement d’activité entre deux utilisateurs différents ;
- synchronisation marquée complète alors qu’une page a échoué ;
- erreur Strava silencieuse ;
- token invalide non signalé ;
- enrichissement détail/stream non relançable ;
- absence de streams considérée abusivement comme erreur bloquante.

## 1.4 Diagnostic Strava par utilisateur

Le super-admin peut maintenant consulter un diagnostic Strava par utilisateur.

Ce diagnostic contient :

- état de connexion Strava ;
- identifiant athlète Strava si disponible ;
- statut token public : `not_connected`, `present`, `reconnect_required` ;
- dernière synchronisation ;
- dernière synchronisation complète ;
- compteur d’activités locales ;
- compteur d’activités avec détails ;
- compteur d’activités avec streams ;
- derniers logs d’appels Strava ;
- dernières erreurs Strava ;
- état courant de synchronisation en mémoire ;
- recommandation : attendre, synchroniser, enrichir, reconnecter Strava ou état OK.

Aucun token Strava n’est exposé dans ce diagnostic.

## 1.5 Actions Strava super-admin

Le super-admin dispose maintenant d’actions Strava par utilisateur :

- relancer une synchronisation récente ;
- relancer une synchronisation complète ;
- relancer l’enrichissement des détails ;
- relancer l’enrichissement des streams ;
- réparer les activités incomplètes ;
- réinitialiser l’état local Strava ;
- supprimer les données Strava locales ;
- déconnecter Strava pour un utilisateur ;
- forcer une demande de reconnexion Strava ;
- consulter le statut de tâche.

Ces actions sont auditées.

## 1.6 Actions Strava globales super-admin

Des actions globales prudentes ont été ajoutées :

- synchroniser tous les utilisateurs connectés ;
- synchroniser les utilisateurs en retard ;
- cibler les utilisateurs avec erreurs récentes ;
- enrichir les activités incomplètes ;
- appliquer une limite volontaire de volume.

Le but est de ne pas saturer Strava et de garder un contrôle sur le nombre d’utilisateurs traités.

## 1.7 CRUD global super-admin

Un CRUD global a été ajouté pour les ressources métier importantes :

- utilisateurs ;
- poids ;
- objectifs ;
- activités ;
- streams d’activités.

Le CRUD permet :

- lister avec pagination ;
- filtrer ;
- consulter le détail ;
- créer ;
- modifier ;
- supprimer, sauf cas utilisateur qui passe par une route destructive dédiée ;
- auditer les actions sensibles ;
- sanitiser les réponses.

## 1.8 Actions destructives utilisateur

Le super-admin peut maintenant effectuer des actions dangereuses, mais explicitement séparées et auditées :

- supprimer définitivement un utilisateur ;
- supprimer les données associées d’un utilisateur ;
- supprimer certaines catégories de données ;
- reset Strava local ;
- déconnecter Strava ;
- verrouiller un compte ;
- déverrouiller un compte ;
- modifier un rôle avec garde-fous.

Des protections ont été ajoutées :

- impossibilité de supprimer le dernier super-admin ;
- impossibilité de rétrograder le dernier super-admin ;
- impossibilité pour le super-admin de verrouiller son propre compte ;
- suppression utilisateur via route dédiée, pas via CRUD générique.

## 1.9 Logs en lecture seule

Les logs restent consultables mais non modifiables via les routes super-admin :

- logs d’audit ;
- logs Strava ;
- logs IA ;
- erreurs observables.

Les écrans frontend les indiquent explicitement comme **lecture seule**.

La suppression utilisateur ne purge pas les logs d’audit ou observabilité comme une donnée métier ordinaire. Les logs sont détachés ou conservés selon le cas, afin de préserver la traçabilité.

## 1.10 Protection des secrets

Les éléments suivants restent non exposés :

- `password` ;
- hash de mot de passe ;
- `stravaAccessToken` ;
- `stravaRefreshToken` ;
- tokens JWT ;
- cookies ;
- sessions brutes ;
- clés API ;
- secrets serveur ;
- en-têtes d’autorisation.

Les réponses super-admin passent par `sanitizeForSuperAdmin`.

La route utilisateur `/api/user` a également été sécurisée pour ne plus exposer de tokens Strava et fournir uniquement un statut public `stravaConnected`.

---

# 2. Détails backend Strava

## 2.1 Fichier `server/services/stravaSync.js`

Ce fichier a reçu une grande partie de la fiabilisation Strava.

### 2.1.1 Ajout d’un état observable de synchronisation

Une map mémoire `syncStatuses` a été ajoutée en plus du mutex existant `syncInFlight`.

Objectif : garder un état lisible de la dernière tâche par utilisateur.

Champs suivis :

- `userId` ;
- `taskId` ;
- `status` ;
- `mode` ;
- `startedAt` ;
- `updatedAt` ;
- `finishedAt` ;
- `fetched` ;
- `synced` ;
- `created` ;
- `updated` ;
- `enriched` ;
- `streams` ;
- `errors` ;
- `authRequired` ;
- `inProgress`.

Fonctions ajoutées ou renforcées :

- `setSyncStatus(userId, patch)` ;
- `startSyncStatus(userId, patch)` ;
- `getSyncStatus(userId)`.

`getSyncStatus` expose un état même si aucune tâche n’est connue :

- `idle` si rien n’est en cours ;
- `running` si une promesse est dans `syncInFlight`.

Un TTL est prévu pour nettoyer les statuts anciens non actifs.

### 2.1.2 Erreurs publiques sans secrets

Une fonction de normalisation publique des erreurs a été ajoutée ou renforcée :

- l’erreur retournée ne contient pas de token ;
- les logs contiennent des messages nettoyés ;
- les erreurs Strava d’authentification sont converties en état exploitable.

Exemples de statuts d’erreurs :

- `STRAVA_NOT_CONNECTED` ;
- `STRAVA_AUTH_REQUIRED` ;
- `STRAVA_TOKEN_REVOKED` côté helpers/logs.

### 2.1.3 Pagination complète

La synchronisation complète utilise désormais une boucle `while (true)` avec pagination Strava.

Comportement :

1. récupérer une page avec `per_page` et `page` ;
2. upsert les activités ;
3. incrémenter les compteurs ;
4. mettre à jour le statut observable ;
5. arrêter uniquement quand la page retournée contient moins que `PER_PAGE` activités ;
6. sinon continuer page suivante.

Cela évite de s’arrêter après une seule page.

### 2.1.4 Statuts de synchronisation complète

La synchronisation complète distingue maintenant :

- `completed` : toutes les pages ont été récupérées sans erreur bloquante ;
- `partial` : une partie a été récupérée mais une erreur est survenue ;
- `failed` : aucune donnée utile n’a été récupérée et une erreur bloque ;
- `blocked_auth` : Strava requiert reconnexion/token invalide ;
- `running` : tâche en cours.

### 2.1.5 Ne pas marquer une sync complète comme réussie en cas d’échec partiel

La mise à jour utilisateur distingue maintenant :

- si aucune erreur : mise à jour de `lastSyncAt` et `fullSyncCompletedAt` ;
- si erreur partielle avec données récupérées : mise à jour de `lastSyncAt` seulement ;
- si erreur bloquante sans données : pas de marquage complet.

Cela corrige le cas où une synchronisation interrompue pouvait être considérée comme complète.

### 2.1.6 Upsert isolé par utilisateur

L’upsert d’activité est maintenant basé sur le couple :

```js
{ userId, stravaId }
```

Concrètement :

- recherche via `Activity.findOne({ where: { userId, stravaId: raw.id } })` ;
- mise à jour de l’activité existante si elle appartient au même utilisateur ;
- création sinon ;
- fallback `Activity.upsert(data, { conflictFields: ['userId', 'stravaId'] })` si nécessaire.

Cela empêche qu’une activité Strava d’un utilisateur écrase celle d’un autre utilisateur ayant le même `stravaId`.

### 2.1.7 Compteurs créées/mises à jour

`upsertActivities` retourne maintenant :

```js
{ total, created, updated }
```

Ces compteurs alimentent le statut et le bilan de synchronisation.

### 2.1.8 Enrichissement détails et streams

L’enrichissement existant a été raccordé au statut observable.

Pour chaque activité :

- si les détails manquent ou si `force` est vrai, appel au détail Strava ;
- mise à jour de `detailFetchedAt` ;
- si les streams manquent ou si `force` est vrai, appel aux streams ;
- upsert dans `ActivityStream` ;
- mise à jour de `streamFetchedAt`.

Cas important :

- si Strava retourne une absence de streams, l’activité est tout de même marquée avec `streamFetchedAt` ;
- cela permet de signaler une activité sans streams sans retenter indéfiniment comme si c’était une erreur.

### 2.1.9 Enrichissement en masse

`enrichUserActivities(userId, { maxCount, force })` retourne maintenant un bilan exploitable :

```js
{
  success: true,
  totalDetail,
  totalStream,
  enriched: totalDetail,
  streams: totalStream
}
```

Le statut observable est mis à jour avec :

- `enriched` ;
- `streams`.

### 2.1.10 Synchronisation incrémentale avec recouvrement

`syncSince` a été renforcé pour :

- démarrer un statut `incremental` ;
- appliquer un recouvrement temporel via `overlapDays` ;
- paginer aussi les résultats incrémentaux ;
- éviter les doublons grâce à l’upsert `(userId, stravaId)` ;
- mettre à jour les compteurs ;
- relancer un enrichissement forcé limité sur les activités récentes.

Le recouvrement sert à récupérer les activités modifiées ou arrivées tardivement.

### 2.1.11 Authentification Strava invalide

Si l’utilisateur n’a pas de token ou si `getValidStravaToken(user)` échoue :

- statut `blocked_auth` ;
- `authRequired: true` ;
- erreur publique ;
- recommandation frontend/backend vers reconnexion.

---

# 3. Routes utilisateur Strava

## 3.1 Fichier `server/routes/strava.js`

### 3.1.1 Import du statut de sync

La route importe maintenant :

```js
getSyncStatus
```

depuis `services/stravaSync`.

### 3.1.2 Synchronisation initiale post-connexion

Après connexion Strava, la synchronisation initiale est lancée en arrière-plan :

```js
syncUserActivities(req.userId, { mode: 'full' })
```

Elle est maintenant visible via `/sync/status`.

### 3.1.3 Route `POST /api/strava/resync`

Cette route déclenche une resynchronisation manuelle.

Comportement :

- vérifie que l’utilisateur existe ;
- vérifie qu’un compte Strava est connecté ;
- lance une synchronisation ;
- peut retourner directement le résultat si disponible rapidement ;
- sinon retourne un état `started` avec `inProgress: true` et le statut courant.

Réponse background typique :

```js
{
  status: 'started',
  inProgress: true,
  sync: getSyncStatus(req.userId)
}
```

### 3.1.4 Route `POST /api/strava/sync/enrich`

Nouvelle action utilisateur pour enrichir les activités :

```http
POST /api/strava/sync/enrich
```

Body supporté :

```json
{
  "force": false,
  "maxCount": 500
}
```

Comportement :

- lance `enrichUserActivities` en arrière-plan ;
- retourne `status: started` ;
- l’utilisateur peut suivre l’évolution via `/sync/status`.

### 3.1.5 Route `GET /api/strava/sync/status`

Nouvelle route de statut observable utilisateur :

```http
GET /api/strava/sync/status
```

Elle retourne :

- `connected` ;
- `athleteId` ;
- `lastSyncAt` ;
- `fullSyncCompletedAt` ;
- `total` ;
- `withDetail` ;
- `withStream` ;
- `tokenStatus` ;
- `recommendation` ;
- `sync`.

Recommandations possibles :

- `reconnect_strava` ;
- `wait` ;
- `sync` ;
- `enrich` ;
- `ok`.

`tokenStatus` peut valoir :

- `not_connected` ;
- `present` ;
- `reconnect_required`.

---

# 4. Modèle et migrations Activity

## 4.1 Fichier `server/models/Activity.js`

### 4.1.1 Suppression de l’unicité globale `stravaId`

Avant, `stravaId` était unique globalement.

Problème :

- deux utilisateurs différents ne doivent jamais partager ou écraser leurs activités ;
- une contrainte unique globale sur `stravaId` empêche une isolation stricte multi-utilisateur si un identifiant identique apparaît ou si l’upsert ne scope pas par user.

Changement :

```js
stravaId: {
  type: DataTypes.BIGINT,
  allowNull: false
}
```

Le `unique: true` global a été retiré.

### 4.1.2 Ajout d’index modèle

Ajout d’index Sequelize :

```js
indexes: [
  { unique: true, fields: ['userId', 'stravaId'] },
  { fields: ['userId', 'startDate'] },
  { fields: ['userId', 'type'] },
]
```

Cela garantit :

- unicité d’une activité Strava par utilisateur ;
- meilleure recherche par utilisateur/date ;
- meilleure recherche par utilisateur/type.

## 4.2 Fichier `server/migrations/20260305-create-activity.js`

La migration initiale a été ajustée pour refléter la suppression de l’unicité globale sur `stravaId` et préparer l’unicité composite.

## 4.3 Nouveau fichier `server/migrations/20260307-activity-user-strava-unique.js`

Migration corrective ajoutée.

Objectif : rendre la base existante compatible avec le nouveau modèle.

### 4.3.1 Méthode `up`

La migration :

1. lit les indexes existants de la table `Activities` ;
2. détecte les indexes uniques composés uniquement de `stravaId` ;
3. supprime ces indexes globaux ;
4. relit les indexes ;
5. vérifie si l’index composite existe déjà ;
6. ajoute si besoin :

```js
queryInterface.addIndex('Activities', ['userId', 'stravaId'], {
  unique: true,
  name: 'activities_user_strava_unique',
})
```

La migration est idempotente : elle évite de recréer un index déjà présent.

### 4.3.2 Méthode `down`

La migration supprime l’index composite `activities_user_strava_unique` s’il existe.

## 4.4 Fichier `server/scripts/migrate.js`

Le script de migration a été adapté pour prendre en compte la migration corrective et permettre son exécution dans le flux de migration existant.

---

# 5. Backend super-admin

## 5.1 Fichier `server/routes/superAdmin.js`

Ce fichier concentre les nouvelles capacités super-admin.

Toutes les routes sont protégées par :

```js
router.use(auth, requireSuperAdmin)
```

Donc seuls les utilisateurs authentifiés avec le rôle `super_admin` peuvent y accéder.

## 5.2 Imports et services utilisés

Le fichier utilise notamment :

- `logAuditEvent` pour l’audit ;
- `sanitizeForSuperAdmin` pour nettoyer les réponses ;
- `syncUserActivities` ;
- `syncSince` ;
- `enrichUserActivities` ;
- `getSyncStatus`.

## 5.3 Champs publics utilisateur

Une fonction `userPublicFields()` définit les champs utilisateur sélectionnables côté super-admin.

Elle exclut volontairement :

- `password` ;
- `stravaAccessToken` ;
- `stravaRefreshToken` ;
- secrets techniques.

Elle conserve les informations utiles au diagnostic :

- `id` ;
- `email` ;
- `pseudo` ;
- `role` ;
- profil sportif ;
- `lastSyncAt` ;
- `fullSyncCompletedAt` ;
- `stravaAthleteId` ;
- dates utiles ;
- statut de verrouillage.

## 5.4 Configuration CRUD générique `RESOURCE_CONFIG`

Un objet de configuration définit les ressources administrables.

### 5.4.1 Ressource `users`

CRUD sur utilisateurs avec :

- recherche ;
- filtre rôle ;
- filtre statut Strava ;
- champs modifiables contrôlés ;
- champs requis à la création : `email`, `password` ;
- validation de rôle si fourni.

Les secrets ne sont pas sélectionnés dans les retours.

### 5.4.2 Ressource `weights`

CRUD sur poids avec :

- filtre `userId` ;
- filtre date ;
- champs modifiables : `userId`, `weight`, `date` ;
- requis : `userId`, `weight`.

### 5.4.3 Ressource `goals`

CRUD sur objectifs avec :

- filtre `userId` ;
- filtre type ;
- filtre sport ;
- filtre actif ;
- champs modifiables : `userId`, `type`, `sportType`, `targetValue`, `period`, `active` ;
- requis : `userId`, `type`, `targetValue`, `period`.

### 5.4.4 Ressource `activities`

CRUD sur activités sportives avec :

- filtre `userId` ;
- filtre sport/type ;
- filtre période ;
- filtre enrichissement ;
- recherche par `stravaId` ;
- exclusion du champ `raw` dans les listes ;
- champs Strava/métier contrôlés modifiables ;
- requis : `userId`, `stravaId`, `type`, `startDate`.

### 5.4.5 Ressource `activity-streams`

CRUD sur streams d’activités avec :

- filtre `activityId` ;
- filtre `stravaId` ;
- filtre indirect par `userId` via include Activity ;
- champs streams modifiables : `time`, `distance`, `heartrate`, `watts`, `cadence`, `velocitySmooth`, `altitude`, `latlng`, `gradeSmooth`, `temp`, `moving`, `resolution`, `fetchedAt` ;
- requis : `activityId`, `stravaId`.

## 5.5 Helpers de sécurité CRUD

### 5.5.1 `pickAllowed`

Permet de ne garder que les champs autorisés pour chaque ressource.

Cela évite qu’un super-admin ou un payload mal formé modifie un champ non prévu comme :

- token ;
- secret ;
- champ système non autorisé.

### 5.5.2 `requireFields`

Vérifie les champs obligatoires à la création.

### 5.5.3 `assertCanChangeRole`

Protège les changements de rôle.

Garde-fous :

- rôle cible valide ;
- pas de suppression/rétrogradation du dernier super-admin ;
- pas de situation où la plateforme se retrouve sans super-admin.

### 5.5.4 `auditSuperAdmin`

Wrapper autour de `logAuditEvent` pour journaliser les actions sensibles.

Champs utilisés :

- `userId` cible ;
- `actorUserId` depuis `req.userId` ;
- `eventType` ;
- `riskLevel` ;
- `category` ;
- `message` ;
- `metadata` ;
- `status`.

Les métadonnées sont sanitizées par les services existants.

## 5.6 Routes CRUD génériques

### 5.6.1 `GET /api/super-admin/resources/:resource`

Liste paginée d’une ressource.

Retour :

- `resource` ;
- `rows` ;
- `count` ;
- `page` ;
- `limit` ;
- `totalPages`.

Réponse sanitizée.

### 5.6.2 `GET /api/super-admin/resources/:resource/:id`

Consultation détaillée d’une ressource.

Action auditée avec :

```text
super_admin_resource_detail
```

Risque : `medium`.

### 5.6.3 `POST /api/super-admin/resources/:resource`

Création d’une ressource.

Étapes :

1. vérifier que la ressource est supportée ;
2. filtrer le payload avec `pickAllowed` ;
3. vérifier les champs requis ;
4. valider le rôle si création utilisateur avec rôle ;
5. créer ;
6. auditer avec `super_admin_resource_create` ;
7. retourner la ressource sanitizée.

Risque :

- `high` pour création utilisateur ;
- `medium` pour autres ressources.

### 5.6.4 `PATCH /api/super-admin/resources/:resource/:id`

Modification d’une ressource.

Étapes :

1. charger la ressource ;
2. filtrer le payload ;
3. si rôle utilisateur modifié, appliquer `assertCanChangeRole` ;
4. prendre un snapshot sanitizé avant changement ;
5. mettre à jour ;
6. auditer ;
7. retourner la ressource à jour sanitizée.

Event audit :

- `role_change` si rôle modifié ;
- sinon `super_admin_resource_update`.

Risque :

- `high` si utilisateur ou rôle ;
- `medium` sinon.

### 5.6.5 `DELETE /api/super-admin/resources/:resource/:id`

Suppression d’une ressource non-utilisateur.

Important :

- suppression d’utilisateur refusée sur cette route ;
- il faut utiliser la route destructive dédiée `DELETE /users/:id`.

Event audit :

```text
super_admin_resource_delete
```

Risque : `critical`.

## 5.7 Routes utilisateur super-admin existantes renforcées

### 5.7.1 `GET /api/super-admin/users/:id`

La fiche utilisateur détaillée retourne :

- utilisateur public ;
- poids récents ;
- objectifs ;
- dernières activités ;
- derniers audits ;
- logs Strava ;
- logs IA ;
- résumé de compteurs.

Action auditée :

```text
super_admin_user_detail
```

### 5.7.2 `GET /api/super-admin/users/:id/activities`

Liste des activités d’un utilisateur avec :

- filtres ;
- enrichissement ;
- streams associés ;
- exclusion du champ `raw`.

## 5.8 Logs super-admin en lecture seule

Routes de consultation :

- `/audit-logs` ;
- `/strava-logs` ;
- `/ai-logs` ;
- `/usage` ;
- erreurs via logs filtrés.

Aucune route de modification standard des logs n’a été ajoutée.

## 5.9 Changement de rôle

Route :

```http
PATCH /api/super-admin/users/:id/role
```

Elle :

- valide le rôle ;
- empêche de casser le dernier super-admin ;
- audite avec `role_change` ;
- retourne l’utilisateur sanitizé.

## 5.10 Diagnostic fonctionnel existant

Route :

```http
POST /api/super-admin/diagnostics/:id
```

Elle retourne des compteurs de santé :

- connexion Strava ;
- nombre d’activités ;
- erreurs Strava ;
- erreurs IA ;
- échecs audit.

Action auditée :

```text
diagnostic_run
```

---

# 6. Actions destructives super-admin

## 6.1 Suppression sélective des données utilisateur

Route :

```http
DELETE /api/super-admin/users/:id/data
```

Elle permet de supprimer des catégories de données associées à l’utilisateur.

Les catégories invalides sont refusées.

L’action est faite dans une transaction Sequelize.

Event audit :

```text
user_data_delete
```

Risque : `critical`.

Retour :

- `success` ;
- `userId` ;
- bilan des suppressions.

## 6.2 Suppression définitive utilisateur

Route :

```http
DELETE /api/super-admin/users/:id
```

Protections :

- refuse de supprimer le dernier super-admin ;
- prend un snapshot sanitizé de l’utilisateur ;
- supprime les données associées dans une transaction ;
- conserve/détache les logs nécessaires à la traçabilité ;
- supprime l’utilisateur ;
- audite en critique.

Event audit :

```text
user_delete
```

Risque : `critical`.

## 6.3 Verrouillage / déverrouillage compte

Route :

```http
PATCH /api/super-admin/users/:id/lock
```

Comportement :

- `locked !== false` verrouille ;
- `locked === false` déverrouille ;
- verrouillage par défaut pour environ 365 jours si aucune date fournie ;
- reset des tentatives échouées au déverrouillage ;
- interdit au super-admin de verrouiller son propre compte.

Events audit :

- `user_lock` ;
- `user_unlock`.

Risque : `high`.

---

# 7. Actions Strava super-admin par utilisateur

## 7.1 Déconnexion Strava utilisateur

Route :

```http
POST /api/super-admin/users/:id/strava/disconnect
```

Effet :

- supprime `stravaAccessToken` ;
- supprime `stravaRefreshToken` ;
- supprime `stravaExpiresAt` ;
- supprime `stravaAthleteId`.

Event audit :

```text
strava_disconnect_for_user
```

Risque : `high`.

## 7.2 Reset local Strava

Route :

```http
POST /api/super-admin/users/:id/strava/reset
```

Effet :

- supprime les streams liés aux activités Strava locales ;
- supprime les activités locales de l’utilisateur ;
- remet `lastSyncAt` à `null` ;
- remet `fullSyncCompletedAt` à `null`.

Event audit :

```text
strava_local_reset
```

Risque : `critical`.

## 7.3 Demande de reconnexion Strava

Route :

```http
POST /api/super-admin/users/:id/strava/reconnect-required
```

Effet :

- supprime les tokens Strava ;
- conserve l’utilisateur ;
- retourne une recommandation `reconnect_strava`.

Event audit :

```text
strava_reconnect_required
```

Risque : `high`.

## 7.4 Diagnostic Strava complet utilisateur

Route :

```http
GET /api/super-admin/users/:id/strava/diagnostic
```

Retour :

- `user` sanitizé ;
- `connection` ;
- `sync` ;
- compteurs d’activités ;
- derniers logs ;
- dernières erreurs ;
- `recommendation`.

Détection token :

- si aucun athlète : `not_connected` ;
- si statut auth requis ou erreur 401 récente : `reconnect_required` ;
- sinon : `present`.

Event audit :

```text
strava_diagnostic_access
```

Risque : `medium`.

## 7.5 Statut tâche Strava

Route :

```http
GET /api/super-admin/users/:id/strava/status
```

Retour :

- `userId` ;
- `sync: getSyncStatus(userId)`.

## 7.6 Actions Strava utilisateur génériques

Route :

```http
POST /api/super-admin/users/:id/strava/actions/:action
```

Actions supportées selon l’implémentation :

- sync récente ;
- sync complète ;
- enrichissement détails ;
- enrichissement streams ;
- réparation incomplètes ;
- reset état sync ;
- suppression données Strava locales ;
- reconnexion demandée.

Chaque action retourne un résultat sanitizé.

Event audit :

```text
strava_super_admin_action
```

Risque : `high`.

---

# 8. Actions Strava globales super-admin

## 8.1 Route globale

Route :

```http
POST /api/super-admin/strava/actions/:action
```

Actions prévues :

- synchroniser tous les utilisateurs connectés ;
- synchroniser les utilisateurs en retard ;
- synchroniser les utilisateurs avec erreurs ;
- enrichir les activités incomplètes.

La route applique une limite volontaire de volume.

Event audit :

```text
strava_global_action
```

Risque : `high`.

Retour :

- `action` ;
- `limit` ;
- `processedUsers` ;
- `results` utilisateur par utilisateur.

---

# 9. Route utilisateur sécurisée

## 9.1 Fichier `server/routes/user.js`

La route utilisateur a été renforcée pour éviter l’exposition accidentelle de secrets.

Changements :

- exclusion de `password` ;
- exclusion de `stravaAccessToken` ;
- exclusion de `stravaRefreshToken` ;
- exclusion de `stravaApiKey` si présent ;
- sanitization de la réponse ;
- exposition uniquement d’un statut public `stravaConnected`.

Impact frontend : les écrans ne doivent plus déduire la connexion Strava depuis la présence d’un token.

---

# 10. Frontend utilisateur Strava

## 10.1 Fichier `client/src/pages/StravaStats.jsx`

La page statistiques Strava utilisateur a été enrichie avec un panneau de suivi de synchronisation.

### 10.1.1 Nouveaux états React

Ajout notamment de :

- `resyncing` ;
- `resyncMessage` ;
- `syncStatus` ;
- `syncLoading` ;
- `enriching`.

### 10.1.2 Chargement du statut

La page appelle :

```http
GET /strava/sync/status
```

Le statut est stocké dans `syncStatus`.

En cas d’erreur 400/401, l’UI force un état indiquant que Strava doit être reconnecté.

### 10.1.3 Relance manuelle

Action utilisateur :

```http
POST /strava/resync
```

Comportement UI :

- bouton désactivé pendant la relance ;
- message immédiat si synchronisation terminée ;
- message background si synchronisation lancée en arrière-plan ;
- actualisation du statut après déclenchement.

Message de succès immédiat :

```text
Synchronisation terminée : X nouvelle(s) activité(s), Y enrichie(s).
```

Message background :

```text
Synchronisation lancée en arrière-plan. Le statut se mettra à jour automatiquement.
```

### 10.1.4 Enrichissement manuel détails/streams

Action utilisateur :

```http
POST /strava/sync/enrich
```

Body :

```json
{
  "force": false,
  "maxCount": 500
}
```

L’UI affiche que l’enrichissement est lancé en arrière-plan.

### 10.1.5 Affichage des compteurs

Le panneau affiche :

- statut ;
- nombre total d’activités ;
- nombre avec détails ;
- nombre avec streams ;
- dernière sync ;
- erreur ou recommandation.

### 10.1.6 Cas reconnexion Strava

Si `authRequired`, `tokenStatus` ou la recommandation indiquent une reconnexion, l’UI affiche un message explicite :

```text
Reconnectez Strava pour restaurer la récupération.
```

---

# 11. Frontend connexion Strava

## 11.1 Fichier `client/src/pages/StravaConnect.jsx`

L’écran ne se base plus sur la présence d’un token pour savoir si Strava est connecté.

Il utilise maintenant :

- `stravaConnected` ;
- `stravaAthleteId`.

Objectif : ne jamais manipuler ni exposer les tokens Strava côté frontend.

## 11.2 Fichier `client/src/pages/NewUserStrava.jsx`

Même correction :

- utilisation du statut public `stravaConnected` ;
- utilisation éventuelle de `stravaAthleteId` ;
- plus de logique basée sur `stravaAccessToken` ou `stravaRefreshToken`.

---

# 12. Frontend super-admin

## 12.1 Fichier `client/src/pages/SuperAdmin.jsx`

La page a été transformée d’une page de supervision vers un panneau d’administration global.

## 12.2 Titre et promesse de sécurité

La page annonce explicitement :

```text
Panneau d’administration global
```

Avec le sous-texte :

```text
CRUD global, diagnostic Strava, actions destructives auditées et logs strictement en lecture seule. Aucun secret technique n’est exposé.
```

## 12.3 Onglets principaux

Les onglets incluent :

- vue d’ensemble ;
- utilisateurs ;
- détail utilisateur ;
- actions Strava ;
- CRUD global ;
- logs Strava ;
- logs IA ;
- audit ;
- erreurs.

## 12.4 Redaction défensive côté UI

L’interface applique une redaction défensive pour éviter d’afficher :

- tokens ;
- passwords ;
- sessions ;
- cookies ;
- secrets ;
- clés API.

Cela ne remplace pas la sécurité backend mais ajoute une protection d’affichage.

## 12.5 Diagnostic Strava utilisateur

Composant :

```js
StravaDiagnosticPanel
```

Il charge :

```http
GET /super-admin/users/:id/strava/diagnostic
```

Avec fallback vers :

```http
POST /super-admin/diagnostics/:id
```

Il affiche :

- connexion ;
- athlète ;
- nombre d’activités ;
- nombre avec détails ;
- nombre avec streams ;
- dernière sync ;
- erreurs Strava ;
- recommandation.

## 12.6 Actions Strava utilisateur dans l’UI

Boutons disponibles :

- `sync-recent` : sync récente ;
- `sync-full` : sync complète ;
- `enrich-details` : détails ;
- `enrich-streams` : streams ;
- `repair-incomplete` : réparer incomplètes ;
- `request-reconnect` : demander reconnexion.

Actions dangereuses séparées :

- réinitialiser sync ;
- supprimer données Strava.

Les actions dangereuses demandent une confirmation navigateur.

## 12.7 Actions destructives utilisateur

Composant dédié avec titre :

```text
Actions destructives utilisateur
```

Sous-titre :

```text
Zone dangereuse : suppressions et réinitialisations définitives, toujours auditables
```

Actions affichées :

- supprimer utilisateur ;
- supprimer données associées ;
- reset Strava local ;
- déconnecter Strava ;
- verrouiller ;
- déverrouiller.

Les actions de suppression et reset utilisent des confirmations.

## 12.8 Actions globales Strava

Composant :

```js
GlobalStravaActions
```

Actions affichées :

- synchroniser connectés ;
- synchroniser en retard ;
- enrichir incomplètes ;
- cibler erreurs.

Un champ `limit` est présent pour limiter volontairement le volume.

Sous-titre :

```text
Actions prudentes avec limite volontaire pour respecter Strava
```

## 12.9 CRUD global frontend

Composant :

```js
ResourceCrud
```

Ressources configurées :

- utilisateurs ;
- poids ;
- objectifs ;
- activités ;
- streams.

Pour chaque ressource :

- liste ;
- création ;
- édition ;
- suppression ;
- pagination ;
- champs configurés ;
- messages d’erreur si refus backend.

Le panneau rappelle :

```text
Les secrets restent masqués côté interface et serveur.
```

## 12.10 Logs lecture seule

Les sections logs sont titrées explicitement :

- `Logs Strava — lecture seule` ;
- `Logs IA — lecture seule` ;
- `Audit — lecture seule` ;
- `Erreurs — lecture seule`.

Aucun formulaire d’édition des logs n’est exposé.

---

# 13. Tests ajoutés ou renforcés

## 13.1 Fichier `server/tests/stravaSync.test.js`

Les tests Strava ont été renforcés pour couvrir les objectifs critiques.

Scénarios couverts :

- pagination complète ;
- récupération incrémentale ;
- recouvrement temporel ;
- absence de doublons ;
- isolation stricte entre utilisateurs ;
- pas d’écrasement cross-user ;
- gestion des tokens invalides ;
- état `blocked_auth` ;
- état `partial` ;
- état `failed` ;
- état `completed` ;
- non mise à jour de `fullSyncCompletedAt` après échec partiel ;
- enrichissement détails ;
- enrichissement streams ;
- absence de streams traitée proprement ;
- compteurs de synchronisation.

## 13.2 Fichier `server/tests/superAdmin.test.js`

Les tests super-admin ont été renforcés.

Scénarios couverts ou vérifiés :

- routes super-admin protégées par `requireSuperAdmin` ;
- présence des routes principales ;
- pagination et filtres ;
- absence de sélection directe de secrets ;
- utilisation de `sanitizeForSuperAdmin` ;
- route `/api/user` sanitizée ;
- pas de `sendSuccess(res, user)` brut ;
- audit/logs sans secrets ;
- frontend super-admin présent et protégé ;
- page super-admin sans références à tokens/secrets interdits.

## 13.3 Test sécurité `/api/user`

Un test anti-régression vérifie que `/api/user` :

- sanitise les tokens Strava ;
- expose seulement un statut de connexion ;
- n’envoie pas l’utilisateur brut.

## 13.4 Validation annoncée par les agents

Commandes exécutées par les agents :

```bash
cd server
npm test -- --runTestsByPath tests/superAdmin.test.js
```

Résultat annoncé :

```text
10/10 tests ciblés super-admin passés
```

Autre validation backend :

```bash
npm test -- stravaSync.test.js superAdmin.test.js
```

Résultat annoncé :

```text
16 tests passés
```

Validation QA/Security :

```bash
npm test -- --runTestsByPath tests/superAdmin.test.js tests/stravaSync.test.js tests/sensitiveData.test.js
```

Résultat annoncé :

```text
3 suites passed
21 tests passed
```

Validation frontend :

```bash
npm --prefix client run build
```

Résultat annoncé :

```text
build réussi
```

Warnings non bloquants :

- browserslist/caniuse obsolète ;
- bundle supérieur à 500 kB.

---

# 14. Sécurité et confidentialité

## 14.1 Secrets non exposés côté backend

Les routes super-admin utilisent des sélections contrôlées et la sanitation.

Interdits dans les réponses :

- `password` ;
- `stravaAccessToken` ;
- `stravaRefreshToken` ;
- `refreshToken` ;
- `Authorization` ;
- `apiKey` ;
- `secret` ;
- tokens bruts.

## 14.2 Secrets non exposés côté frontend

Le frontend :

- n’utilise plus les tokens pour déterminer la connexion Strava ;
- utilise `stravaConnected` et `stravaAthleteId` ;
- applique une redaction défensive dans l’admin ;
- n’affiche pas les champs sensibles dans le panneau.

## 14.3 Audit obligatoire

Actions auditées :

- consultation détail utilisateur ;
- diagnostic ;
- consultation détail ressource ;
- création ressource ;
- modification ressource ;
- suppression ressource ;
- changement de rôle ;
- suppression données utilisateur ;
- suppression utilisateur ;
- verrouillage ;
- déverrouillage ;
- déconnexion Strava ;
- reset Strava local ;
- demande reconnexion Strava ;
- diagnostic Strava ;
- actions Strava utilisateur ;
- actions Strava globales.

Niveaux de risque utilisés :

- `medium` pour consultation détaillée/diagnostic ;
- `high` pour changement rôle, lock/unlock, actions Strava sensibles ;
- `critical` pour suppressions et resets destructifs.

## 14.4 Logs en lecture seule

Les logs sont consultables et filtrables mais pas modifiés via CRUD métier.

Les routes logs restent en `GET`.

Les suppressions destructives utilisateur ne traitent pas les logs comme des données métier ordinaires supprimables sans trace.

---

# 15. Points importants pour vérification manuelle

## 15.1 Vérifier les migrations

À vérifier en environnement de staging/dev :

1. l’ancienne contrainte unique globale sur `Activities.stravaId` est bien retirée ;
2. l’index composite `activities_user_strava_unique` existe ;
3. il porte bien sur `userId,stravaId` ;
4. aucune activité dupliquée par utilisateur ne viole la contrainte avant migration.

Commande indicative selon setup :

```bash
cd server
npm run migrate
```

ou le mécanisme de migration propre au projet.

## 15.2 Vérifier une synchronisation utilisateur

Parcours :

1. connecter Strava ;
2. ouvrir la page stats Strava ;
3. vérifier le panneau statut ;
4. lancer une resynchronisation ;
5. vérifier que le statut passe en cours ou retourne un bilan ;
6. vérifier les compteurs ;
7. lancer enrichissement détails/streams ;
8. vérifier `withDetail` et `withStream`.

## 15.3 Vérifier un token invalide

Simuler ou utiliser un utilisateur avec token Strava invalide.

Résultat attendu :

- statut `blocked_auth` ou `reconnect_required` ;
- `authRequired: true` ;
- recommandation `reconnect_strava` ;
- aucun token visible.

## 15.4 Vérifier isolation multi-utilisateur

Créer ou simuler deux utilisateurs avec activités Strava.

Résultat attendu :

- l’activité est unique par `(userId, stravaId)` ;
- une synchronisation utilisateur A ne modifie pas les activités de B ;
- les listes admin filtrées par utilisateur restent isolées.

## 15.5 Vérifier super-admin

Parcours :

1. se connecter avec un compte `super_admin` ;
2. ouvrir `/super-admin` ;
3. vérifier dashboard ;
4. sélectionner un utilisateur ;
5. consulter fiche ;
6. consulter diagnostic Strava ;
7. lancer une action Strava ;
8. vérifier l’audit ;
9. tester CRUD global sur une donnée non critique ;
10. vérifier que les logs sont lecture seule.

## 15.6 Vérifier actions destructives

À faire uniquement en environnement de test/staging.

Tester :

- verrouiller utilisateur ;
- déverrouiller utilisateur ;
- supprimer données associées ;
- reset Strava local ;
- supprimer utilisateur test.

Résultat attendu :

- confirmation UI pour actions dangereuses ;
- audit créé ;
- secrets absents des métadonnées ;
- dernier super-admin protégé.

## 15.7 Vérifier non-super-admin

Avec un compte normal :

- accès `/super-admin` refusé côté frontend ;
- appels API `/api/super-admin/*` refusés côté backend ;
- aucune action admin possible.

---

# 16. Limites et points de vigilance

## 16.1 Statut de tâche en mémoire

Le statut `syncStatuses` est stocké en mémoire process.

Conséquence :

- il est adapté pour l’observabilité immédiate ;
- il peut être perdu au redémarrage serveur ;
- pour une production distribuée/multi-instance, un stockage persistant ou partagé serait préférable.

## 16.2 Actions longues

Les syncs et enrichissements peuvent encore être lancés en arrière-plan via promesses.

Pour de très gros volumes, un vrai système de queue/job worker serait plus robuste.

Le plan demandait une prudence vis-à-vis des limites Strava : une limite volontaire a été ajoutée aux actions globales, mais une queue dédiée permettrait un contrôle encore plus fin.

## 16.3 CRUD frontend générique

Le CRUD frontend est générique et fonctionnel mais doit être vérifié UX par ressource :

- types de champs ;
- format dates ;
- IDs ;
- validation métier ;
- messages d’erreur.

Le backend reste le garde-fou principal.

## 16.4 Suppression définitive

Les suppressions destructives sont implémentées et auditées.

Elles doivent être testées uniquement sur données non sensibles ou staging avant usage production.

---

# 17. Résumé très court de ce qui a été fait

- Synchronisation Strava rendue fiable, paginée, observable et auditable.
- Ajout du mode hybride utilisateur : résultat immédiat ou tâche background suivable.
- Ajout du statut utilisateur `/strava/sync/status`.
- Ajout de l’enrichissement manuel `/strava/sync/enrich`.
- Isolation des activités par `(userId, stravaId)`.
- Migration corrective pour supprimer l’unicité globale `stravaId`.
- Ajout diagnostics Strava super-admin.
- Ajout actions Strava utilisateur et globales super-admin.
- Ajout CRUD global super-admin sur ressources métier.
- Ajout actions destructives utilisateur avec garde-fous.
- Logs maintenus en lecture seule.
- Audit systématique des actions sensibles.
- Redaction stricte des secrets.
- Correction `/api/user` pour ne pas exposer les tokens.
- Mise à jour UI utilisateur Strava.
- Transformation UI super-admin en panneau global.
- Tests backend/sécurité/frontend ciblés renforcés.

---

# 18. Référence commit

```text
Commit: 8c9a2bd5139e9215d9bbe7080caba76f6b98e802
Message: Implement Strava sync reliability and super admin CRUD
Branche: main
Remote: origin/main
```
