require('dotenv').config();
const sequelize = require('../database');
const User = require('../models/User');
require('../models/Activity');
require('../models/ActivityStream');
const { syncUserActivities } = require('../services/stravaSync');

(async () => {
  const email = process.argv[2] || 'williampeynichou@gmail.com';
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { email: email.toUpperCase() } })
      || await User.findOne({ where: { email } });
    if (!user) throw new Error(`User ${email} introuvable`);
    console.log(`[force-resync] user=${user.id} (${user.email}) lastSyncAt=${user.lastSyncAt}`);

    const result = await syncUserActivities(user.id, { enrich: false });
    console.log('[force-resync] résultat :', result);
  } catch (err) {
    console.error('[force-resync] échec :', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
