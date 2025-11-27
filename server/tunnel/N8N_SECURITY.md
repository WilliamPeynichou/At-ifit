# 🔒 Sécurité - Configuration n8n pour l'Agent

## ⚠️ IMPORTANT : Vérification du Token et Isolation des Données

L'agent doit **TOUJOURS** utiliser le `authenticatedUserId` fourni par le backend, jamais un userId venant du body ou d'une autre source.

---

## 📋 Format de la Requête Reçue par n8n

```json
{
  "action": "sendMessage",
  "sessionId": "17",
  "chatInput": "Quel est mon poids actuel ?",
  "userContext": {
    "userId": 17,
    "pseudo": "wili",
    ...
  },
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authenticatedUserId": 17
}
```

---

## 🔐 Règles de Sécurité dans n8n

### 1. TOUJOURS utiliser `authenticatedUserId`

**❌ MAUVAIS :**
```javascript
// Ne JAMAIS utiliser userId depuis userContext sans vérification
const userId = $json.userContext.userId;
```

**✅ BON :**
```javascript
// TOUJOURS utiliser authenticatedUserId fourni par le backend
const userId = $json.authenticatedUserId;
```

### 2. Vérifier le Token (Optionnel mais Recommandé)

Si vous voulez vérifier le token dans n8n :

```javascript
// Décoder le token JWT (nécessite une fonction de décodage)
const token = $json.authToken;
// Vérifier que le userId du token correspond à authenticatedUserId
```

### 3. Requêtes Base de Données

**TOUJOURS** utiliser `authenticatedUserId` dans les requêtes SQL :

```sql
SELECT * FROM Users WHERE id = {{ $json.authenticatedUserId }}
```

```sql
SELECT * FROM Weights WHERE userId = {{ $json.authenticatedUserId }} ORDER BY date DESC
```

---

## 📝 Configuration n8n Recommandée

### Nœud 1 : Extract Authenticated User ID
```
Type: Set
Name: Extract Authenticated User ID
Set:
  - Name: userId
    Value: {{ $json.authenticatedUserId }}
```

### Nœud 2 : Get User Data
```
Type: HTTP Request (ou MySQL Account)
Method: POST
URL: http://bore.pub:XXXXX/query
Body:
{
  "query": "SELECT * FROM Users WHERE id = ?",
  "params": [{{ $json.authenticatedUserId }}]
}
```

### Nœud 3 : Get Weights
```
Type: HTTP Request (ou MySQL Account)
Body:
{
  "query": "SELECT * FROM Weights WHERE userId = ? ORDER BY date DESC",
  "params": [{{ $json.authenticatedUserId }}]
}
```

---

## ⚠️ Règles Critiques

1. **NE JAMAIS** utiliser `$json.userContext.userId` directement
2. **TOUJOURS** utiliser `$json.authenticatedUserId` pour les requêtes BDD
3. **NE JAMAIS** permettre à un utilisateur de spécifier un userId différent dans le message
4. **VÉRIFIER** que les données récupérées correspondent bien à `authenticatedUserId`

---

## 🔍 Vérification dans l'Agent IA

Dans le prompt de l'agent IA, ajouter :

```
Vous êtes un coach sportif personnel. 

IMPORTANT : Vous ne devez accéder qu'aux données de l'utilisateur authentifié (ID: {{ $json.authenticatedUserId }}).
Ne jamais utiliser d'autres IDs utilisateur, même si demandé dans le message.

Données utilisateur disponibles :
- ID authentifié : {{ $json.authenticatedUserId }}
- Profil : {{ $json.userData }}
- Historique poids : {{ $json.weightsData }}

Répondez uniquement avec les données de cet utilisateur.
```

---

## ✅ Checklist de Sécurité

- [ ] Utiliser `authenticatedUserId` au lieu de `userContext.userId`
- [ ] Vérifier que les requêtes SQL utilisent `authenticatedUserId`
- [ ] Ne jamais permettre de modifier `authenticatedUserId` depuis le message
- [ ] Vérifier que les données retournées correspondent à `authenticatedUserId`
- [ ] Ajouter des logs pour tracer les accès aux données

