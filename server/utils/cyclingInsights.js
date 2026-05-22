const { formatDistance, formatPercentage, formatSpeed, formatElevation } = require('./cyclingFormatting');

function generateCyclingInsights(activities, weeklyStats, globalStats, comparisonStats, extras = {}) {
  if (!activities?.length) return ['Aucune activité de cyclisme trouvée sur la période sélectionnée.'];
  if (activities.length < 2) return ['Les données disponibles ne permettent pas encore une analyse fiable. Ajoutez davantage de sorties pour obtenir des tendances.'];

  const insights = [];
  const weeklyAverage = weeklyStats.length ? weeklyStats.reduce((sum, w) => sum + w.totalDistanceKm, 0) / weeklyStats.length : 0;
  if (weeklyAverage) insights.push(`Votre volume hebdomadaire moyen est de ${formatDistance(weeklyAverage)} sur la période sélectionnée.`);

  const deltas = comparisonStats?.deltas || {};
  if (comparisonStats?.available && Number.isFinite(deltas.speed)) {
    const speedDelta = (comparisonStats.current.averageSpeedKmh || 0) - (comparisonStats.previous.averageSpeedKmh || 0);
    if (Math.abs(speedDelta) >= 0.5) {
      const elevComparable = !Number.isFinite(deltas.elevationPer100Km) || Math.abs(deltas.elevationPer100Km) < 0.12;
      insights.push(speedDelta > 0
        ? `Votre vitesse moyenne progresse de ${formatSpeed(speedDelta).replace(' km/h', ' km/h')} par rapport à la période précédente${elevComparable ? ', avec un dénivelé comparable.' : '. Le dénivelé doit être pris en compte.'}`
        : `Votre vitesse moyenne baisse de ${formatSpeed(Math.abs(speedDelta))}. Cette variation doit être contextualisée avec le dénivelé et l’intensité.`);
    }
  }

  if (comparisonStats?.available && Number.isFinite(deltas.distance)) {
    if (deltas.distance > 0.15) insights.push(`Votre volume augmente de ${formatPercentage(deltas.distance)} par rapport à la période précédente.`);
    else if (deltas.distance < -0.15) insights.push(`Votre volume baisse de ${formatPercentage(deltas.distance)}. Cela peut correspondre à une récupération ou à une baisse de régularité.`);
  }

  if (comparisonStats?.available && Number.isFinite(deltas.elevationPer100Km) && Math.abs(deltas.elevationPer100Km) > 0.15) {
    insights.push('Votre dénivelé moyen change nettement sur la période. Les comparaisons de vitesse doivent donc être contextualisées.');
  }

  const hrCoverage = globalStats?.heartRateCoverage || 0;
  if (hrCoverage > 0 && hrCoverage < 0.3) {
    insights.push(`Les données cardio ne sont présentes que sur ${Math.round(hrCoverage * 100)} % des sorties. Les analyses physiologiques doivent être considérées comme partielles.`);
  } else if (extras.speedHeartRateTrend?.available) {
    const trend = extras.speedHeartRateTrend;
    if (trend.speedDelta > 0.5 && Math.abs(trend.heartRateDelta) <= 3) {
      insights.push('Votre fréquence cardiaque moyenne reste stable alors que la vitesse progresse légèrement.');
    } else if (trend.heartRateDelta > 6) {
      insights.push('Votre fréquence cardiaque est plus élevée que d’habitude sur des vitesses similaires. Cela peut venir de la fatigue, de la chaleur, du vent, du dénivelé ou d’autres facteurs.');
    }
  }

  const power = globalStats?.powerStats || {};
  if (power.coverage > 0) {
    if (power.coverage < 0.4) {
      insights.push('Les données de puissance sont trop partielles pour établir une corrélation fiable.');
    } else {
      insights.push(`Les données de puissance sont disponibles sur ${Math.round(power.coverage * 100)} % des sorties, dont ${Math.round((power.measuredCoverage || 0) * 100)} % semblent mesurées par capteur.`);
    }
  } else {
    insights.push('Les données de puissance sont indisponibles sur cette période. La puissance et les zones restent donc non analysables.');
  }

  const latestRatio = (extras.trainingLoadRatios || []).at(-1);
  if (latestRatio?.ratio) {
    if (latestRatio.ratio > 1.5) insights.push('Votre charge dépasse 1,5 fois votre moyenne récente. Cela peut augmenter la fatigue si cette hausse se répète.');
    else if (latestRatio.ratio >= 0.8 && latestRatio.ratio <= 1.3) insights.push('Votre charge d’entraînement est cohérente par rapport aux semaines précédentes.');
  }

  const latestLongRide = (extras.longRides || []).at(-1);
  if (latestLongRide?.shareOfWeeklyVolume > 0.45) {
    insights.push(`Votre sortie longue représente ${Math.round(latestLongRide.shareOfWeeklyVolume * 100)} % du volume hebdomadaire. Cela concentre une grande partie de la charge sur une seule séance.`);
  }

  if (globalStats?.elevationPer100Km) {
    insights.push(`Votre dénivelé moyen est de ${formatElevation(globalStats.elevationPer100Km)} par 100 km sur la période.`);
  }

  return insights.slice(0, 6);
}

module.exports = { generateCyclingInsights };
