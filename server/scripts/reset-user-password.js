/**
 * Script pour réinitialiser le mot de passe d'un utilisateur
 * Usage: node scripts/reset-user-password.js <userId> <newPassword>
 * Exemple: node scripts/reset-user-password.js 1 "NouveauMotDePasse123!"
 */

require('dotenv').config();
const User = require('../models/User');
const sequelize = require('../database');

async function resetPassword(userId, newPassword) {
  try {
    // Vérifier que le mot de passe est fourni
    if (!newPassword || newPassword.length < 8) {
      console.error('❌ Le mot de passe doit contenir au moins 8 caractères');
      process.exit(1);
    }

    // Se connecter à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Trouver l'utilisateur
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error(`❌ Utilisateur avec l'ID ${userId} non trouvé`);
      process.exit(1);
    }

    console.log(`📧 Utilisateur trouvé: ${user.email} (ID: ${user.id})`);

    // Mettre à jour le mot de passe
    // Le hook beforeUpdate va automatiquement hasher le mot de passe
    user.password = newPassword;
    await user.save();

    console.log(`✅ Mot de passe réinitialisé avec succès pour l'utilisateur ${user.email} (ID: ${user.id})`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);

    // Fermer la connexion
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: node scripts/reset-user-password.js <userId> <newPassword>');
  console.error('   Exemple: node scripts/reset-user-password.js 1 "MonNouveauMotDePasse123!"');
  process.exit(1);
}

const userId = parseInt(args[0]);
const newPassword = args[1];

if (isNaN(userId)) {
  console.error('❌ L\'ID utilisateur doit être un nombre');
  process.exit(1);
}

resetPassword(userId, newPassword);

