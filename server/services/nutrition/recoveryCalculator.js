const { RECOVERY } = require('./nutritionRules');
const { round, roundRange, scaleRange } = require('./rangeUtils');

/**
 * Après l'effort : l'urgence dépend du délai avant la séance suivante.
 * Sans contrainte de récupération rapprochée, inutile de forcer une fenêtre
 * étroite : un apport réparti sur les heures suivantes suffit.
 */
function computeRecovery({ weightKg, durationMinutes, fluidLossMl, hoursUntilNextSession, nutritionProfile = {} }) {
  const assumptions = [];
  const warnings = [];

  if (!weightKg) {
    return {
      available: false,
      reason: 'Poids inconnu : renseigne ton poids pour obtenir des quantités de récupération personnalisées.',
      assumptions,
      warnings,
    };
  }

  const nextSessionHours = Number.isFinite(Number(hoursUntilNextSession))
    ? Number(hoursUntilNextSession)
    : null;
  const isUrgent = nextSessionHours !== null && nextSessionHours <= RECOVERY.urgentRecoveryThresholdHours;

  if (nextSessionHours === null) {
    assumptions.push('Prochaine séance inconnue : récupération standard, sans fenêtre serrée.');
  }

  const carbRule = isUrgent ? RECOVERY.carbGPerKgPerHour : RECOVERY.carbGPerKgRelaxed;
  const carbohydratesG = roundRange(scaleRange(carbRule, weightKg));
  const proteinG = roundRange(scaleRange(RECOVERY.proteinGPerKg, weightKg));

  // À défaut de pesée avant/après, on estime les pertes par la sudation retenue.
  const estimatedLossMl = Number.isFinite(Number(fluidLossMl)) ? Number(fluidLossMl) : null;
  let fluidMl = null;
  if (estimatedLossMl !== null) {
    const litresLost = estimatedLossMl / 1000;
    fluidMl = roundRange(scaleRange(RECOVERY.fluidMlPerKgLost, litresLost), -1);
  } else {
    assumptions.push('Pertes hydriques non mesurées : bois à la soif et sale légèrement le repas suivant.');
  }

  if (isUrgent) {
    warnings.push(
      `Prochaine séance dans ${nextSessionHours} h : commence l’apport glucidique dans les 30 min et répète chaque heure.`
    );
  }
  if (durationMinutes >= 180) {
    assumptions.push('Effort long : la resynthèse du glycogène s’étale sur 24 h, pas seulement sur la première heure.');
  }
  if (nutritionProfile.dietaryPattern === 'vegan') {
    assumptions.push('Régime végétalien : combine plusieurs sources végétales pour couvrir les acides aminés essentiels.');
  }

  return {
    available: true,
    urgency: isUrgent ? 'high' : 'standard',
    carbohydratesG: isUrgent ? { ...carbohydratesG, perHourForHours: 4 } : carbohydratesG,
    proteinG,
    fluidMl,
    sodiumGuidance: 'Ajoute du sel au repas suivant : le sodium améliore la rétention hydrique.',
    timing: {
      firstIntakeMinutes: isUrgent ? 30 : 90,
      note: isUrgent
        ? 'Répète l’apport glucidique toutes les heures pendant environ 4 h.'
        : 'Un repas complet dans les 2 h suffit si la prochaine séance est éloignée.',
    },
    assumptions,
    warnings,
  };
}

module.exports = { computeRecovery };
