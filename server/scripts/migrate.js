/**
 * Script de migration — ajoute les colonnes manquantes sans toucher aux existantes.
 * Idempotent : peut être relancé autant de fois que nécessaire.
 * Usage standalone : node scripts/migrate.js
 * Usage programmatique : require('./scripts/migrate').runMigrations()
 */

require('dotenv').config();
const sequelize = require('../database');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
  `, { replacements: [table, column] });
  return rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`  ✓ ${table}.${column} existe déjà`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  ✅ ${table}.${column} ajouté`);
}

async function indexExists(table, indexName) {
  const [rows] = await sequelize.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
  `, { replacements: [table, indexName] });
  return rows.length > 0;
}

async function runMigrations() {
  console.log('🔄 Migration en cours...');

  // ── Users ──────────────────────────────────────────────────────────────────
  await addColumnIfMissing('Users', 'stravaAthleteId',      "BIGINT NULL COMMENT 'ID athlète Strava'");
  if (!(await indexExists('Users', 'Users_stravaAthleteId_unique'))) {
    try {
      await sequelize.query('ALTER TABLE `Users` ADD UNIQUE INDEX `Users_stravaAthleteId_unique` (`stravaAthleteId`)');
      console.log('  ✅ Users.stravaAthleteId index UNIQUE ajouté');
    } catch (e) {
      console.warn('  ⚠️  Index stravaAthleteId:', e.message);
    }
  }
  await addColumnIfMissing('Users', 'failedLoginAttempts',  'INT NOT NULL DEFAULT 0');
  await addColumnIfMissing('Users', 'lockedUntil',          "DATETIME NULL COMMENT 'Compte verrouillé jusqu\\'à cette date'");
  await addColumnIfMissing('Users', 'lastSyncAt',           "DATETIME NULL COMMENT 'Dernière synchronisation Strava'");
  await addColumnIfMissing('Users', 'imc',                  "FLOAT NULL COMMENT 'Indice de Masse Corporelle'");
  await addColumnIfMissing('Users', 'country',              "VARCHAR(255) NULL DEFAULT 'FR'");
  await addColumnIfMissing('Users', 'consoKcal',            'INT NULL');
  await addColumnIfMissing('Users', 'weeksToGoal',          'FLOAT NULL');
  await addColumnIfMissing('Users', 'targetWeight',         'FLOAT NULL');
  await addColumnIfMissing('Users', 'stravaAccessToken',    'VARCHAR(600) NULL');
  await addColumnIfMissing('Users', 'stravaRefreshToken',   'VARCHAR(600) NULL');
  await addColumnIfMissing('Users', 'stravaExpiresAt',      'INT NULL');

  console.log('✅ Migration terminée');
}

module.exports = { runMigrations };

// Exécution standalone
if (require.main === module) {
  sequelize.authenticate()
    .then(runMigrations)
    .then(() => sequelize.close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erreur migration:', err.message);
      sequelize.close();
      process.exit(1);
    });
}
