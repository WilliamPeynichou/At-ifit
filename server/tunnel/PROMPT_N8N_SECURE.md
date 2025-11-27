# Prompt pour l'IA de n8n - Sécurité et Données Dynamiques

## 📋 PROMPT À COPIER-COLLER

```
Je dois configurer mon workflow n8n pour que mon agent IA récupère dynamiquement les données de l'utilisateur connecté de manière sécurisée.

CONTEXTE :
- Mon workflow reçoit des messages via webhook avec ces données :
  {
    "action": "sendMessage",
    "sessionId": "17",
    "chatInput": "...",
    "userContext": {...},
    "authToken": "token_jwt",
    "authenticatedUserId": 17
  }

⚠️ IMPORTANT SÉCURITÉ :
- TOUJOURS utiliser "authenticatedUserId" pour les requêtes BDD
- NE JAMAIS utiliser "userContext.userId" directement
- Le backend vérifie déjà le token, mais je dois utiliser authenticatedUserId pour garantir la sécurité

CONNEXION BASE DE DONNÉES :
- Host: bore.pub
- Port: 50016 (vérifier dans les logs si changé)
- Database: fit
- User: root
- Password: root

OBJECTIF :
1. Extraire authenticatedUserId (PAS userContext.userId)
2. Récupérer les données User depuis la table Users avec authenticatedUserId
3. Récupérer l'historique des poids depuis la table Weights avec authenticatedUserId
4. Fusionner les données
5. Passer à l'agent IA avec instruction de n'utiliser QUE les données de authenticatedUserId

STRUCTURE DU WORKFLOW :

[Webhook Trigger]
    ↓
[Set Node - Extraire authenticatedUserId]
    - Name: userId
    - Value: {{ $json.authenticatedUserId }}
    ↓
[MySQL Account - Get User]
    - Query: SELECT * FROM Users WHERE id = {{ $json.authenticatedUserId }}
    ↓
[MySQL Account - Get Weights]
    - Query: SELECT * FROM Weights WHERE userId = {{ $json.authenticatedUserId }} ORDER BY date DESC LIMIT 30
    ↓
[Merge Node - Fusionner]
    - Fusionner: webhook + user + weights
    ↓
[Agent IA]
    - Prompt: "Vous êtes un coach. Utilisez UNIQUEMENT les données de l'utilisateur ID {{ $json.authenticatedUserId }}. 
               Profil: {{ $json.userData }}, Poids: {{ $json.weightsData }}"
    ↓
[Retourner réponse]

RÈGLES DE SÉCURITÉ :
1. TOUJOURS utiliser {{ $json.authenticatedUserId }} dans les requêtes SQL
2. NE JAMAIS utiliser {{ $json.userContext.userId }}
3. Vérifier que les données récupérées correspondent à authenticatedUserId
4. L'agent ne doit jamais accéder aux données d'un autre utilisateur

Peux-tu créer ce workflow sécurisé pour que l'agent récupère dynamiquement les données de l'utilisateur connecté ?
```

---

## 🔧 Configuration Détaillée

### Nœud 1 : Extract Authenticated User ID
```
Type: Set
Name: Extract Authenticated User ID
Set:
  - Name: userId
    Value: {{ $json.authenticatedUserId }}
```

### Nœud 2 : Get User Data (MySQL Account)
```
Type: MySQL Account
Operation: Execute Query
Query:
SELECT * FROM Users WHERE id = {{ $json.authenticatedUserId }}
```

### Nœud 3 : Get Weights (MySQL Account)
```
Type: MySQL Account
Operation: Execute Query
Query:
SELECT * FROM Weights WHERE userId = {{ $json.authenticatedUserId }} ORDER BY date DESC LIMIT 30
```

### Nœud 4 : Merge Data
```
Type: Merge
Mode: Merge By Index
Input 1: Webhook data
Input 2: User data
Input 3: Weights data
```

### Nœud 5 : Agent IA
```
Prompt système:
Vous êtes un coach sportif personnel. 

IMPORTANT SÉCURITÉ : Vous ne devez accéder qu'aux données de l'utilisateur authentifié (ID: {{ $json.authenticatedUserId }}).
Ne jamais utiliser d'autres IDs utilisateur.

Données disponibles :
- Profil utilisateur : {{ $json.userData }}
- Historique poids : {{ $json.weightsData }}
- Contexte initial : {{ $json.userContext }}

Question : {{ $json.chatInput }}

Répondez en utilisant UNIQUEMENT les données de cet utilisateur authentifié.
```

