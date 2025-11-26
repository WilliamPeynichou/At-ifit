# 🏗️ Guide d'Architecture du Projet

## Structure des Répertoires

```
server/
├── config/
│   └── config.json           # Configuration de la base de données
├── middleware/
│   ├── auth.js               # Middleware d'authentification JWT
│   ├── validation.js         # Middleware de validation des entrées ✨ NOUVEAU
│   └── errorHandler.js       # Gestion des erreurs et réponses ✨ NOUVEAU
├── models/
│   ├── User.js               # Modèle utilisateur avec hachage de mot de passe
│   └── Weight.js             # Modèle de suivi du poids
├── routes/
│   ├── auth.js               # Routes d'authentification (connexion, inscription)
│   ├── user.js               # Profil utilisateur et calcul de calories
│   └── strava.js             # OAuth Strava et activités
├── utils/
│   ├── logger.js             # Journalisation centralisée ✨ NOUVEAU
│   └── stravaHelpers.js      # Utilitaires Strava partagés ✨ NOUVEAU
├── scripts/
│   └── update_tokens.js      # Script de mise à jour manuelle des tokens
├── .env                      # Variables d'environnement
├── database.js               # Configuration Sequelize
├── index.js                  # Fichier serveur principal
├── README.md                 # Documentation de configuration MySQL
└── package.json

client/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx     # Tableau de bord principal avec graphiques
│   │   ├── KcalCalculator.jsx # Calculateur de calories
│   │   ├── Layout.jsx        # Mise en page de l'application avec en-tête
│   │   ├── ProtectedRoute.jsx # Protection des routes
│   │   ├── StatsCard.jsx     # Carte de statistiques réutilisable
│   │   ├── UserProfile.jsx   # Formulaire de profil utilisateur
│   │   └── WeightForm.jsx    # Formulaire de saisie du poids
│   ├── context/
│   │   └── AuthContext.jsx   # Contexte d'authentification
│   ├── pages/
│   │   ├── Login.jsx         # Page de connexion
│   │   ├── Register.jsx      # Page d'inscription
│   │   ├── StravaConnect.jsx # Page de connexion Strava
│   │   └── StravaStats.jsx   # Page de statistiques Strava
│   ├── utils/
│   │   └── toast.js          # Notifications toast ✨ NOUVEAU
│   ├── api.js                # Instance Axios avec intercepteurs
│   ├── App.jsx               # Composant principal de l'application
│   ├── index.css             # Styles globaux
│   └── main.jsx              # Point d'entrée React
└── package.json
```

---

## 🔄 Flux des Requêtes

### Flux d'Authentification
```
Client → POST /api/auth/login
  ↓
validation.js (valider email/mot de passe)
  ↓
Gestionnaire de route auth.js
  ↓
User.findOne() + comparePassword()
  ↓
Générer le token JWT
  ↓
errorHandler.js (sendSuccess)
  ↓
Client reçoit { success: true, data: { user, token } }
```

### Flux de Route Protégée
```
Client → GET /api/user (avec en-tête Authorization)
  ↓
Middleware auth.js (vérifier JWT)
  ↓
req.userId défini
  ↓
Gestionnaire de route user.js
  ↓
User.findByPk(req.userId)
  ↓
errorHandler.js (sendSuccess)
  ↓
Client reçoit les données utilisateur
```

### Flux de Calcul des Calories
```
Client → POST /api/user/calculate-calories
  ↓
Middleware auth.js
  ↓
validation.js (valider genre, objectif)
  ↓
Gestionnaire de route user.js
  ↓
Récupérer le dernier poids de la table Weight
  ↓
calculateBMR() → Calculer le métabolisme de base
  ↓
stravaHelpers.getValidStravaToken() → Obtenir/rafraîchir le token
  ↓
stravaHelpers.fetchStravaActivities() → Obtenir l'historique des activités
  ↓
calculateActivityFactor() → Déterminer le niveau d'activité
  ↓
calculateCalorieAdjustment() → Appliquer l'ajustement basé sur l'objectif
  ↓
Enregistrer consoKcal & weeksToGoal dans User
  ↓
errorHandler.js (sendSuccess)
  ↓
Client reçoit les résultats du calcul
```

---

## 🔑 Composants Clés

### Serveur

#### **Pile de Middleware**
1. `cors()` - Activer les requêtes cross-origin
2. `express.json()` - Parser les corps JSON
3. `auth` - Vérifier le token JWT (routes protégées uniquement)
4. `validateRequest()` - Valider les données d'entrée
5. `asyncHandler()` - Capturer les erreurs asynchrones
6. `errorHandler()` - Gestionnaire d'erreurs global (dernier)

#### **Fonctions Utilitaires**

**logger.js**
- `logger.info()` - Enregistrer les messages d'information
- `logger.error()` - Enregistrer les erreurs
- `logger.warn()` - Enregistrer les avertissements
- `logger.debug()` - Enregistrer les informations de débogage (dev uniquement)

**stravaHelpers.js**
- `getStravaCredentials(userId)` - Obtenir l'ID client/secret pour l'utilisateur
- `getValidStravaToken(user)` - Obtenir un token valide, rafraîchir si nécessaire
- `fetchStravaActivities(token, params)` - Récupérer les activités depuis Strava

**errorHandler.js**
- `asyncHandler(fn)` - Envelopper les gestionnaires de route asynchrones
- `sendSuccess(res, data, message, statusCode)` - Envoyer une réponse de succès
- `sendError(res, message, statusCode, details)` - Envoyer une réponse d'erreur
- `errorHandler(err, req, res, next)` - Gestionnaire d'erreurs global
- `notFoundHandler(req, res)` - Gestionnaire 404

#### **Fonctions de Logique Métier**

**user.js**
- `calculateBMR(weight, height, age, gender)` - Équation de Mifflin-St Jeor
- `calculateActivityFactor(avgHoursPerWeek)` - Niveau d'activité à partir des heures
- `calculateCalorieAdjustment(goal, delta)` - Logique d'ajustement des calories

---

## 📡 Points de Terminaison API

### Authentification
- `POST /api/auth/register` - Inscrire un nouvel utilisateur
- `POST /api/auth/login` - Connecter un utilisateur
- `GET /api/auth/me` - Obtenir l'utilisateur actuel (protégé)

### Profil Utilisateur
- `GET /api/user` - Obtenir le profil utilisateur (protégé)
- `POST /api/user` - Mettre à jour le profil utilisateur (protégé)
- `POST /api/user/calculate-calories` - Calculer les calories quotidiennes (protégé)

### Suivi du Poids
- `GET /api/weight` - Obtenir toutes les entrées de poids (protégé)
- `POST /api/weight` - Ajouter une entrée de poids (protégé)
- `DELETE /api/weight/:id` - Supprimer une entrée de poids (protégé)

### Intégration Strava
- `GET /api/strava/auth` - Obtenir l'URL OAuth Strava (protégé)
- `GET /api/strava/callback` - Callback OAuth (public)
- `POST /api/strava/connect` - Échanger le code contre des tokens (protégé)
- `GET /api/strava/activities` - Obtenir les activités Strava (protégé)

---

## 🔐 Variables d'Environnement

### Requises
```env
# Configuration JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# API Strava (Utilisateur par défaut)
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback

# API Strava (Utilisateur ID 2 - Victor)
VICTOR_STRAVA_CLIENT_ID=victor-client-id
VICTOR_STRAVA_CLIENT_SECRET=victor-client-secret

# Base de données MySQL (optionnel - utilise config.json si non défini)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=ecocycle_db
DB_USERNAME=root
DB_PASSWORD=

# Serveur
PORT=3001
NODE_ENV=development
```

---

## 🧪 Guide de Test

### Tests Manuels

1. **Démarrer le Serveur**
   ```bash
   cd server
   npm start
   ```

2. **Démarrer le Client**
   ```bash
   cd client
   npm run dev
   ```

3. **Tester l'Authentification**
   - Inscrire un nouvel utilisateur
   - Se connecter avec les identifiants
   - Vérifier le token dans localStorage
   - Accéder aux routes protégées

4. **Tester le Suivi du Poids**
   - Ajouter une entrée de poids
   - Voir le graphique de poids
   - Supprimer une entrée de poids

5. **Tester l'Intégration Strava**
   - Connecter le compte Strava
   - Voir les activités
   - Vérifier le rafraîchissement du token

6. **Tester le Calculateur de Calories**
   - Définir le profil utilisateur (taille, âge, genre)
   - Enregistrer les données de poids
   - Calculer les calories
   - Vérifier les résultats affichés

### Tests API avec cURL

```bash
# Inscription
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","pseudo":"TestUser"}'

# Connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Obtenir l'utilisateur (remplacer TOKEN)
curl http://localhost:3001/api/user \
  -H "Authorization: Bearer TOKEN"

# Ajouter un poids
curl -X POST http://localhost:3001/api/weight \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weight":75.5,"date":"2025-11-20"}'
```

---

## 🐛 Débogage

### Journaux du Serveur
Tous les journaux utilisent maintenant l'utilitaire logger :
```javascript
logger.info('Message', { metadata });
logger.error('Message d\'erreur', error);
logger.warn('Avertissement', { data });
logger.debug('Informations de débogage', { details });
```

### Problèmes Courants

**"Variables d'environnement requises manquantes"**
- Vérifier que le fichier `.env` existe dans `/server`
- Vérifier que toutes les variables requises sont définies
- Redémarrer le serveur après avoir modifié `.env`

**"Échec de la synchronisation de la base de données"**
- Vérifier que MySQL est démarré et accessible (`brew services start mysql` sur Mac)
- Vérifier que la base de données existe (créer avec `CREATE DATABASE ecocycle_db`)
- Vérifier les identifiants MySQL dans `config/config.json` ou `.env`
- Sur Mac, le mot de passe root est généralement vide par défaut
- Tester la connexion avec `node check_db_connection.js`

**"Échec du rafraîchissement du token Strava"**
- Vérifier les identifiants Strava dans `.env`
- Vérifier que le refresh token est valide
- Reconnecter le compte Strava depuis l'interface utilisateur

**"Échec de la validation"**
- Vérifier que le corps de la requête correspond aux règles de validation
- Voir `middleware/validation.js` pour les règles
- S'assurer que tous les champs requis sont fournis

---

## 🚀 Déploiement

### Checklist de Production
1. Définir `NODE_ENV=production`
2. Utiliser un `JWT_SECRET` fort (32+ caractères)
3. Configurer la base de données de production (PostgreSQL/MySQL)
4. Configurer les certificats SSL/TLS
5. Configurer CORS pour le domaine de production
6. Activer la limitation de débit
7. Configurer le suivi des erreurs (Sentry)
8. Configurer la journalisation vers fichier/service
9. Configurer les sauvegardes de base de données
10. Ajouter un point de terminaison de vérification de santé

### Hébergement Recommandé
- **Serveur** : Heroku, Railway, Render, DigitalOcean
- **Client** : Vercel, Netlify, Cloudflare Pages
- **Base de données** : Heroku Postgres, PlanetScale, Supabase

---

## 📚 Ressources Supplémentaires

- [Documentation Express.js](https://expressjs.com/)
- [Documentation Sequelize](https://sequelize.org/)
- [Documentation React](https://react.dev/)
- [Documentation API Strava](https://developers.strava.com/)
- [Meilleures Pratiques JWT](https://tools.ietf.org/html/rfc8725)

---

**Dernière Mise à Jour** : 2025-11-20
**Maintenu Par** : Équipe de Développement
