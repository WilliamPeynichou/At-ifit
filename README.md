# 🚴 At-ifit

Application de suivi sportif et nutritionnel intelligent, connectée à Strava.

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?logo=node.js)
![MySQL](https://img.shields.io/badge/MySQL-Sequelize-4479A1?logo=mysql)
![Strava](https://img.shields.io/badge/Strava-API-FC4C02?logo=strava)

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Lancement](#-lancement)
- [Structure du projet](#-structure-du-projet)

## ✨ Fonctionnalités

### 🎯 Dashboard Unifié
- **Suivi du poids** : Saisie et visualisation de l'évolution du poids
- **Corrélation Activité/Poids** : Graphique combinant la courbe de poids avec les activités Strava
- **Statistiques temps réel** : IMC, variations (7j/30j), records personnels

### 🏃 Intégration Strava
- Authentification sécurisée OAuth2
- Récupération automatique des activités (Course, Vélo, Natation...)
- Analyse des performances (Distance, Dénivelé, Fréquence cardiaque)

### 🔥 Calculateur KCAL Intelligent
- **Calcul TDEE** : Métabolisme de base (Mifflin-St Jeor) + activité réelle Strava
- **Ajustement dynamique** : Objectif calorique adapté selon votre delta poids
- **Estimation temporelle** : Temps estimé pour atteindre votre objectif

### 🤖 Coach IA
- Chatbot intégré pour conseils personnalisés
- Analyse de vos données d'entraînement
- Recommandations basées sur vos objectifs

### 🌍 Multi-langues
- Français, Anglais, Italien, Turc
- Détection automatique selon le pays utilisateur

## 🛠 Technologies

### Frontend
| Tech | Version | Usage |
|------|---------|-------|
| React | 19.2 | UI Framework |
| Vite | 7.2 | Build tool |
| Tailwind CSS | 4.1 | Styling |
| Recharts | 3.4 | Graphiques |
| Lucide React | - | Icônes |

### Backend
| Tech | Version | Usage |
|------|---------|-------|
| Node.js | - | Runtime |
| Express | 5.1 | API REST |
| Sequelize | 6.37 | ORM MySQL |
| JWT | - | Authentification |
| bcryptjs | - | Hash passwords |

### Base de données
- **MySQL** avec Sequelize ORM
- Modèles : User, Weight, RefreshToken

## 📦 Installation

### Prérequis
- Node.js >= 18
- MySQL >= 8.0
- Compte développeur Strava

### 1. Cloner le projet
```bash
git clone https://github.com/WilliamPeynichou/At-ifit.git
cd At-ifit
```

### 2. Installer les dépendances
```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `server/.env` :

```env
# Base de données
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=at_ifit
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Strava OAuth
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback

# Anthropic / Claude (pour le Coach IA)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Alternative compatible existante : Mistral/Ollama
# AI_PROVIDER=mistral
# MISTRAL_API_KEY=your_mistral_api_key
# MISTRAL_MODEL=mistral-large-latest
# MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions
```

Note : une clé API Anthropic côté serveur permet d'utiliser Claude dans l'application, mais elle ne donne pas accès aux MCP connectés dans ton compte Claude Desktop/Web. Les données Strava utilisées par le coach viennent de la synchronisation Strava déjà présente dans la base de données de l'application.

### Configuration Strava

1. Créer une application sur [Strava Developers](https://www.strava.com/settings/api)
2. Configurer le callback URL : `http://localhost:3001/api/strava/callback`
3. Copier Client ID et Client Secret dans `.env`

## 🚀 Lancement

### Développement

```bash
# Terminal 1 - Backend (port 3001)
cd server && npm run dev

# Terminal 2 - Frontend (port 5174)
cd client && npm run dev
```

### Production

```bash
# Build frontend
cd client && npm run build

# Start backend
cd server && npm start
```

## 📁 Structure du projet

```
At-ifit/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── context/        # Contextes React (Auth, Language)
│   │   ├── hooks/          # Custom hooks
│   │   ├── i18n/           # Traductions
│   │   ├── pages/          # Pages/Routes
│   │   └── assets/         # Images, fonts
│   └── package.json
│
├── server/                 # Backend Express
│   ├── middleware/         # Auth, validation, rate limiting
│   ├── models/             # Modèles Sequelize
│   ├── routes/             # Routes API
│   ├── services/           # Services métier
│   ├── utils/              # Helpers
│   └── package.json
│
└── README.md
```

## Sécurité

- Authentification JWT avec refresh tokens
- Rate limiting sur les endpoints sensibles
- Hash des mots de passe avec bcrypt
- Validation des entrées utilisateur
- Protection CORS configurée

## Responsive

L'application est optimisée pour :
- Mobile (320px+)
- Tablet (768px+)
- Desktop (1024px+)

---

**Développé par [William Peynichou](https://github.com/WilliamPeynichou)**
