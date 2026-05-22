const { formatDistanceMeters, formatSwimPace, formatPercentage } = require('./swimmingFormatting');

function generateSwimmingInsights(activities, weeklyStats, globalStats, comparisonStats, extras = {}) {
  if (!activities?.length) {
    return ['Aucune activité de natation trouvée sur la période sélectionnée.'];
  }
  if (activities.length < 2) {
    return ['Les données disponibles ne permettent pas encore une analyse fiable. Ajoutez davantage de séances pour obtenir des tendances.'];
  }

  const insights = [];
  const weeklyAverage = weeklyStats.length
    ? weeklyStats.reduce((sum, week) => sum + week.totalDistanceMeters, 0) / weeklyStats.length
    : 0;
  if (weeklyAverage) insights.push(`Votre volume hebdomadaire moyen est de ${formatDistanceMeters(weeklyAverage)} sur la période sélectionnée.`);

  const deltas = comparisonStats?.deltas || {};
  if (comparisonStats?.available && Number.isFinite(deltas.paceSeconds) && Math.abs(deltas.paceSeconds) >= 3) {
    const direction = deltas.paceSeconds < 0 ? 's’améliore' : 'ralentit';
    insights.push(`Votre allure moyenne ${direction} de ${Math.abs(deltas.paceSeconds)} sec/100m par rapport à la période précédente.`);
  }

  if (comparisonStats?.available && Number.isFinite(deltas.distance)) {
    if (deltas.distance > 0.15) insights.push(`Votre volume de nage augmente de ${formatPercentage(deltas.distance)} par rapport à la période précédente.`);
    else if (deltas.distance < -0.15) insights.push(`Votre volume de nage baisse de ${formatPercentage(deltas.distance)}. Cela peut correspondre à une récupération ou à une baisse de régularité.`);
  }

  const heartRateCoverage = globalStats?.heartRateCoverage || 0;
  if (heartRateCoverage > 0 && heartRateCoverage < 0.3) {
    insights.push(`Les données cardio ne sont présentes que sur ${Math.round(heartRateCoverage * 100)} % des séances. Les analyses physiologiques doivent être considérées comme partielles.`);
  } else if (extras.paceHeartRateTrend?.available) {
    const trend = extras.paceHeartRateTrend;
    if (trend.paceDeltaSeconds < -3 && Math.abs(trend.heartRateDelta) <= 3) {
      insights.push('Vous nagez légèrement plus vite avec une fréquence cardiaque moyenne similaire. Cela peut indiquer une meilleure efficacité.');
    } else if (trend.heartRateDelta > 6) {
      insights.push('Votre fréquence cardiaque est plus élevée que d’habitude sur des allures similaires. Cela peut venir de la fatigue, de la technique, de l’intensité ou d’autres facteurs.');
    }
  } else if (!heartRateCoverage) {
    insights.push('Les données cardio sont indisponibles sur cette période. La charge d’entraînement est donc estimée avec une précision limitée.');
  }

  const latestRatio = (extras.trainingLoadRatios || []).at(-1);
  if (latestRatio?.ratio) {
    if (latestRatio.ratio > 1.5) insights.push('Votre charge dépasse 1,5 fois votre moyenne récente. Cela peut augmenter la fatigue si cette hausse se répète.');
    else if (latestRatio.ratio >= 0.8 && latestRatio.ratio <= 1.3) insights.push('Votre charge d’entraînement est cohérente par rapport aux semaines précédentes.');
  }

  const latestLongSwim = (extras.longSwims || []).at(-1);
  if (latestLongSwim?.shareOfWeeklyVolume > 0.45) {
    insights.push('Vos séances longues représentent une part importante de votre volume hebdomadaire. Cela peut concentrer la charge sur peu de séances.');
  }

  const poolOpen = extras.poolVsOpenWaterStats || [];
  const pool = poolOpen.find(g => g.type === 'pool');
  const open = poolOpen.find(g => g.type === 'open_water');
  if (pool?.count && open?.count) {
    insights.push('Vos séances en eau libre sont plus variables que vos séances en piscine. Les comparaisons d’allure doivent donc être contextualisées.');
  } else if (pool?.count > 1) {
    insights.push('Vos séances en piscine sont plus comparables entre elles, ce qui rend l’évolution d’allure plus lisible.');
  }

  if (!extras.efficiencyStats?.available) {
    insights.push('Les données techniques comme le SWOLF ou la cadence ne sont pas disponibles. L’analyse d’efficacité reste limitée.');
  } else if (extras.efficiencyStats.averageSwolf) {
    insights.push(`Votre SWOLF moyen disponible est de ${extras.efficiencyStats.averageSwolf}. Cette métrique dépend du bassin, du style de nage et de la distance.`);
  }

  if (extras.personalBests?.bestAveragePace) {
    const swim = extras.personalBests.bestAveragePace;
    insights.push(`Votre meilleure allure moyenne calculable est ${formatSwimPace(swim.averagePaceMinPer100m)} sur ${formatDistanceMeters(swim.distanceMeters)}.`);
  }

  return insights.slice(0, 6);
}

module.exports = { generateSwimmingInsights };
