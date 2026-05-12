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

  // ── Activities : colonnes enrichies (Phase 0 data analyse) ────────────────
  await addColumnIfMissing('Activities', 'elapsedTime',           'INT NULL');
  await addColumnIfMissing('Activities', 'maxSpeed',              'FLOAT NULL');
  await addColumnIfMissing('Activities', 'hasHeartrate',          'TINYINT(1) NULL');
  await addColumnIfMissing('Activities', 'kilojoules',            'FLOAT NULL');
  await addColumnIfMissing('Activities', 'maxWatts',              'FLOAT NULL');
  await addColumnIfMissing('Activities', 'weightedAverageWatts',  'FLOAT NULL');
  await addColumnIfMissing('Activities', 'deviceWatts',           'TINYINT(1) NULL');
  await addColumnIfMissing('Activities', 'averageCadence',        'FLOAT NULL');
  await addColumnIfMissing('Activities', 'averageTemp',           'FLOAT NULL');
  await addColumnIfMissing('Activities', 'workoutType',           'INT NULL');
  await addColumnIfMissing('Activities', 'athleteCount',          'INT NULL');
  await addColumnIfMissing('Activities', 'kudosCount',            'INT NULL');
  await addColumnIfMissing('Activities', 'prCount',               'INT NULL');
  await addColumnIfMissing('Activities', 'achievementCount',      'INT NULL');
  await addColumnIfMissing('Activities', 'summaryPolyline',       'LONGTEXT NULL');
  await addColumnIfMissing('Activities', 'startLatlng',           'JSON NULL');
  await addColumnIfMissing('Activities', 'endLatlng',             'JSON NULL');
  await addColumnIfMissing('Activities', 'locationCity',          'VARCHAR(255) NULL');
  await addColumnIfMissing('Activities', 'locationCountry',       'VARCHAR(255) NULL');
  await addColumnIfMissing('Activities', 'deviceName',            'VARCHAR(255) NULL');
  await addColumnIfMissing('Activities', 'bestEfforts',           'JSON NULL');
  await addColumnIfMissing('Activities', 'splitsMetric',          'JSON NULL');
  await addColumnIfMissing('Activities', 'laps',                  'JSON NULL');
  await addColumnIfMissing('Activities', 'detailFetchedAt',       'DATETIME NULL');
  await addColumnIfMissing('Activities', 'streamFetchedAt',       'DATETIME NULL');

  // ── ActivityStreams : table dédiée séries temporelles ─────────────────────
  const [streamTable] = await sequelize.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ActivityStreams'
  `);
  if (streamTable.length === 0) {
    await sequelize.query(`
      CREATE TABLE \`ActivityStreams\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`activityId\` INT NOT NULL UNIQUE,
        \`stravaId\` BIGINT NOT NULL,
        \`time\` JSON NULL,
        \`distance\` JSON NULL,
        \`heartrate\` JSON NULL,
        \`watts\` JSON NULL,
        \`cadence\` JSON NULL,
        \`velocitySmooth\` JSON NULL,
        \`altitude\` JSON NULL,
        \`latlng\` JSON NULL,
        \`gradeSmooth\` JSON NULL,
        \`temp\` JSON NULL,
        \`moving\` JSON NULL,
        \`resolution\` VARCHAR(255) NULL,
        \`fetchedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`activityId\`) REFERENCES \`Activities\`(\`id\`) ON DELETE CASCADE,
        INDEX \`activity_streams_strava_id\` (\`stravaId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Table ActivityStreams créée');
  } else {
    console.log('  ✓ Table ActivityStreams existe déjà');
  }

  // ── Index pour l'enrichissement (B.3) ──────────────────────────────────────
  // Requêtes typiques : WHERE userId = ? AND (detailFetchedAt IS NULL OR streamFetchedAt IS NULL)
  for (const [name, def] of [
    ['Activities_userId_detailFetched', '(`userId`, `detailFetchedAt`)'],
    ['Activities_userId_streamFetched', '(`userId`, `streamFetchedAt`)'],
  ]) {
    if (!(await indexExists('Activities', name))) {
      try {
        await sequelize.query(`ALTER TABLE \`Activities\` ADD INDEX \`${name}\` ${def}`);
        console.log(`  ✅ Index ${name} ajouté`);
      } catch (e) {
        console.warn(`  ⚠️  Index ${name}:`, e.message);
      }
    } else {
      console.log(`  ✓ Index ${name} existe déjà`);
    }
  }

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
