# 🔗 Configuration Strava pour permettre à n'importe quel compte de se connecter

## ✅ IMPORTANT : Votre application accepte DÉJÀ n'importe quel compte Strava !

Le système est **déjà configuré** pour permettre à **n'importe quel utilisateur Strava** de se connecter. Voici comment ça fonctionne et comment le configurer.

---

## 📋 Prérequis

Pour permettre à n'importe quel compte Strava de se connecter à votre application, vous devez :

1. **Créer une application Strava** sur https://www.strava.com/settings/api
2. **Configurer les variables d'environnement** dans votre fichier `.env`

---

## 🚀 Étapes de configuration

### 1. Créer une application Strava (UNE SEULE APPLICATION POUR TOUS)

1. Allez sur https://www.strava.com/settings/api
2. Connectez-vous avec votre compte Strava (peu importe quel compte, c'est juste pour créer l'app)
3. Cliquez sur **"Create My App"** ou **"Create Application"**
4. Remplissez le formulaire :
   - **Application Name** : `AT.IFIT` (ou le nom de votre choix)
   - **Category** : `Training`
   - **Club** : (optionnel)
   - **Website** : `http://localhost:5173` (pour le développement)
   - **Authorization Callback Domain** : `localhost` (pour le développement - **SANS http://**)
   - **Description** : Description de votre application

5. **IMPORTANT** : L'application sera automatiquement **publique** et pourra être utilisée par **n'importe quel compte Strava**

6. Après création, vous obtiendrez :
   - **Client ID** : Un nombre (ex: `123456`)
   - **Client Secret** : Une chaîne aléatoire (ex: `abc123def456...`)

### 2. Configurer les variables d'environnement

Dans votre fichier `server/.env`, ajoutez :

```env
# Strava API Configuration
STRAVA_CLIENT_ID=votre_client_id_ici
STRAVA_CLIENT_SECRET=votre_client_secret_ici
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback
```

**Important** : 
- Remplacez `votre_client_id_ici` et `votre_client_secret_ici` par les valeurs obtenues lors de la création de l'application
- Pour la production, changez `localhost` par votre domaine réel

### 3. Comment ça fonctionne

Le système utilise **OAuth 2.0** de Strava :

1. **L'utilisateur clique sur "Connect Strava"** dans votre application
2. **Redirection vers Strava** : L'utilisateur est redirigé vers Strava pour autoriser votre application
3. **Autorisation** : L'utilisateur autorise votre application à accéder à ses données
4. **Callback** : Strava redirige vers votre serveur avec un code d'autorisation
5. **Échange du code** : Votre serveur échange le code contre des tokens d'accès
6. **Stockage** : Les tokens sont stockés dans la base de données pour cet utilisateur spécifique

### 4. Chaque utilisateur a ses propres tokens

- Chaque utilisateur qui se connecte obtient ses **propres tokens** (access_token, refresh_token)
- Ces tokens sont stockés dans la table `User` de votre base de données
- Les tokens sont automatiquement rafraîchis quand ils expirent

---

## 🌐 Configuration pour la production

### Pour déployer en production :

1. **Mettre à jour l'application Strava** :
   - Allez sur https://www.strava.com/settings/api
   - Modifiez votre application
   - Changez **Authorization Callback Domain** : `votre-domaine.com` (sans http://)
   - Changez **Website** : `https://votre-domaine.com`

2. **Mettre à jour les variables d'environnement** :
```env
STRAVA_REDIRECT_URI=https://votre-domaine.com/api/strava/callback
```

3. **Mettre à jour le callback dans le code** :
   - Modifiez `server/routes/strava.js` ligne 25 et 29
   - Remplacez `http://localhost:5173` par votre URL de production

---

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Démarrez votre serveur backend
2. Connectez-vous à votre application
3. Allez sur la page de connexion Strava
4. Cliquez sur "Connect Strava"
5. Vous devriez être redirigé vers Strava pour autoriser l'application
6. Après autorisation, vous revenez sur votre application avec Strava connecté

---

## 🔧 Dépannage

### Erreur : "Invalid redirect_uri"
- Vérifiez que le domaine dans Strava correspond exactement à celui dans votre `.env`
- Pour le développement : `localhost` (sans http://)
- Pour la production : `votre-domaine.com` (sans http://)

### Erreur : "Invalid client_id"
- Vérifiez que `STRAVA_CLIENT_ID` dans `.env` correspond à votre Client ID

### Erreur : "Invalid client_secret"
- Vérifiez que `STRAVA_CLIENT_SECRET` dans `.env` correspond à votre Client Secret

### Les tokens expirent rapidement
- C'est normal ! Les tokens Strava expirent après 6 heures
- Le système les rafraîchit automatiquement grâce au `refresh_token`

---

## 📚 Documentation Strava

- Documentation OAuth : https://developers.strava.com/docs/authentication/
- API Reference : https://developers.strava.com/docs/reference/

---

## 💡 Comment ça fonctionne (OAuth 2.0)

**Une seule application Strava** est utilisée pour **tous les utilisateurs**. Voici le processus :

1. **Vous créez UNE application Strava** (c'est fait une seule fois)
2. **N'importe quel utilisateur** peut autoriser cette application avec **son propre compte Strava**
3. Chaque utilisateur obtient **ses propres tokens** (access_token, refresh_token)
4. Les tokens sont stockés individuellement dans votre base de données
5. Chaque utilisateur peut accéder à **ses propres données Strava**

### 🔓 Pas de restriction

- ✅ **Aucun compte Strava n'est bloqué**
- ✅ **Aucune liste blanche nécessaire**
- ✅ **Aucune restriction par email ou ID**
- ✅ **Tous les comptes Strava peuvent se connecter**

### 🎯 Exemple concret

- Utilisateur A (email: alice@example.com) → Se connecte avec son compte Strava → Obtient ses tokens
- Utilisateur B (email: bob@example.com) → Se connecte avec son compte Strava → Obtient ses tokens
- Utilisateur C (email: charlie@example.com) → Se connecte avec son compte Strava → Obtient ses tokens

**Tous utilisent la même application Strava, mais chacun a ses propres tokens et voit ses propres données !**

---

## ✅ Vérification que tout fonctionne

Pour tester que n'importe quel compte peut se connecter :

1. Créez plusieurs comptes utilisateurs dans votre application
2. Connectez chaque compte à un **compte Strava différent**
3. Vérifiez que chaque utilisateur voit **ses propres activités Strava**

Si ça fonctionne, c'est que votre configuration est correcte ! 🎉

