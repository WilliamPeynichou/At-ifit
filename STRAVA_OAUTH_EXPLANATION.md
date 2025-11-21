# Comment fonctionne l'API Strava OAuth

## Principe de base

Votre application Strava (avec `CLIENT_ID` et `CLIENT_SECRET`) fonctionne comme une **application tierce** qui peut être utilisée par **n'importe quel utilisateur Strava**.

## Comment ça marche

### 1. Application Strava unique
- Vous créez **une seule application** sur https://www.strava.com/settings/api
- Cette application a un `CLIENT_ID` et un `CLIENT_SECRET` uniques
- Ces identifiants sont utilisés pour **tous les utilisateurs** qui veulent se connecter

### 2. Autorisation individuelle
- Quand un utilisateur clique sur "CONNECT WITH STRAVA" :
  1. Il est redirigé vers Strava
  2. Il se connecte avec **son propre compte Strava** (email/mot de passe)
  3. Il autorise **votre application** à accéder à **ses données**
  4. Strava génère des tokens **uniques pour cet utilisateur**

### 3. Tokens individuels
- Chaque utilisateur reçoit ses propres tokens :
  - `stravaAccessToken` - unique pour chaque utilisateur
  - `stravaRefreshToken` - unique pour chaque utilisateur
  - `stravaExpiresAt` - date d'expiration

### 4. Accès aux données
- Chaque utilisateur voit **uniquement ses propres données** :
  - Ses propres activités
  - Ses propres statistiques
  - Ses propres clubs
  - Ses propres routes
  - etc.

## Exemple concret

### Scénario
- Vous avez créé une application Strava avec `CLIENT_ID=186182`
- Alice veut utiliser votre application
- Bob veut aussi utiliser votre application

### Processus pour Alice
1. Alice clique sur "CONNECT WITH STRAVA"
2. Elle se connecte avec **son compte Strava** (alice@example.com)
3. Elle autorise votre application
4. Votre application reçoit des tokens **pour le compte d'Alice**
5. Alice voit **ses propres activités** dans votre application

### Processus pour Bob
1. Bob clique sur "CONNECT WITH STRAVA"
2. Il se connecte avec **son compte Strava** (bob@example.com)
3. Il autorise votre application
4. Votre application reçoit des tokens **pour le compte de Bob**
5. Bob voit **ses propres activités** dans votre application

## Sécurité et isolation

✅ **Chaque utilisateur est isolé** :
- Alice ne peut pas voir les données de Bob
- Bob ne peut pas voir les données d'Alice
- Chaque utilisateur utilise ses propres tokens

✅ **Votre application est universelle** :
- Une seule application Strava
- Utilisable par n'importe quel utilisateur Strava
- Chaque utilisateur autorise individuellement l'accès

## Ce que votre application peut faire

Avec les scopes que vous avez configurés (`read`, `activity:read_all`, `profile:read_all`), votre application peut :

- ✅ Lire les activités de chaque utilisateur (seulement celles qu'ils autorisent)
- ✅ Lire le profil de chaque utilisateur
- ✅ Lire les statistiques de chaque utilisateur
- ✅ Lire les clubs de chaque utilisateur
- ✅ Lire les routes de chaque utilisateur

**Mais uniquement pour les utilisateurs qui se sont connectés et ont autorisé votre application.**

## Limites

- ❌ Votre application **ne peut pas** voir les données d'utilisateurs qui ne se sont pas connectés
- ❌ Votre application **ne peut pas** voir les données d'autres utilisateurs sans leur autorisation
- ❌ Votre application **ne peut pas** modifier les données sans scope `write`

## Résumé

**Votre API Strava permet à n'importe quel compte Strava de se connecter**, mais chaque utilisateur :
- Se connecte avec son propre compte
- Autorise individuellement votre application
- Voit uniquement ses propres données
- Utilise ses propres tokens

C'est exactement comme quand vous vous connectez à une application avec Google ou Facebook - l'application peut être utilisée par n'importe qui, mais chacun voit ses propres données.

