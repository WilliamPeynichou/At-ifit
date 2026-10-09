/**
 * Exporte les activités d'UN utilisateur (par e-mail) vers ml/data/activities.csv.
 * Usage : MYSQL_URL=... node ml/export_activities.js <email>
 * Les données restent locales (ml/data est ignoré par Git).
 */
const path = require('path');
const fs = require('fs');
const { Sequelize } = require(path.join(__dirname, '../server/node_modules/sequelize'));

const email = process.argv[2];
if (!email || !process.env.MYSQL_URL) { console.error('Usage: MYSQL_URL=... node ml/export_activities.js <email>'); process.exit(1); }

const COLS = ['id','type','startDate','distance','movingTime','elapsedTime','totalElevationGain','averageSpeed',
  'averageHeartrate','maxHeartrate','averageWatts','weightedAverageWatts','averageCadence','averageTemp',
  'sufferScore','trainer','commute','workoutType','locationCountry'];

(async () => {
  const db = new Sequelize(process.env.MYSQL_URL, { dialect: 'mysql', logging: false });
  const [[u]] = await db.query('SELECT id FROM Users WHERE email = :email', { replacements: { email } });
  if (!u) throw new Error('utilisateur introuvable');
  const [rows] = await db.query(`SELECT ${COLS.join(',')} FROM Activities WHERE userId = :id ORDER BY startDate`, { replacements: { id: u.id } });
  const esc = v => (v === null || v === undefined ? '' : String(v instanceof Date ? v.toISOString() : v).replace(/[",\n]/g, ' '));
  fs.writeFileSync(path.join(__dirname, 'data/activities.csv'), [COLS.join(','), ...rows.map(r => COLS.map(c => esc(r[c])).join(','))].join('\n'));
  const [streams] = await db.query('SELECT s.activityId, s.time, s.watts, s.heartrate, s.velocitySmooth, s.moving FROM ActivityStreams s JOIN Activities a ON a.id = s.activityId WHERE a.userId = :id', { replacements: { id: u.id } });
  fs.writeFileSync(path.join(__dirname, 'data/streams.json'), JSON.stringify(streams));
  console.log('streams exportés :', streams.length);
  console.log('activités exportées :', rows.length);
  await db.close();
})().catch(e => { console.error(e.message); process.exit(1); });
