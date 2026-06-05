# FEATURES_AGENT.md — Plan d'amélioration de l'agent IA Coach

> Document de cadrage et de roadmap pour faire évoluer l'agent IA (coach sportif &
> nutritionnel) de l'application. Rédigé après analyse du code existant.
>
> Branche d'origine : `fix/agent-dates-hallucination`
> Dernière mise à jour : voir `git log`.

---

## 1. Contexte & état des lieux

### Architecture actuelle

```
client/src/components/Chatbot.jsx
client/src/hooks/useAICoach.js
        │  POST /api/ai-coach/message
        ▼
server/routes/aiCoach.js                  ← rate-limit, pendingActions (Map mémoire), audit
        ▼
server/services/aiCoachService.js         ← orchestration, system prompt, appel LLM
   ├── agentToolsService.js               ← détection d'intent + récup. contexte ciblé + actions
   ├── advancedSportsAnalysisSkill.js     ← analyse sportive approfondie + clarification
   ├── agentGuardrailsService.js          ← sanitization, refus, actions autorisées
   ├── userContextService.js              ← contexte "legacy" (profil, poids, activités)
   └── utils/dateFrance.js                ← référence temporelle Europe/Paris (NEW)
```

### Points forts déjà en place

- ✅ **Référence temporelle fiable** (`utils/dateFrance.js`) : toutes les bornes de
  période sont calculées en `Europe/Paris` puis converties en UTC pour la DB, avec
  gestion des changements d'heure et des dates invalides.
- ✅ **Date du jour injectée dans le prompt** → réduit fortement les hallucinations de dates.
- ✅ **Guardrails** : refus des demandes dangereuses, sanitization des secrets (`SENSITIVE_KEY_PATTERN`).
- ✅ **Actions human-in-the-loop** : aucune action n'est exécutée sans confirmation explicite (`/actions/:id/confirm`).
- ✅ **Contexte ciblé par intent** plutôt que d'envoyer toute la base au LLM.
- ✅ **Observabilité** : `logAiUsage` (tokens, durée, dataUsed, intents) + `logAuditEvent`.
- ✅ **Multi-provider** : Anthropic / Mistral / Ollama.

### Faiblesses identifiées

| # | Faiblesse | Impact | Fichier(s) |
|---|---|---|---|
| F1 | Détection d'intent/période par **regex FR codées en dur** | Mauvais contexte récupéré → réponses hors-sujet / hallucinations | `agentToolsService.js`, `advancedSportsAnalysisSkill.js` |
| F2 | **Double contexte** (ciblé + legacy) avec requêtes DB dupliquées et formats divergents | Latence, coût tokens, incohérences | `aiCoachService.js` (`sendMessageToAICoach`) |
| F3 | `detectUnsafeRequest` **dupliqué** (guardrails + agentTools) avec patterns différents | Incohérence de sécurité | 2 fichiers |
| F4 | **Mémoire de conversation faible** (`maxHistory` ≈ 4, intent recalculé à chaque tour) | L'agent "oublie" le cadrage précédent | `aiCoachService.js` |
| F5 | `pendingActions` et `reportCache` en **`Map` mémoire process** | Perdu au redémarrage, non scalable multi-instance | `routes/aiCoach.js`, `aiCoachService.js` |
| F6 | Catalogue d'actions **très limité** (sync, créer objectif, bilan) | Agent peu "utile" au quotidien | `agentToolsService.js` |
| F7 | Pas de **grounding check** des chiffres/dates renvoyés par le LLM | Hallucinations résiduelles non détectées | — |

---

## 2. Vision cible

> Passer d'un **chatbot read-only piloté par regex** à un **agent fiable, à mémoire,
> piloté par tool-calling**, capable d'actions utiles validées par l'utilisateur,
> et mesurable (taux d'hallucination, utilité).

Principes directeurs :
1. **Une seule source de vérité** pour le contexte.
2. **Le LLM choisit les outils**, le serveur garde le contrôle (sécurité, exécution).
3. **Ne jamais inventer** : toute donnée chiffrée doit être traçable au contexte.
4. **Réutiliser l'existant** (`trainingLoadService`, `Goal`, `advancedSportsAnalysisSkill`).

---

## 3. Roadmap priorisée

Priorité = (Impact fiabilité/utilité) ÷ (Effort & risque).

### 🥇 Phase 1 — Fondations (quick wins, faible risque)

#### P1.1 — Unifier le contexte (supprimer le double) — **F2**
- Supprimer l'appel `getUserContext` legacy du chemin agentique dans `sendMessageToAICoach`.
- Construire le system prompt à partir du **seul** `buildTargetedAgentContext`.
- Mutualiser les requêtes profil/poids/activités (aujourd'hui faites deux fois).
- **Gain** : −1 série de requêtes DB par message, −tokens, cohérence des formats.
- **Effort** : faible. **Risque** : faible (couvert par tests existants).

#### P1.2 — Dédupliquer la sécurité — **F3**
- Une seule implémentation de `detectUnsafeRequest` (garder celle de `agentGuardrailsService`).
- `agentToolsService` importe la version centrale.
- **Effort** : très faible.

#### P1.3 — Grounding check des chiffres/dates — **F7**
- Après réponse du LLM, vérifier que les nombres/dates cités existent dans le contexte fourni.
- Si écart suspect : logguer un flag `possibleHallucination` (mesure) sans bloquer.
- **Effort** : moyen. **Gain** : mesure du taux d'hallucination dans le temps.

#### P1.4 — Tests d'intent (filet de sécurité) — **F1 (préparation)**
- Batterie de cas `phrase réelle → intents/période attendus` (incl. fautes, anglais partiel).
- Verrouille le comportement avant migration tool-calling.

**Livrable Phase 1** : contexte unifié, sécurité dédupliquée, métrique d'hallucination, tests d'intent.

---

### 🥈 Phase 2 — Le saut qualitatif : tool-calling natif — **F1, F4**

#### P2.1 — Exposer les services comme outils
Migrer de la détection regex vers le **function/tool calling** (Anthropic `tools`, Mistral `tools`).
Les fonctions de `agentToolsService` sont déjà parfaitement découpées :

| Outil exposé | Fonction existante |
|---|---|
| `get_activities_for_period(from, to, sport)` | `getActivitiesForPeriod` |
| `get_current_week(sport)` | `getCurrentWeek` |
| `compare_recent_weeks(sport)` | `compareRecentWeeks` |
| `get_monthly_volume(sport)` | `getMonthlyVolume` |
| `get_personal_records(sport)` | `getPersonalRecords` |
| `get_profile_and_goals()` | `getProfileAndGoals` |
| `advanced_sports_analysis(...)` | `buildAdvancedSportsAnalysisContext` |

- Le LLM choisit l'outil et **passe lui-même les dates** (en s'appuyant sur le bloc « date du jour » déjà injecté).
- Boucle d'exécution serveur : `tool_use` → exécution → `tool_result` → réponse finale.
- Garde-fous : whitelist d'outils, validation des params (déjà via `clampDateRange`, `sanitizeAction`), `userId` jamais paramétrable par le LLM.

#### P2.2 — Mémoire de session légère — **F4**
- Persister par conversation : dernier intent, dernière période, état de clarification en cours.
- Évite de reboucler les questions de cadrage et garde le contexte d'un tour à l'autre.

**Livrable Phase 2** : agent piloté par outils, robuste aux formulations, avec mémoire de cadrage.

---

### 🥉 Phase 3 — Utilité produit (capacités métier)

S'appuie largement sur des services **déjà présents**.

| Capacité | Description | Réutilise | Valeur | Effort |
|---|---|---|---|---|
| P3.1 **Suivi d'objectif** | « Où j'en suis sur mon objectif mensuel ? » | `Goal` + volumes | ⭐⭐ | faible |
| P3.2 **Détection surcharge/fatigue** | Alerte proactive sur charge anormale | `trainingLoadService` | ⭐⭐⭐ | faible |
| P3.3 **Comparaison N vs N-1** | Même période l'an dernier | `getActivitiesForPeriod` | ⭐⭐ | faible |
| P3.4 **Reco nutrition liée à la charge** | Ajuste apport selon effort du jour | `consoKcal`/TDEE | ⭐⭐ | faible |
| P3.5 **Plan d'entraînement** | Générer + sauvegarder un plan sur N semaines | nouveau modèle | ⭐⭐⭐ | moyen |
| P3.6 **Résumés proactifs** | Après grosse sortie / fin de semaine | bilan hebdo existant | ⭐⭐⭐ | moyen |

Chaque nouvelle action passe par le pattern **`pendingAction` + confirmation** existant.

---

### 🏗️ Phase 4 — Robustesse & scalabilité — **F5**

- P4.1 — Déplacer `pendingActions` (route) et `reportCache` (service) vers **DB ou Redis**
  (survie au redémarrage, multi-instance).
- P4.2 — Idempotence des actions confirmées (éviter double exécution sur retry).
- P4.3 — Dashboard d'observabilité IA : taux d'hallucination (P1.3), coût tokens, actions
  proposées/validées/annulées, intents les plus fréquents.

---

## 4. Tableau de synthèse priorisé

| Ordre | Item | Phase | Impact | Effort | Risque |
|---|---|---|---|---|---|
| 1 | Unifier le contexte | 1 | Élevé | Faible | Faible |
| 2 | Dédupliquer sécurité | 1 | Moyen | Très faible | Faible |
| 3 | Grounding check (mesure) | 1 | Élevé | Moyen | Faible |
| 4 | Tests d'intent | 1 | Moyen | Faible | Faible |
| 5 | Tool-calling natif | 2 | **Très élevé** | Élevé | Moyen |
| 6 | Mémoire de session | 2 | Élevé | Moyen | Moyen |
| 7 | Suivi objectif / fatigue | 3 | Élevé | Faible | Faible |
| 8 | Plan d'entraînement / proactif | 3 | Élevé | Moyen | Moyen |
| 9 | Persistance actions/cache | 4 | Moyen | Moyen | Moyen |

---

## 5. Risques & points d'attention

- **Coût/latence du tool-calling** : plusieurs allers-retours LLM par message →
  limiter le nombre d'itérations d'outils (ex. max 3) et cacher les résultats.
- **Sécurité du tool-calling** : le `userId` doit TOUJOURS venir du serveur (jamais
  d'un paramètre choisi par le LLM). Conserver la whitelist et la validation des params.
- **Compatibilité multi-provider** : le format `tools` diffère entre Anthropic et
  Mistral → prévoir une couche d'abstraction.
- **Non-régression** : conserver le chemin actuel derrière un flag tant que la
  migration tool-calling n'est pas validée.

---

## 6. Définition de "Terminé" par phase

- **Phase 1** : un seul contexte construit, une seule fonction de sécurité, métrique
  d'hallucination loggée, suite de tests d'intent verte.
- **Phase 2** : l'agent répond correctement à des formulations variées sans regex
  d'intent ; le cadrage n'est plus reposé deux fois ; tests de la boucle d'outils.
- **Phase 3** : ≥ 3 nouvelles capacités métier exposées via actions confirmables.
- **Phase 4** : actions/cache survivent au redémarrage ; dashboard IA disponible.

---

## 7. Prochaine action recommandée

Démarrer par **P1.1 (unification du contexte)** : meilleur ratio impact/risque,
sans dépendance, et prépare le terrain pour le tool-calling (Phase 2).
