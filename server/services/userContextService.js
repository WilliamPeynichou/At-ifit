/**
 * Service pour récupérer le contexte utilisateur complet
 * Utilisé pour enrichir les messages envoyés à l'agent IA
 */

const User = require('../models/User');
const Weight = require('../models/Weight');
const { getValidStravaToken, fetchStravaActivities } = require('../utils/stravaHelpers');

/**
 * Récupère le contexte complet d'un utilisateur pour l'agent IA
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Contexte utilisateur
 */
async function getUserContext(userId) {
  try {
    // Vérification de sécurité : s'assurer que userId est valide
    if (!userId || isNaN(userId) || userId <= 0) {
      console.error('[User Context] userId invalide:', userId);
      return null;
    }
    
    // Récupérer le profil utilisateur
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'stravaAccessToken', 'stravaRefreshToken'] }
    });

    if (!user) {
      console.warn('[User Context] Utilisateur non trouvé:', userId);
      return null;
    }

    // Récupérer l'historique des poids (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const weights = await Weight.findAll({
      where: {
        userId: userId,
        date: {
          [require('sequelize').Op.gte]: thirtyDaysAgo
        }
      },
      order: [['date', 'DESC']],
      limit: 30
    });

    // Calculer les statistiques de poids
    const weightStats = calculateWeightStats(weights);

    // Récupérer les activités Strava récentes (si connecté)
    let recentActivities = [];
    if (user.stravaAccessToken) {
      try {
        const accessToken = await getValidStravaToken(user);
        if (accessToken) {
          const activities = await fetchStravaActivities(accessToken, { per_page: 10 });
          recentActivities = activities || [];
        }
      } catch (error) {
        console.log('[User Context] Strava non disponible:', error.message);
      }
    }

    // Construire le contexte
    const context = {
      // Informations de base
      userId: user.id,
      pseudo: user.pseudo || 'Utilisateur',
      email: user.email,
      age: user.age,
      height: user.height, // en cm
      gender: user.gender,
      country: user.country,
      
      // Objectifs
      targetWeight: user.targetWeight,
      consoKcal: user.consoKcal,
      weeksToGoal: user.weeksToGoal,
      
      // Historique poids
      weightHistory: weights.map(w => ({
        date: w.date,
        weight: w.weight
      })),
      weightStats: weightStats,
      
      // Activités récentes
      recentActivities: recentActivities.map(a => ({
        type: a.type,
        distance: a.distance ? (a.distance / 1000).toFixed(2) + ' km' : null,
        duration: a.moving_time ? formatDuration(a.moving_time) : null,
        date: a.start_date,
        calories: a.calories || a.kilojoules ? (a.calories || a.kilojoules / 4.184).toFixed(0) : null
      })),
      
      // Statut Strava
      stravaConnected: !!user.stravaAccessToken,
      
      // Date de dernière mise à jour
      lastUpdate: new Date().toISOString()
    };

    return context;
  } catch (error) {
    console.error('[User Context] Erreur lors de la récupération du contexte:', error);
    return null;
  }
}

/**
 * Calcule les statistiques de poids
 */
function calculateWeightStats(weights) {
  if (!weights || weights.length === 0) {
    return {
      current: null,
      average: null,
      min: null,
      max: null,
      trend: null,
      totalEntries: 0
    };
  }

  const weightValues = weights.map(w => parseFloat(w.weight)).filter(w => !isNaN(w));
  
  if (weightValues.length === 0) {
    return {
      current: null,
      average: null,
      min: null,
      max: null,
      trend: null,
      totalEntries: 0
    };
  }

  const current = weightValues[0];
  const average = weightValues.reduce((a, b) => a + b, 0) / weightValues.length;
  const min = Math.min(...weightValues);
  const max = Math.max(...weightValues);
  
  // Calculer la tendance (comparer les 7 premiers jours avec les 7 derniers)
  let trend = null;
  if (weightValues.length >= 7) {
    const recent = weightValues.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const older = weightValues.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const diff = recent - older;
    if (Math.abs(diff) > 0.1) {
      trend = diff > 0 ? 'augmentation' : 'diminution';
    } else {
      trend = 'stable';
    }
  }

  return {
    current: current.toFixed(1),
    average: average.toFixed(1),
    min: min.toFixed(1),
    max: max.toFixed(1),
    trend,
    totalEntries: weightValues.length
  };
}

/**
 * Formate la durée en secondes en format lisible
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

module.exports = { getUserContext };

