/**
 * Script pour supprimer la colonne calories de la table Users
 */

require('dotenv').config();
const sequelize = require('../database');

async function removeColumn() {
  try {
    console.log('🔄 Suppression de la colonne calories de la table Users...');
    
    // Vérifier si la colonne existe
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'calories'
    `);
    
    if (results.length === 0) {
      console.log('ℹ️  La colonne calories n\'existe pas déjà');
      await sequelize.close();
      process.exit(0);
    }
    
    // Supprimer la colonne
    await sequelize.query(`
      ALTER TABLE Users 
      DROP COLUMN calories
    `);
    
    console.log('✅ Colonne calories supprimée avec succès');
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la colonne:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

removeColumn();

