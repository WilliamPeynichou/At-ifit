export const translations = {
  FR: {
    // Auth
    login: {
      title: "INITIATE SEQUENCE",
      email: "Coordonnées Email",
      password: "Code d'accès",
      enterSystem: "ENTRER DANS LE SYSTÈME",
      authenticating: "AUTHENTIFICATION...",
      noAccess: "PAS D'ACCÈS ?",
      registerId: "ENREGISTRER ID"
    },
    register: {
      title: "ENREGISTREMENT NOUVEAU PILOTE",
      email: "Coordonnées Email",
      callSign: "Nom d'appel (Optionnel)",
      accessCode: "Code d'accès",
      confirmCode: "Confirmer le code",
      joinSquadron: "REJOINDRE L'ESCADRON",
      initializing: "INITIALISATION...",
      alreadyRegistered: "DÉJÀ ENREGISTRÉ ?",
      accessSystem: "ACCÉDER AU SYSTÈME",
      country: "Pays de résidence",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères"
    },
    dashboard: {
      profile: "PROFIL PILOTE",
      bmiStatus: "STATUT IMC",
      logData: "ENREGISTRER NOUVELLES DONNÉES",
      correlation: "CORRÉLATION: POIDS vs ACTIVITÉ",
      distance: "DISTANCE",
      calories: "CALORIES",
      bpm: "BPM",
      intensity: "INTENSITÉ",
      relativeEffort: "EFFORT RELATIF",
      startDate: "DATE DE DÉBUT",
      initiation: "INITIATION",
      daysActive: "JOURS ACTIFS",
      duration: "DURÉE",
      peakWeight: "POIDS MAXIMAL",
      lowestWeight: "POIDS MINIMAL",
      completeProfile: "COMPLÉTEZ VOTRE PROFIL",
      heightWeightRequired: "Taille et poids requis",
      height: "TAILLE",
      weight: "POIDS",
      performanceMetrics: "MÉTRIQUES DE PERFORMANCE",
      totalLogs: "TOTAL ENREGISTREMENTS",
      dayDelta: "DELTA 7 JOURS",
      dayDelta30: "DELTA 30 JOURS",
      weeklyAvg: "MOYENNE HEBDOMADAIRE",
      monthlyAvg: "MOYENNE MENSUELLE",
      missionObjective: "OBJECTIF DE MISSION",
      estDaysToTarget: "TEMPS POUR L'OBJECTIF",
      gatheringData: "COLLECTE DE DONNÉES...",
      basedOnVelocity: "Basé sur votre progression actuelle",
      goalReached: "Objectif atteint !",
      wrongDirection: "Ajustez votre progression",
      weeks: "SEMAINES"
    },
    profile: {
      pilotProfile: "PROFIL PILOTE",
      callSign: "Nom d'appel",
      gender: "Genre",
      height: "Taille (cm)",
      age: "Âge",
      targetWeight: "Poids cible (kg)",
      missionGoal: "/// OBJECTIF DE MISSION",
      optional: "OPTIONNEL",
      dailyFuelTarget: "Objectif de carburant quotidien",
      calculated: "/// CALCULÉ",
      estTimeToGoal: "Temps est. vers objectif",
      projected: "/// PROJETÉ",
      updateRecords: "METTRE À JOUR LES ENREGISTREMENTS",
      country: "Pays de résidence",
      male: "Homme",
      female: "Femme",
      other: "Autre"
    },
    weightForm: {
      logNewData: "ENREGISTRER NOUVELLES DONNÉES",
      date: "Date",
      weight: "Poids (kg)",
      addEntry: "AJOUTER ENREGISTREMENT",
      error: "Échec de l'ajout du poids",
      validation: {
        required: "Veuillez remplir tous les champs",
        invalidWeight: "Le poids doit être un nombre valide supérieur à 0"
      }
    },
    onboarding: {
      title: "INITIALISATION.SEQUENCE",
      subtitle: "Complétez votre configuration pour débloquer toutes les capacités du système",
      profile: "PROFIL",
      strava: "STRAVA",
      completeProfile: "COMPLÉTEZ VOTRE PROFILE",
      profileDesc: "Entrez vos données physiques pour activer les calculs personnalisés",
      connectStrava: "CONNECTER STRAVA",
      stravaDesc: "Liez votre compte Strava pour synchroniser les activités et améliorer votre suivi",
      stravaConnected: "STRAVA CONNECTÉ",
      connectStravaBtn: "CONNECTER STRAVA",
      skipForNow: "Passer pour l'instant",
      continue: "CONTINUER",
      backToProfile: "← Retour au profil",
      skipOnboarding: "Passer l'initialisation",
      completeSetup: "TERMINER LA CONFIGURATION"
    },
    common: {
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      save: "Enregistrer",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      close: "Fermer"
    },
    stats: {
      pageTitle: "GUIDE DES STATISTIQUES",
      pageSubtitle: "Comprenez toutes les métriques affichées dans votre tableau de bord",
      backToDashboard: "Retour au tableau de bord",
      note: "Note",
      tcaWarning: {
        title: "⚠️ IMPORTANT : Dangers liés à l'obsession de perte de poids",
        intro: "Cette application est conçue pour vous aider à suivre votre poids et votre activité physique de manière saine et équilibrée. Cependant, il est essentiel d'être conscient des risques liés à une obsession de la perte de poids.",
        definition: "Les Troubles du Comportement Alimentaire (TCA) sont des maladies psychiatriques graves qui peuvent se développer lorsque la perte de poids devient une obsession. Ces troubles incluent l'anorexie mentale, la boulimie et l'hyperphagie boulimique. Ils se caractérisent par des pratiques alimentaires anormales associées à une grande souffrance psychique et peuvent avoir des conséquences graves sur la santé.",
        danger: "⚠️ Attention : Une obsession de la perte de poids peut conduire à des troubles du comportement alimentaire. Si vous remarquez des comportements compulsifs, des restrictions excessives ou une détresse psychologique liée à l'alimentation et au poids, il est essentiel de consulter un professionnel de santé.",
        learnMore: "En savoir plus sur les Troubles du Comportement Alimentaire (TCA)"
      },
      bmi: {
        title: "IMC (Indice de Masse Corporelle)",
        description: "L'IMC (Indice de Masse Corporelle) est un indicateur utilisé pour évaluer la relation entre votre poids et votre taille. Il permet d'estimer si votre poids est adapté à votre taille et d'identifier les risques potentiels pour la santé. Cette valeur est calculée automatiquement à partir de votre poids actuel et de votre taille.",
        whatIs: "Qu'est-ce que l'IMC ?",
        whatIsDesc: "L'IMC est un outil de dépistage qui permet d'évaluer le statut pondéral d'un individu. Il a été développé au 19ème siècle par le statisticien belge Adolphe Quetelet. Bien qu'il ne mesure pas directement la graisse corporelle, il fournit une estimation utile pour la plupart des adultes.",
        calculation: "IMC = Poids (kg) / Taille (m)²",
        calculationDesc: "Pour calculer votre IMC, divisez votre poids en kilogrammes par le carré de votre taille en mètres. Par exemple, si vous pesez 70 kg et mesurez 1,75 m : IMC = 70 / (1,75 × 1,75) = 70 / 3,06 = 22,9",
        genderDifferences: "Différences selon le sexe",
        genderDifferencesDesc: "Le calcul de l'IMC est identique pour les hommes et les femmes : IMC = Poids (kg) / Taille (m)². Cependant, l'interprétation peut varier selon le sexe en raison des différences de composition corporelle.\n\n• Hommes : Généralement, les hommes ont une masse musculaire plus importante et une densité osseuse plus élevée que les femmes. Pour un même IMC, un homme aura souvent moins de graisse corporelle qu'une femme.\n\n• Femmes : Les femmes ont naturellement un pourcentage de graisse corporelle plus élevé que les hommes pour un même IMC. Cela est dû aux différences hormonales et à la nécessité de maintenir des réserves énergétiques pour la reproduction.\n\n• Interprétation : Bien que les seuils d'IMC soient les mêmes pour les deux sexes (18,5-24,9 pour le poids normal), les professionnels de santé peuvent tenir compte de ces différences lors de l'évaluation. Par exemple, une femme avec un IMC de 23 peut avoir un pourcentage de graisse corporelle normal, tandis qu'un homme avec le même IMC pourrait avoir un pourcentage de graisse légèrement plus bas.\n\n• Limites : L'IMC ne distingue pas la masse grasse de la masse musculaire. Un athlète très musclé peut avoir un IMC élevé sans être en surpoids, tandis qu'une personne sédentaire avec le même IMC peut avoir un excès de graisse.",
        transgenderConsiderations: "Considérations pour les personnes transgenres",
        transgenderConsiderationsDesc: "Pour les personnes transgenres, l'interprétation de l'IMC peut nécessiter des nuances supplémentaires en raison des changements hormonaux et de la composition corporelle.\n\n• Calcul identique : Le calcul de l'IMC reste le même : IMC = Poids (kg) / Taille (m)². Il n'y a pas de formule différente.\n\n• Traitement hormonal (TH) : Les traitements hormonaux peuvent modifier la composition corporelle :\n  - TH féminisant (œstrogènes) : Peut entraîner une redistribution des graisses vers les hanches et les cuisses, une légère augmentation de la masse grasse, et une diminution potentielle de la masse musculaire.\n  - TH masculinisant (testostérone) : Peut entraîner une augmentation de la masse musculaire, une redistribution des graisses vers l'abdomen, et une augmentation de la densité osseuse.\n\n• Interprétation adaptée : Les professionnels de santé peuvent interpréter l'IMC en fonction du sexe assigné à la naissance ET du sexe de transition, en tenant compte de la durée du traitement hormonal. Après plusieurs années de TH, la composition corporelle peut se rapprocher de celle du sexe de transition.\n\n• Durée du traitement : Plus le traitement hormonal est long, plus la composition corporelle se rapproche de celle du sexe de transition. Après 2-5 ans de TH, certains professionnels utilisent les seuils d'IMC du sexe de transition.\n\n• Consultation professionnelle : Il est recommandé de consulter un professionnel de santé connaissant les spécificités de la santé transgenre pour une interprétation adaptée de l'IMC et des autres indicateurs de santé.\n\n• Limites supplémentaires : L'IMC peut être moins précis pour les personnes transgenres, notamment en période de transition, car les changements de composition corporelle peuvent être rapides et varier considérablement d'une personne à l'autre.",
        possibleValues: "Valeurs possibles",
        possibleValuesDesc: "L'IMC peut théoriquement aller de moins de 15 (dénutrition sévère) à plus de 40 (obésité morbide). Les valeurs normales se situent généralement entre 18,5 et 24,9. Cependant, l'IMC a ses limites : il ne tient pas compte de la masse musculaire, de la densité osseuse, ni de la répartition des graisses.",
        categoriesTitle: "Catégories d'IMC et leurs conséquences",
        underweight: "Insuffisance pondérale",
        underweightConsequences: "Un IMC inférieur à 18,5 peut indiquer une insuffisance pondérale. Les conséquences peuvent inclure : affaiblissement du système immunitaire, risque accru d'ostéoporose, carences nutritionnelles, fatigue chronique, troubles de la fertilité, et complications cardiaques. Il est important de consulter un professionnel de santé si votre IMC est dans cette catégorie.",
        normal: "Poids normal",
        normalConsequences: "Un IMC entre 18,5 et 24,9 est considéré comme normal. Cette catégorie est associée à un risque réduit de maladies cardiovasculaires, de diabète de type 2, et d'autres problèmes de santé liés au poids. Cependant, même dans cette catégorie, il est important de maintenir une alimentation équilibrée et une activité physique régulière.",
        overweight: "Surpoids",
        overweightConsequences: "Un IMC entre 25 et 29,9 indique un surpoids. Les conséquences peuvent inclure : risque accru de diabète de type 2, hypertension artérielle, maladies cardiovasculaires, apnée du sommeil, problèmes articulaires, et certains types de cancer. Une perte de poids modérée (5-10%) peut significativement réduire ces risques.",
        obese: "Obésité",
        obeseConsequences: "Un IMC de 30 ou plus indique une obésité. Les conséquences peuvent être graves : risque très élevé de diabète de type 2, maladies cardiovasculaires, hypertension, accidents vasculaires cérébraux, certains cancers, problèmes respiratoires, et complications articulaires. Il est fortement recommandé de consulter un professionnel de santé pour établir un plan de perte de poids adapté et sécurisé."
      },
      consequences: "Conséquences réelles",
      startDate: {
        title: "Date de Début",
        description: "La date à laquelle vous avez commencé à enregistrer votre poids dans l'application. Cette date marque le début de votre suivi."
      },
      daysActive: {
        title: "Jours Actifs",
        description: "Le nombre total de jours depuis que vous avez commencé à suivre votre poids. Cette métrique montre la durée de votre engagement dans le suivi."
      },
      peakWeight: {
        title: "Poids Maximal",
        description: "Le poids le plus élevé que vous avez enregistré depuis le début de votre suivi. Cette valeur représente votre point de départ ou votre pic de poids."
      },
      lowestWeight: {
        title: "Poids Minimal",
        description: "Le poids le plus bas que vous avez enregistré depuis le début de votre suivi. Cette valeur montre votre meilleure performance."
      },
      totalLogs: {
        title: "Total Enregistrements",
        description: "Le nombre total de fois où vous avez enregistré votre poids. Plus vous enregistrez régulièrement, plus les statistiques sont précises."
      },
      dayDelta7: {
        title: "Delta 7 Jours",
        description: "La différence de poids entre aujourd'hui et il y a 7 jours. Une valeur positive indique une prise de poids, une valeur négative une perte de poids.",
        consequences: "Consequences réelles : Une perte de poids rapide (> 1 kg/semaine) peut indiquer une perte d'eau, de muscle plutôt que de graisse, et peut être dangereuse. Une perte de poids saine se situe généralement entre 0,5 et 1 kg par semaine. Une prise de poids rapide peut indiquer une rétention d'eau, des changements hormonaux, ou une consommation excessive."
      },
      dayDelta30: {
        title: "Delta 30 Jours",
        description: "La différence de poids entre aujourd'hui et il y a 30 jours. Cette métrique donne une vue plus large de votre progression mensuelle.",
        consequences: "Consequences réelles : Une perte de poids de 2-4 kg par mois est généralement considérée comme saine et durable. Une perte plus rapide peut entraîner une perte de masse musculaire, un ralentissement du métabolisme, et des risques de carences nutritionnelles. Une prise de poids importante peut nécessiter une consultation médicale."
      },
      weeklyAvg: {
        title: "Moyenne Hebdomadaire",
        description: "La moyenne de changement de poids par semaine, calculée sur toute la période de suivi. Cette valeur projette votre tendance actuelle sur une semaine.",
        consequences: "Consequences réelles : Cette moyenne vous aide à comprendre votre rythme de progression. Une moyenne stable indique une approche durable. Des fluctuations importantes peuvent indiquer des problèmes de régularité dans votre alimentation ou votre activité physique."
      },
      monthlyAvg: {
        title: "Moyenne Mensuelle",
        description: "La moyenne de changement de poids par mois, calculée sur toute la période de suivi. Cette valeur projette votre tendance actuelle sur un mois.",
        consequences: "Consequences réelles : Cette moyenne donne une vision à long terme de votre progression. Une moyenne de 2-4 kg par mois est généralement saine. Des valeurs extrêmes peuvent indiquer des problèmes de santé ou des approches non durables nécessitant un ajustement."
      },
      daysToGoal: {
        title: "Jours Estimés vers Cible",
        description: "Le nombre estimé de jours nécessaires pour atteindre votre poids cible, basé sur votre vitesse de changement de poids actuelle.",
        note: "Cette estimation nécessite au moins 3 enregistrements de poids et un changement de poids constant."
      },
      correlation: {
        title: "Graphique de Corrélation",
        description: "Ce graphique combine votre évolution de poids (ligne) avec vos activités Strava (barres). Il permet de visualiser la relation entre votre activité physique et votre poids."
      },
      distance: {
        title: "Distance",
        description: "La distance totale parcourue lors de vos activités Strava pour chaque jour. Les barres sont empilées par type d'activité (course, vélo, natation, etc.)."
      },
      calories: {
        title: "Calories",
        description: "Le nombre total de calories brûlées lors de vos activités Strava pour chaque jour. Ces calories sont celles enregistrées par Strava lors de vos entraînements."
      },
      bpm: {
        title: "BPM (Battements par Minute)",
        description: "La fréquence cardiaque moyenne lors de vos activités Strava pour chaque jour. Cette métrique n'est disponible que si vous utilisez un moniteur de fréquence cardiaque avec Strava."
      },
      relativeEffort: {
        title: "Effort Relatif",
        description: "L'effort relatif est une métrique calculée par Strava qui quantifie l'intensité de vos activités physiques. Cette valeur est basée sur le \"suffer score\" de Strava et permet de comparer l'intensité de différentes activités, indépendamment de leur durée ou de leur type.",
        whatIs: "Qu'est-ce que l'Effort Relatif ?",
        whatIsDesc: "L'effort relatif (Relative Effort) est un score développé par Strava qui mesure l'intensité perçue de votre effort pendant une activité. Contrairement à des métriques simples comme la distance ou la durée, l'effort relatif prend en compte plusieurs facteurs pour donner une mesure normalisée de l'intensité de votre activité.",
        calculation: "Comment c'est calculé ?",
        calculationDesc: "L'effort relatif est calculé par Strava en utilisant principalement votre fréquence cardiaque (si disponible), la durée de l'activité, et l'intensité de l'effort. Le calcul prend en compte :\n• Votre fréquence cardiaque par rapport à votre fréquence cardiaque maximale\n• La durée de l'activité\n• L'intensité moyenne maintenue\n\nPlus votre fréquence cardiaque est élevée et plus l'activité dure longtemps, plus l'effort relatif sera élevé. Pour les activités sans moniteur de fréquence cardiaque, Strava utilise d'autres données comme la puissance (watts) pour le cyclisme ou le \"suffer score\" basé sur l'intensité perçue.",
        howToRead: "Comment lire les données ?",
        howToReadDesc: "L'effort relatif est cumulatif : si vous faites plusieurs activités dans la journée, les scores s'additionnent. Par exemple, une course de 50 points d'effort relatif suivie d'une séance de vélo de 30 points donnera un total de 80 points pour la journée. Cela permet de visualiser la charge d'entraînement totale de votre journée, indépendamment du type d'activité pratiquée.",
        ranges: "Valeurs et signification",
        rangesDesc: "• 0-25 : Effort léger (échauffement, récupération active)\n• 26-50 : Effort modéré (entraînement d'endurance de base)\n• 51-100 : Effort intense (entraînement par intervalles, compétition courte)\n• 101-200 : Effort très intense (compétition longue, entraînement très dur)\n• 200+ : Effort extrême (ultra-endurance, efforts maximaux prolongés)\n\nNote : Ces valeurs peuvent varier selon votre niveau de forme physique. Un effort relatif de 100 pour un athlète entraîné peut être différent de celui d'un débutant."
      },
      dailyFuel: {
        title: "Objectif d'Apport Calorique Quotidien",
        description: "Le nombre de calories que vous devriez consommer chaque jour pour atteindre votre objectif de poids. Cette valeur est calculée en fonction de votre métabolisme de base, votre niveau d'activité et votre objectif."
      },
      timeToGoal: {
        title: "Temps Estimé vers Objectif",
        description: "Le nombre estimé de semaines nécessaires pour atteindre votre poids cible, basé sur votre vitesse de changement de poids actuelle et votre objectif de calories quotidiennes."
      }
    },
    newUser: {
      profile: {
        subtitle: "Complétez votre profil pour commencer",
        targetLabel: "VOTRE OBJECTIF",
        targetDescription: "Entrez votre poids cible (objectif) en kilogrammes",
        continue: "CONTINUER"
      },
      weight: {
        subtitle: "Entrez votre poids actuel pour commencer le suivi",
        currentWeight: "POIDS ACTUEL (kg)",
        continue: "CONTINUER"
      },
      strava: {
        subtitle: "Connectez votre compte Strava pour synchroniser les activités (optionnel)",
        description: "Connectez votre compte Strava pour importer automatiquement vos activités et améliorer votre expérience de suivi.",
        connect: "CONNECTER AVEC STRAVA",
        skip: "PASSER",
        finish: "TERMINER LA CONFIGURATION",
        connected: "STRAVA CONNECTÉ",
        connectedDescription: "Votre compte Strava est connecté avec succès !"
      }
    },
    stravaStats: {
      loading: "Chargement des données Strava...",
      noActivities: "Aucune activité trouvée. Assurez-vous d'avoir des activités dans votre compte Strava.",
      fetchError: "Échec du chargement des données Strava. Assurez-vous d'être connecté.",
      connectAccount: "Connecter le compte Strava",
      disconnectConfirm: "Êtes-vous sûr de vouloir déconnecter votre compte Strava ?",
      disconnecting: "DÉCONNEXION...",
      disconnect: "DÉCONNECTER",
      title: "PROGRESSION",
      activitiesAnalyzed: "Activités analysées",
      all: "Tous",
      unknown: "Inconnu",
      globalProgression: "Progression globale (Distance cumulée)",
      progressionBySport: "Progression par sport",
      heartRateEvolution: "Évolution de la fréquence cardiaque (BPM)",
      globalProgressionTable: "Tableau de progression globale",
      sportProgressionTable: "Tableau de progression par sport",
      date: "Date",
      activity: "Activité",
      type: "Type",
      distance: "Dist (km)",
      cumulative: "Cumulé (km)",
      sportCumulative: "Cumulé sport (km)",
      selectSport: "Sélectionner un sport",
      disconnectError: "Échec de la déconnexion du compte Strava."
    }
  },
  EN: {
    // Auth
    login: {
      title: "INITIATE SEQUENCE",
      email: "Email Coordinates",
      password: "Access Code",
      enterSystem: "ENTER SYSTEM",
      authenticating: "AUTHENTICATING...",
      noAccess: "NO ACCESS ?",
      registerId: "REGISTER ID"
    },
    register: {
      title: "NEW PILOT REGISTRATION",
      email: "Email Coordinates",
      callSign: "Call Sign (Optional)",
      accessCode: "Access Code",
      confirmCode: "Confirm Code",
      joinSquadron: "JOIN SQUADRON",
      initializing: "INITIALIZING...",
      alreadyRegistered: "ALREADY REGISTERED ?",
      accessSystem: "ACCESS SYSTEM",
      country: "Country of Residence",
      passwordMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 6 characters"
    },
    dashboard: {
      profile: "PILOT PROFILE",
      bmiStatus: "BMI STATUS",
      logData: "LOG NEW DATA",
      correlation: "CORRELATION: WEIGHT vs ACTIVITY",
      distance: "DISTANCE",
      calories: "CALORIES",
      bpm: "BPM",
      intensity: "INTENSITY",
      relativeEffort: "RELATIVE EFFORT",
      startDate: "START DATE",
      initiation: "INITIATION",
      daysActive: "DAYS ACTIVE",
      duration: "DURATION",
      peakWeight: "PEAK WEIGHT",
      lowestWeight: "LOWEST WEIGHT",
      completeProfile: "COMPLETE YOUR PROFILE",
      heightWeightRequired: "Height & Weight Required",
      height: "HEIGHT",
      weight: "WEIGHT",
      performanceMetrics: "PERFORMANCE METRICS",
      totalLogs: "TOTAL LOGS",
      dayDelta: "7 DAY DELTA",
      dayDelta30: "30 DAY DELTA",
      weeklyAvg: "WEEKLY AVG",
      monthlyAvg: "MONTHLY AVG",
      missionObjective: "MISSION OBJECTIVE",
      estDaysToTarget: "TIME TO GOAL",
      gatheringData: "GATHERING DATA...",
      basedOnVelocity: "Based on your current progress",
      goalReached: "Goal reached!",
      wrongDirection: "Adjust your progress",
      weeks: "WEEKS"
    },
    profile: {
      pilotProfile: "PILOT PROFILE",
      callSign: "Call Sign",
      gender: "Gender",
      height: "Height (cm)",
      age: "Age",
      targetWeight: "Target Weight (kg)",
      missionGoal: "/// MISSION GOAL",
      optional: "OPTIONAL",
      dailyFuelTarget: "Daily Fuel Target",
      calculated: "/// CALCULATED",
      estTimeToGoal: "Est. Time to Goal",
      projected: "/// PROJECTED",
      updateRecords: "UPDATE RECORDS",
      country: "Country of Residence",
      male: "Male",
      female: "Female",
      other: "Other"
    },
    weightForm: {
      logNewData: "LOG NEW DATA",
      date: "Date",
      weight: "Weight (kg)",
      addEntry: "ADD ENTRY",
      error: "Failed to add weight",
      validation: {
        required: "Please fill all fields",
        invalidWeight: "Weight must be a valid number greater than 0"
      }
    },
    onboarding: {
      title: "INITIALIZATION.SEQUENCE",
      subtitle: "Complete your setup to unlock full system capabilities",
      profile: "PROFILE",
      strava: "STRAVA",
      completeProfile: "COMPLETE YOUR PROFILE",
      profileDesc: "Enter your physical data to enable personalized calculations",
      connectStrava: "CONNECT STRAVA",
      stravaDesc: "Link your Strava account to sync activities and enhance your tracking",
      stravaConnected: "STRAVA CONNECTED",
      connectStravaBtn: "CONNECT STRAVA",
      skipForNow: "Skip for now",
      continue: "CONTINUE",
      backToProfile: "← Back to Profile",
      skipOnboarding: "Skip onboarding",
      completeSetup: "COMPLETE SETUP"
    },
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      close: "Close"
    },
    stats: {
      pageTitle: "STATISTICS GUIDE",
      pageSubtitle: "Understand all the metrics displayed in your dashboard",
      backToDashboard: "Back to Dashboard",
      note: "Note",
      tcaWarning: {
        title: "⚠️ IMPORTANT: Dangers of Weight Loss Obsession",
        intro: "This application is designed to help you track your weight and physical activity in a healthy and balanced way. However, it is essential to be aware of the risks associated with an obsession with weight loss.",
        definition: "Eating Disorders (TCA - Troubles du Comportement Alimentaire) are serious psychiatric conditions that can develop when weight loss becomes an obsession. These disorders include anorexia nervosa, bulimia, and binge eating disorder. They are characterized by abnormal eating behaviors associated with significant psychological distress and can have serious health consequences.",
        danger: "⚠️ Warning: An obsession with weight loss can lead to eating disorders. If you notice compulsive behaviors, excessive restrictions, or psychological distress related to food and weight, it is essential to consult a healthcare professional.",
        learnMore: "Learn more about Eating Disorders (TCA)"
      },
      bmi: {
        title: "BMI (Body Mass Index)",
        description: "BMI (Body Mass Index) is an indicator used to assess the relationship between your weight and height. It helps estimate if your weight is appropriate for your height and identify potential health risks. This value is automatically calculated from your current weight and height.",
        whatIs: "What is BMI?",
        whatIsDesc: "BMI is a screening tool that allows assessment of an individual's weight status. It was developed in the 19th century by Belgian statistician Adolphe Quetelet. Although it does not directly measure body fat, it provides a useful estimate for most adults.",
        calculation: "BMI = Weight (kg) / Height (m)²",
        calculationDesc: "To calculate your BMI, divide your weight in kilograms by the square of your height in meters. For example, if you weigh 70 kg and are 1.75 m tall: BMI = 70 / (1.75 × 1.75) = 70 / 3.06 = 22.9",
        genderDifferences: "Differences by gender",
        genderDifferencesDesc: "The BMI calculation is identical for men and women: BMI = Weight (kg) / Height (m)². However, interpretation may vary by gender due to differences in body composition.\n\n• Men: Generally, men have greater muscle mass and higher bone density than women. For the same BMI, a man will often have less body fat than a woman.\n\n• Women: Women naturally have a higher percentage of body fat than men for the same BMI. This is due to hormonal differences and the need to maintain energy reserves for reproduction.\n\n• Interpretation: Although BMI thresholds are the same for both sexes (18.5-24.9 for normal weight), healthcare professionals may take these differences into account during evaluation. For example, a woman with a BMI of 23 may have a normal body fat percentage, while a man with the same BMI might have a slightly lower body fat percentage.\n\n• Limitations: BMI does not distinguish between fat mass and muscle mass. A very muscular athlete may have a high BMI without being overweight, while a sedentary person with the same BMI may have excess fat.",
        transgenderConsiderations: "Considerations for transgender individuals",
        transgenderConsiderationsDesc: "For transgender individuals, BMI interpretation may require additional nuances due to hormonal changes and body composition shifts.\n\n• Same calculation: The BMI calculation remains the same: BMI = Weight (kg) / Height (m)². There is no different formula.\n\n• Hormone therapy (HT): Hormone treatments can modify body composition:\n  - Feminizing HT (estrogens): May lead to fat redistribution to hips and thighs, slight increase in fat mass, and potential decrease in muscle mass.\n  - Masculinizing HT (testosterone): May lead to increased muscle mass, fat redistribution to abdomen, and increased bone density.\n\n• Adapted interpretation: Healthcare professionals may interpret BMI based on both assigned sex at birth AND transitioned gender, taking into account the duration of hormone therapy. After several years of HT, body composition may approach that of the transitioned gender.\n\n• Treatment duration: The longer the hormone therapy, the more body composition approaches that of the transitioned gender. After 2-5 years of HT, some professionals use BMI thresholds of the transitioned gender.\n\n• Professional consultation: It is recommended to consult a healthcare professional knowledgeable about transgender health specifics for an adapted interpretation of BMI and other health indicators.\n\n• Additional limitations: BMI may be less accurate for transgender individuals, especially during transition, as body composition changes can be rapid and vary considerably from person to person.",
        possibleValues: "Possible values",
        possibleValuesDesc: "BMI can theoretically range from less than 15 (severe malnutrition) to more than 40 (morbid obesity). Normal values are generally between 18.5 and 24.9. However, BMI has its limitations: it does not account for muscle mass, bone density, or fat distribution.",
        categoriesTitle: "BMI categories and their consequences",
        underweight: "Underweight",
        underweightConsequences: "A BMI below 18.5 may indicate underweight. Consequences can include: weakened immune system, increased risk of osteoporosis, nutritional deficiencies, chronic fatigue, fertility issues, and cardiac complications. It is important to consult a healthcare professional if your BMI is in this category.",
        normal: "Normal",
        normalConsequences: "A BMI between 18.5 and 24.9 is considered normal. This category is associated with reduced risk of cardiovascular disease, type 2 diabetes, and other weight-related health problems. However, even in this category, it is important to maintain a balanced diet and regular physical activity.",
        overweight: "Overweight",
        overweightConsequences: "A BMI between 25 and 29.9 indicates overweight. Consequences can include: increased risk of type 2 diabetes, high blood pressure, cardiovascular disease, sleep apnea, joint problems, and certain types of cancer. Moderate weight loss (5-10%) can significantly reduce these risks.",
        obese: "Obese",
        obeseConsequences: "A BMI of 30 or more indicates obesity. Consequences can be serious: very high risk of type 2 diabetes, cardiovascular disease, hypertension, stroke, certain cancers, respiratory problems, and joint complications. It is strongly recommended to consult a healthcare professional to establish an appropriate and safe weight loss plan."
      },
      consequences: "Real consequences",
      startDate: {
        title: "Start Date",
        description: "The date when you started logging your weight in the application. This date marks the beginning of your tracking journey."
      },
      daysActive: {
        title: "Days Active",
        description: "The total number of days since you started tracking your weight. This metric shows the duration of your commitment to tracking."
      },
      peakWeight: {
        title: "Peak Weight",
        description: "The highest weight you have recorded since the start of your tracking. This value represents your starting point or weight peak."
      },
      lowestWeight: {
        title: "Lowest Weight",
        description: "The lowest weight you have recorded since the start of your tracking. This value shows your best performance."
      },
      totalLogs: {
        title: "Total Logs",
        description: "The total number of times you have recorded your weight. The more regularly you log, the more accurate the statistics become."
      },
      dayDelta7: {
        title: "7 Day Delta",
        description: "The weight difference between today and 7 days ago. A positive value indicates weight gain, a negative value indicates weight loss.",
        consequences: "Real consequences: Rapid weight loss (> 1 kg/week) may indicate water or muscle loss rather than fat loss, and can be dangerous. Healthy weight loss is generally between 0.5 and 1 kg per week. Rapid weight gain may indicate water retention, hormonal changes, or excessive consumption."
      },
      dayDelta30: {
        title: "30 Day Delta",
        description: "The weight difference between today and 30 days ago. This metric provides a broader view of your monthly progress.",
        consequences: "Real consequences: Weight loss of 2-4 kg per month is generally considered healthy and sustainable. Faster loss can lead to muscle mass loss, slowed metabolism, and risks of nutritional deficiencies. Significant weight gain may require medical consultation."
      },
      weeklyAvg: {
        title: "Weekly Average",
        description: "The average weight change per week, calculated over your entire tracking period. This value projects your current trend over a week.",
        consequences: "Real consequences: This average helps you understand your progression rate. A stable average indicates a sustainable approach. Significant fluctuations may indicate problems with consistency in your diet or physical activity."
      },
      monthlyAvg: {
        title: "Monthly Average",
        description: "The average weight change per month, calculated over your entire tracking period. This value projects your current trend over a month.",
        consequences: "Real consequences: This average provides a long-term view of your progress. An average of 2-4 kg per month is generally healthy. Extreme values may indicate health problems or unsustainable approaches requiring adjustment."
      },
      daysToGoal: {
        title: "Estimated Days to Target",
        description: "The estimated number of days needed to reach your target weight, based on your current rate of weight change.",
        note: "This estimation requires at least 3 weight logs and a constant weight change."
      },
      correlation: {
        title: "Correlation Chart",
        description: "This chart combines your weight evolution (line) with your Strava activities (bars). It allows you to visualize the relationship between your physical activity and your weight."
      },
      distance: {
        title: "Distance",
        description: "The total distance covered during your Strava activities for each day. Bars are stacked by activity type (run, ride, swim, etc.)."
      },
      calories: {
        title: "Calories",
        description: "The total number of calories burned during your Strava activities for each day. These calories are those recorded by Strava during your workouts."
      },
      bpm: {
        title: "BPM (Beats Per Minute)",
        description: "The average heart rate during your Strava activities for each day. This metric is only available if you use a heart rate monitor with Strava."
      },
      relativeEffort: {
        title: "Relative Effort",
        description: "Relative Effort is a metric calculated by Strava that quantifies the intensity of your physical activities. This value is based on Strava's \"suffer score\" and allows you to compare the intensity of different activities, regardless of their duration or type.",
        whatIs: "What is Relative Effort?",
        whatIsDesc: "Relative Effort is a score developed by Strava that measures the perceived intensity of your effort during an activity. Unlike simple metrics like distance or duration, Relative Effort takes into account several factors to provide a normalized measure of your activity's intensity.",
        calculation: "How is it calculated?",
        calculationDesc: "Relative Effort is calculated by Strava primarily using your heart rate (if available), activity duration, and effort intensity. The calculation takes into account:\n• Your heart rate relative to your maximum heart rate\n• Activity duration\n• Average intensity maintained\n\nThe higher your heart rate and the longer the activity lasts, the higher the Relative Effort will be. For activities without a heart rate monitor, Strava uses other data such as power (watts) for cycling or \"suffer score\" based on perceived intensity.",
        howToRead: "How to read the data?",
        howToReadDesc: "Relative Effort is cumulative: if you do multiple activities in a day, the scores add up. For example, a run of 50 Relative Effort points followed by a bike session of 30 points will give a total of 80 points for the day. This allows you to visualize the total training load of your day, regardless of the type of activity performed.",
        ranges: "Values and meaning",
        rangesDesc: "• 0-25: Light effort (warm-up, active recovery)\n• 26-50: Moderate effort (base endurance training)\n• 51-100: Intense effort (interval training, short competition)\n• 101-200: Very intense effort (long competition, very hard training)\n• 200+: Extreme effort (ultra-endurance, prolonged maximal efforts)\n\nNote: These values may vary depending on your fitness level. A Relative Effort of 100 for a trained athlete may be different from that of a beginner."
      },
      dailyFuel: {
        title: "Daily Fuel Target",
        description: "The number of calories you should consume each day to reach your weight goal. This value is calculated based on your basal metabolism, activity level, and goal."
      },
      timeToGoal: {
        title: "Estimated Time to Goal",
        description: "The estimated number of weeks needed to reach your target weight, based on your current rate of weight change and your daily calorie goal."
      }
    },
    newUser: {
      profile: {
        subtitle: "Complete your profile to get started",
        targetLabel: "YOUR GOAL",
        targetDescription: "Enter your target weight goal in kilograms",
        continue: "CONTINUE"
      },
      weight: {
        subtitle: "Enter your current weight to start tracking",
        currentWeight: "CURRENT WEIGHT (kg)",
        continue: "CONTINUE"
      },
      strava: {
        subtitle: "Connect your Strava account to sync activities (optional)",
        description: "Connect your Strava account to automatically import your activities and enhance your tracking experience.",
        connect: "CONNECT WITH STRAVA",
        skip: "SKIP",
        finish: "FINISH SETUP",
        connected: "STRAVA CONNECTED",
        connectedDescription: "Your Strava account is successfully connected!"
      }
    },
    stravaStats: {
      loading: "Loading Strava data...",
      noActivities: "No activities found. Make sure you have activities in your Strava account.",
      fetchError: "Failed to fetch Strava data. Make sure you are connected.",
      connectAccount: "Connect Strava Account",
      disconnectConfirm: "Are you sure you want to disconnect your Strava account?",
      disconnecting: "DISCONNECTING...",
      disconnect: "DISCONNECT",
      title: "PROGRESSION",
      activitiesAnalyzed: "Activities Analyzed",
      all: "All",
      unknown: "Unknown",
      globalProgression: "Global Progression (Cumulative Distance)",
      progressionBySport: "Progression by Sport",
      heartRateEvolution: "Heart Rate Evolution (BPM)",
      globalProgressionTable: "Global Progression Table",
      sportProgressionTable: "Sport Progression Table",
      date: "Date",
      activity: "Activity",
      type: "Type",
      distance: "Dist (km)",
      cumulative: "Cumulative (km)",
      sportCumulative: "Sport Cumulative (km)",
      selectSport: "Select a sport",
      disconnectError: "Failed to disconnect Strava account."
    }
  },
  IT: {
    // Auth
    login: {
      title: "INIZIA SEQUENZA",
      email: "Coordinate Email",
      password: "Codice di Accesso",
      enterSystem: "ENTRA NEL SISTEMA",
      authenticating: "AUTENTICAZIONE...",
      noAccess: "NESSUN ACCESSO ?",
      registerId: "REGISTRA ID"
    },
    register: {
      title: "REGISTRAZIONE NUOVO PILOTA",
      email: "Coordinate Email",
      callSign: "Nome di Battaglia (Opzionale)",
      accessCode: "Codice di Accesso",
      confirmCode: "Conferma Codice",
      joinSquadron: "UNISCITI ALLO SQUADRONE",
      initializing: "INIZIALIZZAZIONE...",
      alreadyRegistered: "GIÀ REGISTRATO ?",
      accessSystem: "ACCEDI AL SISTEMA",
      country: "Paese di Residenza",
      passwordMismatch: "Le password non corrispondono",
      passwordTooShort: "La password deve contenere almeno 6 caratteri"
    },
    dashboard: {
      profile: "PROFILO PILOTA",
      bmiStatus: "STATO BMI",
      logData: "REGISTRA NUOVI DATI",
      correlation: "CORRELAZIONE: PESO vs ATTIVITÀ",
      distance: "DISTANZA",
      calories: "CALORIE",
      bpm: "BPM",
      startDate: "DATA DI INIZIO",
      initiation: "INIZIAZIONE",
      daysActive: "GIORNI ATTIVI",
      duration: "DURATA",
      peakWeight: "PESO MASSIMO",
      lowestWeight: "PESO MINIMO",
      completeProfile: "COMPLETA IL TUO PROFILO",
      heightWeightRequired: "Altezza e peso richiesti",
      height: "ALTEZZA",
      weight: "PESO",
      performanceMetrics: "METRICHE DI PRESTAZIONE",
      totalLogs: "TOTALE REGISTRAZIONI",
      dayDelta: "DELTA 7 GIORNI",
      dayDelta30: "DELTA 30 GIORNI",
      weeklyAvg: "MEDIA SETTIMANALE",
      monthlyAvg: "MEDIA MENSILE",
      missionObjective: "OBIETTIVO MISSIONE",
      estDaysToTarget: "TEMPO PER L'OBIETTIVO",
      gatheringData: "RACCOLTA DATI...",
      basedOnVelocity: "Basato sui tuoi progressi attuali",
      goalReached: "Obiettivo raggiunto!",
      wrongDirection: "Regola i tuoi progressi",
      weeks: "SETTIMANE"
    },
    profile: {
      pilotProfile: "PROFILO PILOTA",
      callSign: "Nome di Battaglia",
      gender: "Genere",
      height: "Altezza (cm)",
      age: "Età",
      targetWeight: "Peso Obiettivo (kg)",
      missionGoal: "/// OBIETTIVO MISSIONE",
      optional: "OPZIONALE",
      dailyFuelTarget: "Obiettivo Carburante Giornaliero",
      calculated: "/// CALCOLATO",
      estTimeToGoal: "Tempo Stim. all'Obiettivo",
      projected: "/// PROIETTATO",
      updateRecords: "AGGIORNA REGISTRI",
      country: "Paese di Residenza",
      male: "Maschio",
      female: "Femmina",
      other: "Altro"
    },
    weightForm: {
      logNewData: "REGISTRA NUOVI DATI",
      date: "Data",
      weight: "Peso (kg)",
      addEntry: "AGGIUNGI REGISTRAZIONE",
      error: "Impossibile aggiungere il peso",
      validation: {
        required: "Compila tutti i campi",
        invalidWeight: "Il peso deve essere un numero valido maggiore di 0"
      }
    },
    onboarding: {
      title: "INIZIALIZZAZIONE.SEQUENZA",
      subtitle: "Completa la configurazione per sbloccare tutte le capacità del sistema",
      profile: "PROFILO",
      strava: "STRAVA",
      completeProfile: "COMPLETA IL TUO PROFILO",
      profileDesc: "Inserisci i tuoi dati fisici per abilitare calcoli personalizzati",
      connectStrava: "COLLEGA STRAVA",
      stravaDesc: "Collega il tuo account Strava per sincronizzare le attività e migliorare il monitoraggio",
      stravaConnected: "STRAVA COLLEGATO",
      connectStravaBtn: "COLLEGA STRAVA",
      skipForNow: "Salta per ora",
      continue: "CONTINUA",
      backToProfile: "← Torna al Profilo",
      skipOnboarding: "Salta inizializzazione",
      completeSetup: "COMPLETA CONFIGURAZIONE"
    },
    common: {
      loading: "Caricamento...",
      error: "Errore",
      success: "Successo",
      save: "Salva",
      cancel: "Annulla",
      delete: "Elimina",
      edit: "Modifica",
      close: "Chiudi"
    },
    stats: {
      pageTitle: "GUIDA ALLE STATISTICHE",
      pageSubtitle: "Comprendi tutte le metriche visualizzate nella tua dashboard",
      backToDashboard: "Torna alla Dashboard",
      note: "Nota",
      bmi: {
        title: "BMI (Indice di Massa Corporea)",
        description: "Il BMI è una misura del tuo peso rispetto alla tua altezza. Aiuta a valutare se il tuo peso è appropriato per la tua altezza. Questo valore viene calcolato automaticamente dal tuo peso attuale e altezza.",
        calculation: "BMI = Peso (kg) / Altezza (m)²",
        underweight: "Sottopeso",
        normal: "Normale",
        overweight: "Sovrappeso",
        obese: "Obeso"
      },
      startDate: {
        title: "Data di Inizio",
        description: "La data in cui hai iniziato a registrare il tuo peso nell'applicazione. Questa data segna l'inizio del tuo percorso di monitoraggio."
      },
      daysActive: {
        title: "Giorni Attivi",
        description: "Il numero totale di giorni da quando hai iniziato a monitorare il tuo peso. Questa metrica mostra la durata del tuo impegno nel monitoraggio."
      },
      peakWeight: {
        title: "Peso Massimo",
        description: "Il peso più alto che hai registrato dall'inizio del monitoraggio. Questo valore rappresenta il tuo punto di partenza o picco di peso."
      },
      lowestWeight: {
        title: "Peso Minimo",
        description: "Il peso più basso che hai registrato dall'inizio del monitoraggio. Questo valore mostra la tua migliore performance."
      },
      totalLogs: {
        title: "Totale Registrazioni",
        description: "Il numero totale di volte in cui hai registrato il tuo peso. Più registri regolarmente, più accurate diventano le statistiche."
      },
      dayDelta7: {
        title: "Delta 7 Giorni",
        description: "La differenza di peso tra oggi e 7 giorni fa. Un valore positivo indica un aumento di peso, un valore negativo una perdita di peso."
      },
      dayDelta30: {
        title: "Delta 30 Giorni",
        description: "La differenza di peso tra oggi e 30 giorni fa. Questa metrica fornisce una visione più ampia del tuo progresso mensile."
      },
      weeklyAvg: {
        title: "Media Settimanale",
        description: "La media del cambiamento di peso per settimana, calcolata su tutto il periodo di monitoraggio. Questo valore proietta la tua tendenza attuale su una settimana."
      },
      monthlyAvg: {
        title: "Media Mensile",
        description: "La media del cambiamento di peso per mese, calcolata su tutto il periodo di monitoraggio. Questo valore proietta la tua tendenza attuale su un mese."
      },
      daysToGoal: {
        title: "Giorni Stimati all'Obiettivo",
        description: "Il numero stimato di giorni necessari per raggiungere il tuo peso obiettivo, basato sulla tua velocità attuale di cambiamento del peso.",
        note: "Questa stima richiede almeno 3 registrazioni di peso e un cambiamento di peso costante."
      },
      correlation: {
        title: "Grafico di Correlazione",
        description: "Questo grafico combina la tua evoluzione del peso (linea) con le tue attività Strava (barre). Ti permette di visualizzare la relazione tra la tua attività fisica e il tuo peso."
      },
      distance: {
        title: "Distanza",
        description: "La distanza totale percorsa durante le tue attività Strava per ogni giorno. Le barre sono impilate per tipo di attività (corsa, bici, nuoto, ecc.)."
      },
      calories: {
        title: "Calorie",
        description: "Il numero totale di calorie bruciate durante le tue attività Strava per ogni giorno. Queste calorie sono quelle registrate da Strava durante i tuoi allenamenti."
      },
      bpm: {
        title: "BPM (Battiti al Minuto)",
        description: "La frequenza cardiaca media durante le tue attività Strava per ogni giorno. Questa metrica è disponibile solo se usi un monitor della frequenza cardiaca con Strava."
      },
      dailyFuel: {
        title: "Obiettivo Carburante Giornaliero",
        description: "Il numero di calorie che dovresti consumare ogni giorno per raggiungere il tuo obiettivo di peso. Questo valore è calcolato in base al tuo metabolismo basale, livello di attività e obiettivo."
      },
      timeToGoal: {
        title: "Tempo Stimato all'Obiettivo",
        description: "Il numero stimato di settimane necessarie per raggiungere il tuo peso obiettivo, basato sulla tua velocità attuale di cambiamento del peso e il tuo obiettivo calorico giornaliero."
      }
    },
    newUser: {
      profile: {
        subtitle: "Completa il tuo profilo per iniziare",
        targetLabel: "IL TUO OBIETTIVO",
        targetDescription: "Inserisci il tuo peso obiettivo in chilogrammi",
        continue: "CONTINUA"
      },
      weight: {
        subtitle: "Inserisci il tuo peso attuale per iniziare il monitoraggio",
        currentWeight: "PESO ATTUALE (kg)",
        continue: "CONTINUA"
      },
      strava: {
        subtitle: "Collega il tuo account Strava per sincronizzare le attività (opzionale)",
        description: "Collega il tuo account Strava per importare automaticamente le tue attività e migliorare la tua esperienza di monitoraggio.",
        connect: "COLLEGA CON STRAVA",
        skip: "SALTA",
        finish: "COMPLETA CONFIGURAZIONE",
        connected: "STRAVA COLLEGATO",
        connectedDescription: "Il tuo account Strava è collegato con successo!"
      }
    },
    stravaStats: {
      loading: "Caricamento dati Strava...",
      noActivities: "Nessuna attività trovata. Assicurati di avere attività nel tuo account Strava.",
      fetchError: "Impossibile recuperare i dati Strava. Assicurati di essere connesso.",
      connectAccount: "Collega account Strava",
      disconnectConfirm: "Sei sicuro di voler disconnettere il tuo account Strava?",
      disconnecting: "DISCONNESSIONE...",
      disconnect: "DISCONNETTI",
      title: "PROGRESSIONE",
      activitiesAnalyzed: "Attività analizzate",
      all: "Tutti",
      unknown: "Sconosciuto",
      globalProgression: "Progressione globale (Distanza cumulativa)",
      progressionBySport: "Progressione per sport",
      heartRateEvolution: "Evoluzione frequenza cardiaca (BPM)",
      globalProgressionTable: "Tabella progressione globale",
      sportProgressionTable: "Tabella progressione per sport",
      date: "Data",
      activity: "Attività",
      type: "Tipo",
      distance: "Dist (km)",
      cumulative: "Cumulativo (km)",
      sportCumulative: "Cumulativo sport (km)",
      selectSport: "Seleziona uno sport",
      disconnectError: "Impossibile disconnettere l'account Strava."
    }
  },
  TR: {
    // Auth
    login: {
      title: "SIRAYI BAŞLAT",
      email: "E-posta Koordinatları",
      password: "Erişim Kodu",
      enterSystem: "SİSTEME GİR",
      authenticating: "KİMLİK DOĞRULAMA...",
      noAccess: "ERİŞİM YOK MU ?",
      registerId: "KAYIT KİMLİĞİ"
    },
    register: {
      title: "YENİ PİLOT KAYDI",
      email: "E-posta Koordinatları",
      callSign: "Çağrı İşareti (İsteğe Bağlı)",
      accessCode: "Erişim Kodu",
      confirmCode: "Kodu Onayla",
      joinSquadron: "FİLOYA KATIL",
      initializing: "BAŞLATILIYOR...",
      alreadyRegistered: "ZATEN KAYITLI MI ?",
      accessSystem: "SİSTEME ERİŞ",
      country: "İkamet Ülkesi",
      passwordMismatch: "Şifreler eşleşmiyor",
      passwordTooShort: "Şifre en az 6 karakter olmalıdır"
    },
    dashboard: {
      profile: "PİLOT PROFİLİ",
      bmiStatus: "BMI DURUMU",
      logData: "YENİ VERİ KAYDET",
      correlation: "KORELASYON: KİLO vs AKTİVİTE",
      distance: "MESAFE",
      calories: "KALORİ",
      bpm: "BPM",
      startDate: "BAŞLANGIÇ TARİHİ",
      initiation: "BAŞLATMA",
      daysActive: "AKTİF GÜNLER",
      duration: "SÜRE",
      peakWeight: "EN YÜKSEK KİLO",
      lowestWeight: "EN DÜŞÜK KİLO",
      completeProfile: "PROFİLİNİZİ TAMAMLAYIN",
      heightWeightRequired: "Boy ve kilo gerekli",
      height: "BOY",
      weight: "KİLO",
      performanceMetrics: "PERFORMANS METRİKLERİ",
      totalLogs: "TOPLAM KAYIT",
      dayDelta: "7 GÜN DELTA",
      dayDelta30: "30 GÜN DELTA",
      weeklyAvg: "HAFTALIK ORTALAMA",
      monthlyAvg: "AYLIK ORTALAMA",
      missionObjective: "GÖREV HEDEFİ",
      estDaysToTarget: "HEDEFE SÜRE",
      gatheringData: "VERİ TOPLANIYOR...",
      basedOnVelocity: "Mevcut ilerlemenize göre",
      goalReached: "Hedef ulaşıldı!",
      wrongDirection: "İlerlemenizi ayarlayın",
      weeks: "HAFTA"
    },
    profile: {
      pilotProfile: "PİLOT PROFİLİ",
      callSign: "Çağrı İşareti",
      gender: "Cinsiyet",
      height: "Boy (cm)",
      age: "Yaş",
      targetWeight: "Hedef Kilo (kg)",
      missionGoal: "/// GÖREV HEDEFİ",
      optional: "İSTEĞE BAĞLI",
      dailyFuelTarget: "Günlük Yakıt Hedefi",
      calculated: "/// HESAPLANDI",
      estTimeToGoal: "Hedefe Tahmini Süre",
      projected: "/// TAHMİN EDİLDİ",
      updateRecords: "KAYITLARI GÜNCELLE",
      country: "İkamet Ülkesi",
      male: "Erkek",
      female: "Kadın",
      other: "Diğer"
    },
    weightForm: {
      logNewData: "YENİ VERİ KAYDET",
      date: "Tarih",
      weight: "Kilo (kg)",
      addEntry: "KAYIT EKLE",
      error: "Kilo eklenemedi",
      validation: {
        required: "Lütfen tüm alanları doldurun",
        invalidWeight: "Kilo 0'dan büyük geçerli bir sayı olmalıdır"
      }
    },
    onboarding: {
      title: "BAŞLATMA.SIRASI",
      subtitle: "Sistemin tüm yeteneklerini açmak için kurulumunuzu tamamlayın",
      profile: "PROFİL",
      strava: "STRAVA",
      completeProfile: "PROFİLİNİZİ TAMAMLAYIN",
      profileDesc: "Kişiselleştirilmiş hesaplamaları etkinleştirmek için fiziksel verilerinizi girin",
      connectStrava: "STRAVA BAĞLA",
      stravaDesc: "Aktiviteleri senkronize etmek ve takibinizi geliştirmek için Strava hesabınızı bağlayın",
      stravaConnected: "STRAVA BAĞLANDI",
      connectStravaBtn: "STRAVA BAĞLA",
      skipForNow: "Şimdilik atla",
      continue: "DEVAM ET",
      backToProfile: "← Profile Dön",
      skipOnboarding: "Başlatmayı atla",
      completeSetup: "KURULUMU TAMAMLA"
    },
    common: {
      loading: "Yükleniyor...",
      error: "Hata",
      success: "Başarılı",
      save: "Kaydet",
      cancel: "İptal",
      delete: "Sil",
      edit: "Düzenle",
      close: "Kapat"
    },
    stats: {
      pageTitle: "İSTATİSTİK REHBERİ",
      pageSubtitle: "Dashboard'unuzda görüntülenen tüm metrikleri anlayın",
      backToDashboard: "Dashboard'a Dön",
      note: "Not",
      bmi: {
        title: "BMI (Vücut Kitle İndeksi)",
        description: "BMI, boyunuza göre kilonuzun bir ölçüsüdür. Kilonuzun boyunuza uygun olup olmadığını değerlendirmenize yardımcı olur. Bu değer mevcut kilonuz ve boyunuzdan otomatik olarak hesaplanır.",
        calculation: "BMI = Kilo (kg) / Boy (m)²",
        underweight: "Zayıf",
        normal: "Normal",
        overweight: "Fazla Kilolu",
        obese: "Obez"
      },
      startDate: {
        title: "Başlangıç Tarihi",
        description: "Uygulamada kilonuzu kaydetmeye başladığınız tarih. Bu tarih takip yolculuğunuzun başlangıcını işaretler."
      },
      daysActive: {
        title: "Aktif Günler",
        description: "Kilonuzu takip etmeye başladığınızdan beri geçen toplam gün sayısı. Bu metrik takipteki bağlılığınızın süresini gösterir."
      },
      peakWeight: {
        title: "En Yüksek Kilo",
        description: "Takibe başladığınızdan beri kaydettiğiniz en yüksek kilo. Bu değer başlangıç noktanızı veya kilo zirvenizi temsil eder."
      },
      lowestWeight: {
        title: "En Düşük Kilo",
        description: "Takibe başladığınızdan beri kaydettiğiniz en düşük kilo. Bu değer en iyi performansınızı gösterir."
      },
      totalLogs: {
        title: "Toplam Kayıt",
        description: "Kilonuzu kaydettiğiniz toplam sayı. Ne kadar düzenli kayıt yaparsanız, istatistikler o kadar doğru olur."
      },
      dayDelta7: {
        title: "7 Gün Delta",
        description: "Bugün ile 7 gün önce arasındaki kilo farkı. Pozitif bir değer kilo alımını, negatif bir değer kilo kaybını gösterir."
      },
      dayDelta30: {
        title: "30 Gün Delta",
        description: "Bugün ile 30 gün önce arasındaki kilo farkı. Bu metrik aylık ilerlemenizin daha geniş bir görünümünü sağlar."
      },
      weeklyAvg: {
        title: "Haftalık Ortalama",
        description: "Tüm takip döneminiz boyunca hesaplanan haftalık ortalama kilo değişimi. Bu değer mevcut eğiliminizi bir hafta boyunca yansıtır."
      },
      monthlyAvg: {
        title: "Aylık Ortalama",
        description: "Tüm takip döneminiz boyunca hesaplanan aylık ortalama kilo değişimi. Bu değer mevcut eğiliminizi bir ay boyunca yansıtır."
      },
      daysToGoal: {
        title: "Hedefe Tahmini Günler",
        description: "Hedef kilonuza ulaşmak için gereken tahmini gün sayısı, mevcut kilo değişim hızınıza dayanarak.",
        note: "Bu tahmin en az 3 kilo kaydı ve sabit bir kilo değişimi gerektirir."
      },
      correlation: {
        title: "Korelasyon Grafiği",
        description: "Bu grafik kilo evriminizi (çizgi) Strava aktivitelerinizle (çubuklar) birleştirir. Fiziksel aktiviteniz ile kilonuz arasındaki ilişkiyi görselleştirmenize olanak tanır."
      },
      distance: {
        title: "Mesafe",
        description: "Her gün için Strava aktiviteleriniz sırasında kat ettiğiniz toplam mesafe. Çubuklar aktivite tipine göre yığılmıştır (koşu, bisiklet, yüzme, vb.)."
      },
      calories: {
        title: "Kalori",
        description: "Her gün için Strava aktiviteleriniz sırasında yakılan toplam kalori sayısı. Bu kaloriler antrenmanlarınız sırasında Strava tarafından kaydedilenlerdir."
      },
      bpm: {
        title: "BPM (Dakikadaki Atış)",
        description: "Her gün için Strava aktiviteleriniz sırasındaki ortalama kalp atış hızı. Bu metrik yalnızca Strava ile kalp atış hızı monitörü kullanıyorsanız kullanılabilir."
      },
      dailyFuel: {
        title: "Günlük Yakıt Hedefi",
        description: "Kilo hedefinize ulaşmak için her gün tüketmeniz gereken kalori sayısı. Bu değer bazal metabolizmanız, aktivite seviyeniz ve hedefinize dayanarak hesaplanır."
      },
      timeToGoal: {
        title: "Hedefe Tahmini Süre",
        description: "Hedef kilonuza ulaşmak için gereken tahmini hafta sayısı, mevcut kilo değişim hızınıza ve günlük kalori hedefinize dayanarak."
      }
    },
    newUser: {
      profile: {
        subtitle: "Başlamak için profilinizi tamamlayın",
        targetLabel: "HEDEFİNİZ",
        targetDescription: "Hedef kilonuzu kilogram cinsinden girin",
        continue: "DEVAM ET"
      },
      weight: {
        subtitle: "Takibe başlamak için mevcut kilonuzu girin",
        currentWeight: "MEVCUT KİLO (kg)",
        continue: "DEVAM ET"
      },
      strava: {
        subtitle: "Aktiviteleri senkronize etmek için Strava hesabınızı bağlayın (isteğe bağlı)",
        description: "Aktivitelerinizi otomatik olarak içe aktarmak ve takip deneyiminizi geliştirmek için Strava hesabınızı bağlayın.",
        connect: "STRAVA İLE BAĞLA",
        skip: "ATLA",
        finish: "KURULUMU TAMAMLA",
        connected: "STRAVA BAĞLANDI",
        connectedDescription: "Strava hesabınız başarıyla bağlandı!"
      }
    },
    stravaStats: {
      loading: "Strava verileri yükleniyor...",
      noActivities: "Aktivite bulunamadı. Strava hesabınızda aktiviteler olduğundan emin olun.",
      fetchError: "Strava verileri alınamadı. Bağlı olduğunuzdan emin olun.",
      connectAccount: "Strava hesabını bağla",
      disconnectConfirm: "Strava hesabınızı bağlantısını kesmek istediğinizden emin misiniz?",
      disconnecting: "BAĞLANTI KESİLİYOR...",
      disconnect: "BAĞLANTIYI KES",
      title: "İLERLEME",
      activitiesAnalyzed: "Analiz edilen aktiviteler",
      all: "Tümü",
      unknown: "Bilinmeyen",
      globalProgression: "Global ilerleme (Kümülatif mesafe)",
      progressionBySport: "Spor bazında ilerleme",
      heartRateEvolution: "Kalp atış hızı evrimi (BPM)",
      globalProgressionTable: "Global ilerleme tablosu",
      sportProgressionTable: "Spor ilerleme tablosu",
      date: "Tarih",
      activity: "Aktivite",
      type: "Tür",
      distance: "Mesafe (km)",
      cumulative: "Kümülatif (km)",
      sportCumulative: "Spor kümülatif (km)",
      selectSport: "Bir spor seçin",
      disconnectError: "Strava hesabının bağlantısı kesilemedi."
    }
  }
};

// Mapping des pays aux codes de langue
export const countryToLanguage = {
  'FR': 'FR',
  'US': 'EN',
  'GB': 'EN',
  'TR': 'TR',
  'IT': 'IT'
};

// Noms des pays
export const countryNames = {
  FR: { FR: 'France', EN: 'France', IT: 'Francia', TR: 'Fransa' },
  US: { FR: 'États-Unis', EN: 'United States', IT: 'Stati Uniti', TR: 'Amerika Birleşik Devletleri' },
  GB: { FR: 'Angleterre', EN: 'England', IT: 'Inghilterra', TR: 'İngiltere' },
  TR: { FR: 'Turquie', EN: 'Turkey', IT: 'Turchia', TR: 'Türkiye' },
  IT: { FR: 'Italie', EN: 'Italy', IT: 'Italia', TR: 'İtalya' }
};

