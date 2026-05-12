require('dotenv').config();
const sequelize = require('../database');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { getValidStravaToken, getActivity } = require('../utils/stravaHelpers');

(async () => {
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { email: 'WILLIAMPEYNICHOU@GMAIL.COM' } });
    const token = await getValidStravaToken(user);
    const act = await Activity.findOne({ where: { userId: user.id }, order: [['startDate', 'DESC']] });
    console.log(`Activity stravaId=${act.stravaId} ${act.name}`);

    const detail = await getActivity(token, act.stravaId);
    const keys = Object.keys(detail).sort();
    console.log('suffer_score =', detail.suffer_score);
    console.log('perceived_exertion =', detail.perceived_exertion);
    console.log('prefer_perceived_exertion =', detail.prefer_perceived_exertion);
    console.log('calories =', detail.calories);
    console.log('has_heartrate =', detail.has_heartrate);
    console.log('average_heartrate =', detail.average_heartrate);
  } catch (err) {
    console.error('échec :', err.message);
  } finally {
    await sequelize.close();
  }
})();
