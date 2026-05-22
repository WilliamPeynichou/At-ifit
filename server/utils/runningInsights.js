const { formatDistance, formatPace, formatPercent } = require('./runningFormatting');

function lastValue(values) {
  return values.length ? values[values.length - 1] : null;
}

function previousValue(values) {
  return values.length > 1 ? values[values.length - 2] : null;
}

function generateRunningInsights(activities, weeklyStats, comparisonStats, extras = {}) {
  if (!activities?.length) {
    return ['Aucune activité de course à pied n’a été trouvée sur cette période.'];
  }

  if (activities.length < 2) {
    return ['Une seule activité est disponible. Les tendances nécessitent davantage de sorties pour être interprétées.'];
  }

  const insights = [];
  const global = comparisonStats?.current || {};
  const deltas = comparisonStats?.deltas || {};
  const heartRateCoverage = global.heartRateCoverage || 0;

  if (global.totalDistanceKm) {
    const weeklyAverage = weeklyStats?.length
      ? weeklyStats.reduce((sum, week) => sum + week.totalDistanceKm, 0) / weeklyStats.length
      : 0;
    insights.push(`Votre volume hebdomadaire moyen est de ${formatDistance(weeklyAverage)} sur la période sélectionnée.`);
  }

  if (comparisonStats?.available && deltas.distance !== null && deltas.distance !== undefined) {
    if (Math.abs(deltas.distance) < 0.05) {
      insights.push('Votre volume est globalement stable par rapport à la période précédente.');
    } else if (deltas.distance > 0) {
      insights.push(`Votre distance totale augmente de ${formatPercent(deltas.distance)} par rapport à la période précédente.`);
    } else {
      insights.push(`Votre distance totale baisse de ${formatPercent(deltas.distance)}. Cela peut correspondre à une récupération ou à une baisse de fréquence.`);
    }
  }

  if (comparisonStats?.available && Number.isFinite(deltas.paceSeconds)) {
    const absSeconds = Math.abs(deltas.paceSeconds);
    if (absSeconds >= 5) {
      const direction = deltas.paceSeconds < 0 ? 's’améliore' : 'ralentit';
      insights.push(`Votre allure moyenne ${direction} de ${absSeconds} sec/km par rapport à la période précédente.`);
    }
  }

  if (heartRateCoverage > 0 && heartRateCoverage < 0.3) {
    insights.push(`Les données cardio ne sont présentes que sur ${Math.round(heartRateCoverage * 100)} % des activités. Les analyses physiologiques doivent être considérées comme partielles.`);
  } else if (heartRateCoverage >= 0.3 && extras.paceHeartRateTrend?.available) {
    const trend = extras.paceHeartRateTrend;
    if (trend.paceDeltaSeconds < -5 && Math.abs(trend.heartRateDelta) <= 3) {
      insights.push('Vous courez légèrement plus vite avec une fréquence cardiaque moyenne similaire. Cela peut indiquer une meilleure efficacité aérobie.');
    } else if (Math.abs(trend.paceDeltaSeconds) <= 5 && trend.heartRateDelta < -3) {
      insights.push('Votre fréquence cardiaque moyenne baisse à allure comparable. C’est un signal positif, à confirmer sur davantage de sorties.');
    } else if (trend.heartRateDelta > 6) {
      insights.push('Votre fréquence cardiaque est plus élevée que d’habitude sur des allures proches. Cela peut venir de la fatigue, de la chaleur, du dénivelé ou d’un manque de récupération.');
    }
  } else {
    insights.push('Les données cardio ne sont pas disponibles pour ces activités. La charge est donc estimée avec une précision limitée.');
  }

  const latestLoadRatio = lastValue(extras.trainingLoadRatios || []);
  if (latestLoadRatio?.ratio) {
    if (latestLoadRatio.ratio > 1.5) {
      insights.push('Votre charge dépasse 1,5 fois votre moyenne récente. Cela peut augmenter la fatigue si cette hausse se répète.');
    } else if (latestLoadRatio.ratio >= 1.3) {
      insights.push('Votre charge récente augmente nettement par rapport aux semaines précédentes. Surveillez la récupération si cette tendance continue.');
    } else if (latestLoadRatio.ratio >= 0.8) {
      insights.push('Votre charge d’entraînement est cohérente par rapport aux semaines précédentes.');
    }
  }

  const latestLongRun = lastValue(extras.longRuns || []);
  if (latestLongRun?.shareOfWeeklyVolume) {
    const share = Math.round(latestLongRun.shareOfWeeklyVolume * 100);
    if (latestLongRun.shareOfWeeklyVolume > 0.4) {
      insights.push(`Votre sortie longue représente ${share} % du volume hebdomadaire. Cette concentration de charge peut augmenter la fatigue si elle se répète.`);
    } else {
      insights.push(`Votre sortie longue représente ${share} % du volume hebdomadaire, ce qui reste équilibré.`);
    }
  }

  if (extras.regularity?.totalWeeks >= 2) {
    const regularityPct = Math.round((extras.regularity.regularityScore || 0) * 100);
    insights.push(`Votre régularité est ${extras.regularity.interpretation} : vous avez couru au moins deux fois par semaine sur ${regularityPct} % des semaines analysées.`);
  }

  const elevationCorrelation = extras.correlations?.elevationRatioVsPace;
  if (elevationCorrelation && elevationCorrelation > 0.35) {
    insights.push('Votre allure ralentit principalement sur les sorties avec davantage de dénivelé. Les comparaisons doivent être contextualisées.');
  }

  if (extras.personalBests?.bestAveragePace) {
    const run = extras.personalBests.bestAveragePace;
    insights.push(`Votre meilleure allure moyenne calculable est ${formatPace(run.averagePaceMinKm)} sur ${formatDistance(run.distanceKm)}.`);
  }

  if (insights.length < 3 && previousValue(weeklyStats || [])) {
    insights.push('Les tendances restent limitées sur cette période. Ajoutez plusieurs semaines de données pour fiabiliser l’analyse.');
  }

  return insights.slice(0, 6);
}

module.exports = { generateRunningInsights };
