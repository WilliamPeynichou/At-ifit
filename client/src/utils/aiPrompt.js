/**
 * Prompt markdown à coller dans Claude ou ChatGPT pour créer un projet de suivi
 * d'entraînement : fiche course, plan de passage, plan hebdomadaire, profil athlète
 * (historique synthétisé + profil nutrition) et consignes de suivi.
 */

const SPORT_LABELS = { running: 'Course à pied', cycling: 'Cyclisme', swimming: 'Natation', triathlon: 'Triathlon' };
const GUT_LABELS = { low: 'sensible', medium: 'normale', high: 'solide', trained: 'entraînée' };
const SWEAT_LABELS = { low: 'peu salée', normal: 'normale', salty: 'très salée' };
const DIET_LABELS = { omnivore: 'omnivore', vegetarian: 'végétarien', vegan: 'végan', pescatarian: 'pescétarien' };
const TREND_LABELS = { up: 'en hausse', stable: 'stable', down: 'en baisse' };
const SPORT_STAT_LABELS = { running: 'Course à pied', cycling: 'Vélo', swimming: 'Natation' };

const fmt = (value, digits = 1) => (Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—');

function formatMinutes(minutes) {
  if (!Number.isFinite(Number(minutes))) return '—';
  const total = Math.round(Number(minutes));
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`;
}

function formatPace(minPerKm) {
  if (!Number.isFinite(Number(minPerKm)) || Number(minPerKm) <= 0) return null;
  const sec = Math.round(Number(minPerKm) * 60);
  return `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"/km`;
}

function raceSection(race) {
  const lines = [
    `- Nom : ${race?.name || '—'}`,
    `- Discipline : ${SPORT_LABELS[race?.sport] || race?.sport || '—'}`,
    `- Date : ${race?.raceDate || 'non renseignée'}`,
    `- Lieu : ${race?.locationLabel || '—'}`,
  ];
  if (race?.distanceKm) lines.push(`- Distance : ${fmt(race.distanceKm)} km`);
  if (race?.elevationGainM) lines.push(`- Dénivelé positif : ${Math.round(race.elevationGainM)} m`);
  if (race?.targetMinutes) lines.push(`- Objectif de temps : ${formatMinutes(race.targetMinutes)}`);
  return lines.join('\n');
}

function passageSection(plan, stations, sections) {
  if (!plan) return '_Pas de tracé GPX : le plan de passage n’est pas disponible._';
  const lines = [`Arrivée prévue : **${plan.finishClock}** (durée totale ${formatMinutes(plan.totalMinutes)}, dont arrêts ${Math.round(plan.stopMinutes || 0)} min).`];
  if (sections?.length) {
    lines.push('', '**Sections à allure imposée**', '');
    sections.forEach(section => {
      const pace = formatPace(section.avgPaceMinKm);
      const speed = section.avgSpeedKmh ? `${fmt(section.avgSpeedKmh)} km/h` : null;
      lines.push(`- ${section.name} · km ${fmt(section.fromKm)}–${fmt(section.toKm)} · ${[speed, pace].filter(Boolean).join(' · ') || '—'} · ${section.enterClock || ''} → ${section.exitClock || ''}`);
    });
  }
  if (stations?.length) {
    lines.push('', '**Ravitaillements**', '', '| Km | Ravito | Passage | Arrêt | Altitude |', '| --- | --- | --- | --- | --- |');
    (plan.stations || stations).forEach(station => {
      lines.push(`| ${fmt(station.km, 1)} | ${station.name} | ${station.clock || '—'} | ${station.stopMinutes ?? 0} min | ${station.ele ?? '—'} m |`);
    });
  }
  return lines.join('\n');
}

function strategySection(strategy) {
  const during = strategy?.during;
  if (!during) return '_Stratégie nutritionnelle non calculée._';
  const lines = [
    `- Glucides : ${during.carbohydratesGPerHour?.target ?? '—'} g/h`,
    `- Hydratation : ${during.fluidMlPerHour?.target ?? '—'} ml/h`,
    `- Sodium : ${during.sodiumMgPerHour?.target ?? '—'} mg/h`,
    `- Fractionnement : toutes les ${during.feedingIntervalMinutes ?? '—'} min`,
  ];
  return lines.join('\n');
}

function trainingSection(trainingPlan) {
  if (!trainingPlan?.weeks?.length) return '_Plan d’entraînement non généré._';
  const unit = trainingPlan.unit === 'h' ? 'h' : 'km';
  const lines = [];
  if (trainingPlan.note) lines.push(`_${trainingPlan.note}_`, '');
  trainingPlan.weeks.forEach(week => {
    const volume = unit === 'h' ? week.volumeHours : week.volumeKm;
    lines.push(`### Semaine ${week.index} · ${week.phase}${week.isRecovery ? ' (allégée)' : ''} · du ${week.startDate} · ${fmt(volume)} ${unit}`);
    lines.push(week.focus);
    (week.sessions || []).forEach(session => {
      lines.push(`- ${session.day} · ${session.title} (${session.durationMinutes} min) : ${session.detail}`);
    });
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

function summarySection(summary) {
  if (!summary?.bySport) return '_Historique Strava indisponible : demande-moi mes volumes habituels._';
  const lines = [`Période analysée : ${summary.weeksAnalyzed ?? 12} semaines · tendance ${TREND_LABELS[summary.trend] || 'inconnue'} · ${fmt(summary.last4WeeksKm, 0)} km sur les 4 dernières semaines.`, ''];
  Object.keys(SPORT_STAT_LABELS).forEach(sport => {
    const stats = summary.bySport[sport];
    if (!stats || !stats.sessions) return;
    const details = [
      `${stats.sessions} séances`,
      `${fmt(stats.weeklyKm)} km/sem`,
      `${fmt(stats.weeklyHours)} h/sem`,
      `sortie la plus longue ${fmt(stats.longestKm)} km`,
      stats.weeklyElevationM ? `${Math.round(stats.weeklyElevationM)} m D+/sem` : null,
      formatPace(stats.avgPaceMinKm) ? `allure moyenne ${formatPace(stats.avgPaceMinKm)}` : null,
      stats.avgSpeedKmh ? `vitesse moyenne ${fmt(stats.avgSpeedKmh)} km/h` : null,
    ].filter(Boolean);
    lines.push(`- **${SPORT_STAT_LABELS[sport]}** : ${details.join(' · ')}`);
  });
  if (summary.recentLongest?.length) {
    lines.push('', '**Plus longues sorties récentes**', '');
    summary.recentLongest.forEach(item => {
      lines.push(`- ${item.date} · ${item.type} · ${fmt(item.distanceKm)} km · ${Math.round(item.movingMinutes || 0)} min · D+ ${Math.round(item.elevationM || 0)} m`);
    });
  }
  return lines.join('\n');
}

function nutritionSection(profile) {
  if (!profile) return '_Profil nutrition non renseigné._';
  const lines = [
    `- Tolérance digestive : ${GUT_LABELS[profile.gutTolerance] || '—'}`,
    `- Profil sueur : ${SWEAT_LABELS[profile.sweatSodiumProfile] || '—'}`,
    `- Régime : ${DIET_LABELS[profile.diet] || '—'}`,
    `- Allergies : ${profile.allergies?.length ? profile.allergies.join(', ') : 'aucune déclarée'}`,
    `- Produits préférés : ${profile.preferredProducts || '—'}`,
    `- Produits à éviter : ${profile.avoidedProducts || '—'}`,
    `- Caféine : ${profile.caffeine ? 'oui' : 'non'}`,
  ];
  return lines.join('\n');
}

function userSection(user) {
  if (!user) return '';
  const lines = [];
  if (user.pseudo) lines.push(`- Prénom ou pseudo : ${user.pseudo}`);
  if (user.age) lines.push(`- Âge : ${user.age} ans`);
  if (user.weightKg) lines.push(`- Poids : ${fmt(user.weightKg, 1)} kg`);
  if (user.height) lines.push(`- Taille : ${user.height} cm`);
  return lines.length ? `\n${lines.join('\n')}` : '';
}

/**
 * @returns {string} prompt markdown prêt à coller
 */
export function buildAiPrompt({ race, plan, stations, sections, strategy, trainingPlan, summary, nutritionProfile, user }) {
  const sport = SPORT_LABELS[race?.sport] || 'sport';
  return `# Projet de suivi d’entraînement : ${race?.name || 'ma prochaine course'}

Tu es mon coach de suivi d’entraînement (${sport.toLowerCase()}). Tu as ci-dessous toutes les informations de préparation. Prends-les comme point de départ, pose-moi les questions utiles, puis suis-moi dans le temps.

## 1. Fiche course
${raceSection(race)}

## 2. Plan de passage et ravitaillements
${passageSection(plan, stations, sections)}

## 3. Stratégie nutrition le jour J
${strategySection(strategy)}

## 4. Plan d’entraînement semaine par semaine
Ces semaines sont indicatives : adapte-les à mon ressenti et à ma charge réelle.

${trainingSection(trainingPlan)}

## 5. Profil athlète

### Historique d’entraînement (synthèse Strava, 12 dernières semaines)
${summarySection(summary)}

### Profil nutrition
${nutritionSection(nutritionProfile)}
${userSection(user)}

## 6. Consignes de suivi
- Chaque semaine, je te donnerai un compte rendu : séances réalisées ou manquées, fatigue (1 à 10), sommeil, douleurs, poids si besoin.
- À partir de ce compte rendu, propose un ajustement du plan de la semaine suivante (charge, intensité, semaine allégée) et explique en une phrase pourquoi.
- Garde la progression de charge raisonnable : pas plus de 10 % de hausse de volume par semaine, une semaine allégée régulière.
- Si je signale une douleur persistante ou une blessure, arrête la progression et recommande de consulter un professionnel de santé.
- Pour la nutrition, teste la stratégie complète à l’entraînement avant la course, jamais pour la première fois le jour J.
- Réponds en français, avec des formats courts et des tableaux quand c’est utile.

Pour commencer : résume-moi le plan en trois points et dis-moi ce que tu veux savoir de moi avant la première semaine.
`;
}
