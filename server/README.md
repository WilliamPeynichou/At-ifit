# Configuration du Serveur

## Base de données MySQL

L'application utilise MySQL comme base de données. La configuration se fait via le fichier `config/config.json` ou via les variables d'environnement.

### Configuration via config.json

Modifiez `config/config.json` avec vos paramètres MySQL :

```json
{
  "development": {
    "host": "localhost",
    "port": 3306,
    "database": "ecocycle_db",
    "username": "root",
    "password": "",
    "dialect": "mysql",
    "logging": false
  }
}
```

### Configuration via variables d'environnement

Créez un fichier `.env` dans le dossier `server` avec :

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=ecocycle_db
DB_USERNAME=root
DB_PASSWORD=

# Autres variables requises
JWT_SECRET=your-secret-key-here
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback
```

Les variables d'environnement ont la priorité sur `config.json`.

### Création de la base de données

Avant de démarrer le serveur, créez la base de données MySQL :

```sql
CREATE DATABASE ecocycle_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Note** : Sur Mac, le mot de passe root MySQL est généralement vide par défaut. Si vous avez configuré un mot de passe, mettez-le dans `config.json` ou dans le fichier `.env`.

### Vérification de la connexion

Pour tester la connexion à MySQL :

```bash
node check_db_connection.js
```

### Synchronisation automatique

Le serveur synchronise automatiquement les tables au démarrage via Sequelize (`sync({ alter: true })`). Les tables `Users` et `Weights` seront créées automatiquement si elles n'existent pas.

