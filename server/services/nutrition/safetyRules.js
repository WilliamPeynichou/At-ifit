/**
 * Garde-fous de sécurité appliqués avant tout calcul personnalisé.
 * Atifit ne produit pas de conseil médical : certaines situations doivent
 * bloquer la génération d'un plan et orienter vers un professionnel.
 */

const MINIMUM_AGE = 18;

const BLOCKING_PRECAUTIONS = {
  eating_disorder: 'Un accompagnement spécialisé est nécessaire : Atifit ne génère pas de plan nutritionnel dans cette situation.',
  diabetes: 'La gestion glucidique à l’effort doit être encadrée médicalement pour un athlète diabétique.',
  kidney_disease: 'Les apports hydriques et sodés doivent être fixés par ton équipe médicale.',
  heart_condition: 'Une pathologie cardiaque impose un avis médical avant toute stratégie d’effort personnalisée.',
  pregnancy: 'Les besoins pendant la grossesse relèvent d’un suivi médical individualisé.',
};

/**
 * @returns {{allowed: boolean, blockers: Array, warnings: Array}}
 */
function evaluateSafety({ athlete = {}, healthPrecautions = [] }) {
  const blockers = [];
  const warnings = [];

  const age = athlete.age === null || athlete.age === undefined || athlete.age === ''
    ? null
    : Number(athlete.age);
  if (age === null || !Number.isFinite(age)) {
    blockers.push({
      code: 'age_required',
      message: 'Renseigne ton âge dans ton profil pour confirmer que tu as 18 ans ou plus.',
    });
  } else if (age < MINIMUM_AGE) {
    blockers.push({
      code: 'minor_not_supported',
      message: 'Les plans nutritionnels personnalisés sont réservés aux adultes de 18 ans et plus.',
    });
  }

  for (const precaution of healthPrecautions) {
    const key = typeof precaution === 'string' ? precaution : precaution?.category;
    if (BLOCKING_PRECAUTIONS[key]) {
      blockers.push({ code: key, message: BLOCKING_PRECAUTIONS[key] });
    }
  }

  return { allowed: blockers.length === 0, blockers, warnings };
}

/** Filtre les allergènes : un produit au profil inconnu n'est jamais proposé. */
function isProductSafe(product, allergens = []) {
  if (!allergens.length) return true;
  if (!product || !Array.isArray(product.allergens)) return false;
  return !product.allergens.some(allergen => allergens.includes(allergen));
}

module.exports = { evaluateSafety, isProductSafe, MINIMUM_AGE, BLOCKING_PRECAUTIONS };
