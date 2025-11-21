# Résolution de l'erreur "Limite d'athlètes connectés dépassée"

## Problème

Vous rencontrez l'erreur :
```
Erreur 403 : limite d'athlètes connectés dépassée
Cette application a dépassé la limite d'athlètes connectés.
```

Cela signifie que votre application Strava a atteint la limite d'athlètes uniques qui peuvent se connecter (quota de développement).

## Solutions

### Solution 1 : Révoquer tous les tokens existants (Recommandé)

Un script a été créé pour révoquer tous les tokens Strava et libérer des emplacements.

**Exécuter le script :**
```bash
cd server
npm run revoke-strava
```

Ou directement :
```bash
node server/scripts/revoke_all_strava_tokens.js
```

Ce script va :
1. Trouver tous les utilisateurs avec des tokens Strava
2. Révoquer chaque token via l'API Strava (`/oauth/deauthorize`)
3. Nettoyer les tokens de la base de données
4. Libérer des emplacements pour de nouveaux utilisateurs

### Solution 2 : Déconnecter manuellement via l'interface

1. Connectez-vous à votre application
2. Allez sur `/strava-connect`
3. Cliquez sur "DISCONNECT STRAVA" pour chaque utilisateur
4. Répétez pour tous les utilisateurs

### Solution 3 : Demander une augmentation du quota

Si vous avez besoin de plus d'athlètes connectés :

1. Allez sur https://www.strava.com/settings/api
2. Cliquez sur votre application
3. Contactez le support développeur Strava pour demander une augmentation du quota
4. Expliquez votre cas d'usage et pourquoi vous avez besoin de plus d'athlètes

### Solution 4 : Créer une nouvelle application Strava

Si vous ne pouvez pas augmenter le quota :

1. Créez une nouvelle application Strava sur https://www.strava.com/settings/api
2. Obtenez le nouveau `CLIENT_ID` et `CLIENT_SECRET`
3. Mettez à jour votre fichier `server/.env` :
   ```env
   STRAVA_CLIENT_ID=nouveau_client_id
   STRAVA_CLIENT_SECRET=nouveau_client_secret
   STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback
   ```
4. Tous les utilisateurs devront se reconnecter avec la nouvelle application

## Prévention

Pour éviter d'atteindre la limite à l'avenir :

1. **Révoquez régulièrement les tokens inactifs** : Utilisez le script `revoke-strava` périodiquement
2. **Nettoyez les comptes de test** : Supprimez les utilisateurs de test de votre base de données
3. **Surveillez le nombre d'athlètes connectés** : Créez un endpoint pour voir combien d'utilisateurs ont Strava connecté

## Vérification

Après avoir révoqué les tokens, vérifiez que ça fonctionne :

1. Essayez de vous connecter avec un nouveau compte Strava
2. Si l'erreur persiste, attendez quelques minutes (Strava peut mettre du temps à mettre à jour le quota)
3. Si nécessaire, créez une nouvelle application Strava

