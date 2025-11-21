# Documentation des Endpoints Strava API

## Vue d'ensemble

Le système utilise **OAuth 2.0** pour que chaque utilisateur se connecte avec son propre compte Strava. Chaque utilisateur a ses propres tokens (`stravaAccessToken`, `stravaRefreshToken`, `stravaExpiresAt`) stockés dans la base de données.

**Important** : Les tokens du `.env` (`ACCES_JETON`, `REFRESH_JETON`) ne sont utilisés que par le script utilitaire `update_tokens.js` pour des mises à jour manuelles. Le système principal utilise toujours les tokens OAuth de chaque utilisateur.

## Endpoints disponibles

### 1. Authentification

#### `GET /api/strava/auth`
Génère l'URL OAuth pour rediriger l'utilisateur vers Strava.
- **Auth** : Requis (JWT)
- **Response** : `{ url: "https://www.strava.com/oauth/authorize?..." }`

#### `POST /api/strava/connect`
Échange le code d'autorisation contre des tokens d'accès.
- **Auth** : Requis (JWT)
- **Body** : `{ code: "authorization_code" }`
- **Response** : `{ athlete: {...} }`

#### `DELETE /api/strava/disconnect`
Déconnecte le compte Strava de l'utilisateur.
- **Auth** : Requis (JWT)
- **Response** : Message de succès

### 2. Données Athlète

#### `GET /api/strava/athlete`
Récupère le profil complet de l'athlète authentifié.
- **Auth** : Requis (JWT + Strava connecté)
- **Response** : Objet `DetailedAthlete` avec toutes les informations du profil

#### `GET /api/strava/athlete/stats`
Récupère les statistiques de l'athlète (totaux, records, etc.).
- **Auth** : Requis (JWT + Strava connecté)
- **Response** : Objet avec statistiques détaillées

#### `GET /api/strava/athlete/zones`
Récupère les zones d'entraînement de l'athlète (fréquence cardiaque, puissance).
- **Auth** : Requis (JWT + Strava connecté)
- **Response** : Objet avec zones d'entraînement

#### `GET /api/strava/athlete/clubs`
Récupère la liste des clubs de l'athlète.
- **Auth** : Requis (JWT + Strava connecté)
- **Response** : Tableau de clubs

### 3. Activités

#### `GET /api/strava/activities`
Récupère la liste des activités de l'athlète.
- **Auth** : Requis (JWT + Strava connecté)
- **Query params** : `before`, `after`, `per_page` (max 200)
- **Response** : Tableau d'activités

#### `GET /api/strava/activities/:id`
Récupère les détails d'une activité spécifique.
- **Auth** : Requis (JWT + Strava connecté)
- **Params** : `id` (ID de l'activité)
- **Response** : Objet `DetailedActivity`

#### `GET /api/strava/activities/:id/streams`
Récupère les streams d'une activité (GPS, altitude, fréquence cardiaque, puissance, etc.).
- **Auth** : Requis (JWT + Strava connecté)
- **Params** : `id` (ID de l'activité)
- **Query params** : `types` (comma-separated: `time,distance,latlng,altitude,heartrate,power,cadence,watts,temp,moving,grade_smooth`)
- **Response** : Tableau de streams

### 4. Routes

#### `GET /api/strava/routes`
Récupère les routes de l'athlète.
- **Auth** : Requis (JWT + Strava connecté)
- **Query params** : `page`, `per_page`
- **Response** : Tableau de routes

### 5. Équipement

#### `GET /api/strava/gear`
Récupère l'équipement de l'athlète (vélos et chaussures).
- **Auth** : Requis (JWT + Strava connecté)
- **Response** : `{ bikes: [...], shoes: [...] }`

### 6. Segments

#### `GET /api/strava/segments/starred`
Récupère les segments favoris de l'athlète.
- **Auth** : Requis (JWT + Strava connecté)
- **Query params** : `page`, `per_page`
- **Response** : Tableau de segments

### 7. Endpoint récapitulatif

#### `GET /api/strava/all`
Récupère toutes les données disponibles en un seul appel.
- **Auth** : Requis (JWT + Strava connecté)
- **Response** : Objet contenant :
  - `athlete` : Profil complet
  - `stats` : Statistiques
  - `activities` : 10 dernières activités
  - `clubs` : Clubs
  - `gear` : Équipement
  - `routes` : 10 dernières routes
  - `segments` : 10 segments favoris

## Gestion automatique des tokens

Le système gère automatiquement :
- ✅ **Rafraîchissement des tokens** : Les tokens expirés sont automatiquement rafraîchis
- ✅ **Association utilisateur** : Chaque utilisateur utilise ses propres tokens Strava
- ✅ **Sécurité** : Les tokens sont stockés de manière sécurisée dans la base de données

## Scopes OAuth utilisés

- `read` : Lecture des données de base
- `activity:read_all` : Lecture de toutes les activités (même privées)
- `profile:read_all` : Lecture du profil complet

## Exemple d'utilisation

```javascript
// Frontend - Récupérer toutes les données
const response = await api.get('/strava/all');
const { athlete, stats, activities, clubs, gear } = response.data;

// Récupérer une activité spécifique avec ses streams
const activity = await api.get(`/strava/activities/${activityId}`);
const streams = await api.get(`/strava/activities/${activityId}/streams?types=time,distance,latlng,altitude,heartrate,power`);
```

## Notes importantes

1. **Chaque utilisateur a ses propres tokens** : Le système utilise les tokens OAuth stockés dans la base de données pour chaque utilisateur, pas ceux du `.env`.

2. **Les tokens sont automatiquement rafraîchis** : Si un token expire, le système le rafraîchit automatiquement en utilisant le refresh token.

3. **Gestion des erreurs** : Tous les endpoints retournent des erreurs appropriées si :
   - L'utilisateur n'est pas connecté à Strava
   - Le token est invalide ou expiré
   - L'API Strava retourne une erreur

4. **Rate Limits** : Strava limite les requêtes à 100 requêtes toutes les 15 minutes et 1000 requêtes par jour. Le système gère ces limites automatiquement.

