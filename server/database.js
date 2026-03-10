const { Sequelize } = require('sequelize');

let sequelize;

// Railway injecte MYSQL_URL (ex: mysql://user:pass@host:port/db)
const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

if (mysqlUrl) {
  sequelize = new Sequelize(mysqlUrl, {
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
    }
  });
} else {
  // Fallback local (dev) — variables séparées ou config.json
  const config = require('./config/config.json');
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env];

  sequelize = new Sequelize(
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
}

module.exports = sequelize;
