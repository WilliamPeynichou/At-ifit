# Connexion Strava - OAuth uniquement

## Changements effectués

Le système utilise maintenant **uniquement OAuth 2.0** pour la connexion Strava. Les identifiants statiques du `.env` ne sont plus utilisés.

### ✅ Supprimé
- Script `server/scripts/update_tokens.js` qui utilisait `ACCES_JETON` et `REFRESH_JETON` du `.env`
- Toute dépendance aux tokens statiques du `.env`

### ✅ Fonctionnement actuel

1. **Chaque utilisateur doit se connecter via OAuth** :
   - Accéder à `/strava-connect`
   - Cliquer sur "CONNECT WITH STRAVA"
   - Se connecter avec son propre compte Strava
   - Autoriser l'application

2. **Les tokens sont stockés individuellement** :
   - Chaque utilisateur a ses propres `stravaAccessToken`, `stravaRefreshToken`, `stravaExpiresAt` dans la base de données
   - Les tokens sont automatiquement rafraîchis quand ils expirent

3. **Redirection automatique** :
   - Si un utilisateur essaie d'accéder aux données Strava sans être connecté, il est automatiquement redirigé vers `/strava-connect`

## Variables d'environnement nécessaires

Dans `server/.env`, vous devez avoir **uniquement** :

```env
# Strava OAuth Application Credentials (pour tous les utilisateurs)
STRAVA_CLIENT_ID=votre_client_id
STRAVA_CLIENT_SECRET=votre_client_secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback
```

**Les variables suivantes ne sont plus nécessaires** (vous pouvez les supprimer du `.env`) :
- ❌ `ACCES_JETON` (supprimé)
- ❌ `REFRESH_JETON` (supprimé)

## Comment connecter un compte Strava

1. L'utilisateur se connecte à l'application avec son compte
2. L'utilisateur va sur `/strava-connect`
3. L'utilisateur clique sur "CONNECT WITH STRAVA"
4. L'utilisateur est redirigé vers Strava pour se connecter avec son email/mot de passe
5. L'utilisateur autorise l'application
6. Les tokens sont automatiquement sauvegardés dans la base de données

## Sécurité

- ✅ Chaque utilisateur utilise son propre compte Strava
- ✅ Les tokens sont stockés de manière sécurisée dans la base de données
- ✅ Les tokens sont automatiquement rafraîchis
- ✅ Aucun token statique dans le `.env`

