const sequelize = require('../database');
const { QueryInterface } = require('sequelize');

async function addStravaApiKeyColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    const queryInterface = sequelize.getQueryInterface();
    
    // Vérifier si la colonne existe déjà
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'fit' 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'stravaApiKey'
    `);

    if (results.length > 0) {
      console.log('⚠️  La colonne stravaApiKey existe déjà');
      await sequelize.close();
      process.exit(0);
    }

    // Ajouter la colonne
    await queryInterface.addColumn('Users', 'stravaApiKey', {
      type: sequelize.Sequelize.STRING,
      allowNull: true,
      comment: 'Clé API Strava personnelle de l\'utilisateur'
    });

    console.log('✅ Colonne stravaApiKey ajoutée avec succès');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

addStravaApiKeyColumn();

