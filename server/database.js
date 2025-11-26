const { Sequelize } = require('sequelize');
const config = require('./config/config.json');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Utiliser les variables d'environnement si disponibles, sinon utiliser la config
// Support des deux formats : DB_USERNAME/DB_PASSWORD/DB_DATABASE ou DB_USER/DB_PASS/DB_NAME
const sequelize = new Sequelize(
  process.env.DB_DATABASE || process.env.DB_NAME || dbConfig.database,
  process.env.DB_USERNAME || process.env.DB_USER || dbConfig.username,
  process.env.DB_PASSWORD || process.env.DB_PASS || dbConfig.password,
  {
    host: process.env.DB_HOST || dbConfig.host,
    port: process.env.DB_PORT || dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

module.exports = sequelize;
