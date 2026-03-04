# CLAUDE.md - Project Instructions

## Skill: /alors - Mode Analyse & Cadrage

**Trigger:** Toute demande commencant par "Alors" active ce skill.

Quand ce mode est active, tu DOIS suivre ce protocole strict AVANT d'ecrire la moindre ligne de code :

### 1. Mode Ask par defaut

- Passe en mode interrogatif. Tu ne produis AUCUN code tant que le cadrage n'est pas termine.
- Chaque reponse doit contenir au minimum une question de suivi, jusqu'a ce que tu aies leve toute ambiguite.

### 2. Recherche d'existant

- Avant chaque question, utilise mgrep pour chercher dans le codebase si une solution similaire ou partielle existe deja.
- Si tu trouves du code pertinent, montre-le a l'utilisateur et demande : "Ca existe deja ici, on s'en sert ? On l'adapte ? On repart de zero ?"
- Ne jamais reinventer ce qui est deja present.

### 3. Documentation entre chaque question

- Entre chaque echange, explore le codebase (fichiers, patterns, conventions) pour alimenter tes questions suivantes.
- Cite les fichiers et lignes pertinentes que tu as trouves (format `fichier:ligne`).
- Si une techno ou un pattern du projet est en jeu, verifie comment il est utilise ailleurs avant de poser ta question.

### 4. Reformulation & Analogies

- Apres chaque reponse de l'utilisateur, reformule ce que tu as compris avec tes propres mots.
- Utilise une analogie concrete ou une metaphore pour montrer que tu as saisi l'intention.
- Attends la validation explicite ("oui", "c'est ca", "exactement") avant de passer a la suite.
- Si l'utilisateur dit "non" ou corrige, reformule a nouveau jusqu'a validation.

### 5. Decoupage en features

- Une fois le cadrage termine, decompose la demande en features atomiques et independantes.
- Presente la liste sous forme de taches numerotees avec :
  - **Nom** : titre court de la feature
  - **Description** : ce qu'elle fait concretement
  - **Fichiers concernes** : les fichiers a creer ou modifier (trouves pendant l'exploration)
  - **Dependances** : si une feature doit etre faite avant une autre
- Demande validation de ce decoupage avant de commencer.

### 6. Workflow complet

```
Utilisateur: "Alors [sa demande]"
        |
        v
[1] Recherche dans le codebase (mgrep) de tout ce qui touche au sujet
        |
        v
[2] Premiere question + ce que tu as trouve d'existant
        |
        v
[3] Reponse utilisateur -> Reformulation + analogie -> Validation
        |
        v
[4] Nouvelle recherche codebase basee sur la reponse -> Question suivante
        |
        v
    (Repeter 2-3-4 jusqu'a plus d'ambiguite)
        |
        v
[5] Decoupage en features + presentation a l'utilisateur
        |
        v
[6] Validation du decoupage -> Debut de l'implementation feature par feature
```

### Regles importantes

- **JAMAIS de code avant la fin du cadrage.** Meme si la demande semble simple.
- **Minimum 3 questions** avant de considerer le cadrage comme termine, sauf si la demande est tres precise et documentee.
- Si l'utilisateur repond de facon vague, insiste avec des questions plus precises.
- Chaque question doit etre numerotee pour faciliter le suivi.
- A la fin du cadrage, resume TOUT ce qui a ete decide avant de lancer le decoupage.