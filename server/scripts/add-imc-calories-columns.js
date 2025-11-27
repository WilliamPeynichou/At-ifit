/**
 * Script pour ajouter la colonne IMC à la table Users
 */

require('dotenv').config();
const sequelize = require('../database');
const { QueryTypes } = require('sequelize');

async function addColumns() {
  try {
    console.log('🔄 Ajout de la colonne IMC à la table Users...');
    
    // Vérifier si la colonne existe déjà
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'imc'
    `);
    
    // Ajouter la colonne IMC si elle n'existe pas
    if (results.length === 0) {
      await sequelize.query(`
        ALTER TABLE Users 
        ADD COLUMN imc FLOAT NULL 
        COMMENT 'Indice de Masse Corporelle (IMC)'
      `);
      console.log('✅ Colonne IMC ajoutée');
    } else {
      console.log('ℹ️  Colonne IMC existe déjà');
    }
    
    console.log('✅ Migration terminée avec succès');
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

addColumns();

