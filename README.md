# At-ifit

Application de suivi sportif et nutritionnel intelligent, connectée à Strava.

## 🛠 Comment l'application a été créée

Ce projet a été développé avec une architecture moderne **Fullstack JavaScript** :

*   **Frontend** : [React](https://react.dev/) (Vite) pour une interface utilisateur dynamique et réactive.
*   **Backend** : [Node.js](https://nodejs.org/) avec [Express](https://expressjs.com/) pour l'API REST.
*   **Base de données** : [MySQL](https://www.mysql.com/) gérée via l'ORM [Sequelize](https://sequelize.org/) pour la persistance des données (Utilisateurs, Poids).
*   **Design** : CSS pur avec une esthétique "Cyberpunk/Neon" personnalisée.
*   **Intégration** : API [Strava](https://www.strava.com/) pour récupérer automatiquement les activités sportives.

## 🚀 Fonctionnalités Principales

### 1. Dashboard Unifié
*   **Suivi du Poids** : Saisie et visualisation de l'évolution du poids.
*   **Corrélation Activité/Poids** : Graphique combinant la courbe de poids avec les barres d'activités Strava (Distance, Calories ou BPM).
*   **Statistiques** : Calcul automatique de l'IMC, des variations de poids (7j, 30j) et des records.

### 2. Connexion Strava
*   Authentification sécurisée via OAuth2.
*   Récupération automatique des activités (Course, Vélo, Natation, etc.).
*   Analyse détaillée des performances (Distance totale, Dénivelé, Fréquence cardiaque).

### 3. Calculateur de Calories Intelligent (KCAL)
*   **Calcul TDEE** : Estimation précise des besoins caloriques journaliers basée sur le métabolisme de base (Mifflin-St Jeor) et l'historique d'activité réel importé de Strava.
*   **Ajustement Dynamique** : L'objectif calorique s'adapte automatiquement en fonction de la différence entre votre poids actuel et votre poids cible (`delta`).
*   **Estimation Temporelle** : Calcul du temps estimé (en semaines) pour atteindre votre objectif de poids selon votre déficit/surplus calorique.

### 4. Profil Pilote
*   Gestion des informations personnelles (Age, Taille, Objectif).
*   Affichage en temps réel de l'objectif calorique calculé et de l'estimation de temps.

---
*Développé par William Peynichou.*
