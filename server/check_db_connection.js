const { Sequelize } = require('sequelize');
const config = require('./config/config.json');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Utiliser les variables d'environnement si disponibles, sinon utiliser la config
const sequelize = new Sequelize(
  process.env.DB_DATABASE || dbConfig.database,
  process.env.DB_USERNAME || dbConfig.username,
  process.env.DB_PASSWORD || dbConfig.password,
  {
    host: process.env.DB_HOST || dbConfig.host,
    port: process.env.DB_PORT || dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function check() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données MySQL établie avec succès.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données MySQL:', error.message);
    console.error('\n💡 Vérifiez que:');
    console.error('   - MySQL est installé et démarré');
    console.error('   - La base de données existe (ou créez-la)');
    console.error('   - Les identifiants dans config.json ou .env sont corrects');
    process.exit(1);
  }
}

check();
