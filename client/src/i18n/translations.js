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
      bmi: {
        title: "IMC (Indice de Masse Corporelle)",
        description: "L'IMC est une mesure de votre poids par rapport à votre taille. Il permet d'évaluer si votre poids est adapté à votre taille. Cette valeur est calculée automatiquement à partir de votre poids actuel et de votre taille.",
        calculation: "IMC = Poids (kg) / Taille (m)²",
        underweight: "Insuffisance pondérale",
        normal: "Poids normal",
        overweight: "Surpoids",
        obese: "Obésité"
      },
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
        description: "La différence de poids entre aujourd'hui et il y a 7 jours. Une valeur positive indique une prise de poids, une valeur négative une perte de poids."
      },
      dayDelta30: {
        title: "Delta 30 Jours",
        description: "La différence de poids entre aujourd'hui et il y a 30 jours. Cette métrique donne une vue plus large de votre progression mensuelle."
      },
      weeklyAvg: {
        title: "Moyenne Hebdomadaire",
        description: "La moyenne de changement de poids par semaine, calculée sur toute la période de suivi. Cette valeur projette votre tendance actuelle sur une semaine."
      },
      monthlyAvg: {
        title: "Moyenne Mensuelle",
        description: "La moyenne de changement de poids par mois, calculée sur toute la période de suivi. Cette valeur projette votre tendance actuelle sur un mois."
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
      bmi: {
        title: "BMI (Body Mass Index)",
        description: "BMI is a measure of your weight relative to your height. It helps assess if your weight is appropriate for your height. This value is automatically calculated from your current weight and height.",
        calculation: "BMI = Weight (kg) / Height (m)²",
        underweight: "Underweight",
        normal: "Normal",
        overweight: "Overweight",
        obese: "Obese"
      },
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
        description: "The weight difference between today and 7 days ago. A positive value indicates weight gain, a negative value indicates weight loss."
      },
      dayDelta30: {
        title: "30 Day Delta",
        description: "The weight difference between today and 30 days ago. This metric provides a broader view of your monthly progress."
      },
      weeklyAvg: {
        title: "Weekly Average",
        description: "The average weight change per week, calculated over your entire tracking period. This value projects your current trend over a week."
      },
      monthlyAvg: {
        title: "Monthly Average",
        description: "The average weight change per month, calculated over your entire tracking period. This value projects your current trend over a month."
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

