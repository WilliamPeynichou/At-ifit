/**
 * Utilitaires pour calculer l'IMC
 */

const Weight = require('../models/Weight');

/**
 * Calcule l'IMC (Indice de Masse Corporelle)
 * @param {number} weight - Poids en kg
 * @param {number} height - Taille en cm
 * @returns {number|null} IMC calculé ou null si données insuffisantes
 */
function calculateIMC(weight, height) {
  if (!weight || !height || weight <= 0 || height <= 0) {
    return null;
  }
  
  const heightM = height / 100; // Convertir cm en mètres
  const imc = weight / (heightM * heightM);
  
  return parseFloat(imc.toFixed(2));
}

/**
 * Calcule le BMR (Basal Metabolic Rate) avec l'équation de Mifflin-St Jeor
 * @param {number} weight - Poids en kg
 * @param {number} height - Taille en cm
 * @param {number} age - Âge en années
 * @param {string} gender - Genre ('male', 'female', 'other')
 * @returns {number|null} BMR calculé ou null si données insuffisantes
 */
function calculateBMR(weight, height, age, gender) {
  if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
    return null;
  }
  
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  
  if (gender === 'female') {
    bmr -= 161;
  } else if (gender === 'male') {
    bmr += 5;
  }
  // Pour 'other', on utilise la moyenne (pas d'ajustement)
  
  return Math.round(bmr);
}

/**
 * Calcule les calories quotidiennes recommandées
 * @param {number} bmr - BMR calculé
 * @param {number} activityFactor - Facteur d'activité (1.2 à 1.9)
 * @param {string} goal - Objectif ('loss', 'gain', 'maintain')
 * @returns {number|null} Calories recommandées ou null
 */
function calculateCalories(bmr, activityFactor = 1.2, goal = 'maintain') {
  if (!bmr || bmr <= 0) {
    return null;
  }
  
  let calories = bmr * activityFactor;
  
  // Ajuster selon l'objectif
  if (goal === 'loss') {
    calories -= 500; // Déficit de 500 kcal/jour pour perdre ~0.5kg/semaine
  } else if (goal === 'gain') {
    calories += 500; // Surplus de 500 kcal/jour pour prendre ~0.5kg/semaine
  }
  // Pour 'maintain', pas d'ajustement
  
  return Math.round(Math.max(calories, 1200)); // Minimum 1200 kcal/jour
}

/**
 * Met à jour l'IMC d'un utilisateur
 * @param {Object} user - Instance Sequelize de l'utilisateur
 * @param {Object} options - Options supplémentaires
 * @param {number} options.currentWeight - Poids actuel (optionnel, récupéré automatiquement si non fourni)
 * @returns {Promise<Object>} Objet avec imc mis à jour
 */
async function updateUserIMCAndCalories(user, options = {}) {
  try {
    const { currentWeight } = options;
    
    // Récupérer le poids actuel si non fourni
    let weight = currentWeight;
    if (!weight) {
      const latestWeight = await Weight.findOne({
        where: { userId: user.id },
        order: [['date', 'DESC']]
      });
      weight = latestWeight ? latestWeight.weight : null;
    }
    
    // Calculer l'IMC
    let imc = null;
    if (weight && user.height) {
      imc = calculateIMC(weight, user.height);
    }
    
    // Mettre à jour l'utilisateur (seulement l'IMC, consoKcal est géré ailleurs)
    const updates = {};
    if (imc !== null) updates.imc = imc;
    
    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }
    
    return {
      imc,
      updated: Object.keys(updates).length > 0
    };
  } catch (error) {
    console.error('[User Calculations] Erreur lors de la mise à jour:', error);
    return { imc: null, updated: false };
  }
}

module.exports = {
  calculateIMC,
  calculateBMR,
  calculateCalories,
  updateUserIMCAndCalories
};

