require('dotenv').config();
const sequelize = require('../database');
const User = require('../models/User');
require('../models/Activity');
require('../models/ActivityStream');
const { enrichUserActivities } = require('../services/stravaSync');

(async () => {
  const email = process.argv[2] || 'williampeynichou@gmail.com';
  const force = process.argv.includes('--force');
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { email: email.toUpperCase() } })
      || await User.findOne({ where: { email } });
    if (!user) throw new Error(`User ${email} introuvable`);
    console.log(`[enrich] user=${user.id} (${user.email}) force=${force}`);

    const result = await enrichUserActivities(user.id, { force, maxCount: 1000 });
    console.log('[enrich] résultat :', result);
  } catch (err) {
    console.error('[enrich] échec :', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
