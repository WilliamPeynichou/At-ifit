const { PRE_EXERCISE } = require('./nutritionRules');
const { round, roundRange, scaleRange } = require('./rangeUtils');

function selectCarbBand(hoursBefore) {
  return PRE_EXERCISE.carbGPerKgByHoursBefore.find(band => hoursBefore <= band.maxHoursBefore)
    || PRE_EXERCISE.carbGPerKgByHoursBefore[PRE_EXERCISE.carbGPerKgByHoursBefore.length - 1];
}

/**
 * Avant l'effort : la quantité de glucides dépend surtout du délai disponible
 * pour digérer. Plus le départ est proche, plus la portion doit être réduite et
 * pauvre en fibres et en lipides.
 */
function computePreExercise({ weightKg, hoursBeforeStart, durationMinutes, nutritionProfile = {} }) {
  const assumptions = [];
  const warnings = [];

  if (!weightKg) {
    return {
      available: false,
      reason: 'Poids inconnu : renseigne ton poids pour obtenir des quantités personnalisées avant l’effort.',
      assumptions,
      warnings,
    };
  }

  const hours = Number.isFinite(Number(hoursBeforeStart)) ? Number(hoursBeforeStart) : 3;
  if (!Number.isFinite(Number(hoursBeforeStart))) {
    assumptions.push('Délai avant départ inconnu : scénario de repas 3 h avant retenu.');
  }

  const band = selectCarbBand(hours);
  const carbG = roundRange(scaleRange({ low: band.low, target: band.target, high: band.high }, weightKg));
  const fluidMl = roundRange(scaleRange(PRE_EXERCISE.fluidMlPerKg, weightKg), -1);
  const sodiumMg = roundRange(scaleRange(PRE_EXERCISE.sodiumMgPerKg, weightKg), -1);

  if (hours <= 1) {
    warnings.push('Départ imminent : privilégie une collation liquide ou très digeste, sans fibres ni lipides.');
  }
  if (durationMinutes >= 180) {
    assumptions.push('Effort long : un repas riche en glucides la veille au soir améliore les réserves de glycogène.');
  }
  if (nutritionProfile.gutTolerance === 'low') {
    warnings.push('Tolérance digestive basse : teste ce repas à l’entraînement avant de l’utiliser en compétition.');
  }

  return {
    available: true,
    timing: {
      mealHoursBefore: hours >= 3 ? 3 : Math.max(1, round(hours, 1)),
      snackMinutesBefore: hours >= 1 ? 45 : 20,
    },
    carbohydratesG: carbG,
    fluidMl,
    sodiumMg,
    guidance: [
      'Limite les fibres et les lipides dans les 2 h précédant le départ.',
      'Bois régulièrement sans excès : une urine claire en fin de matinée suffit comme repère.',
      hours <= 2
        ? 'Fractionne en petites prises pour éviter l’inconfort gastrique.'
        : 'Un repas complet reste possible, complété par une collation glucidique 45 min avant.',
    ],
    assumptions,
    warnings,
  };
}

module.exports = { computePreExercise, selectCarbBand };
