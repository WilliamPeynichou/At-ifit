require('dotenv').config();
const { Op } = require('sequelize');
const sequelize = require('../database');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const { computeActivityPowerBests } = require('../utils/powerBests');

// Types vélo : même ensemble que RIDE_TYPES (cyclingProfileService), superset de getPowerCurve.
const RIDE_TYPES = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];
const BATCH_SIZE = 50;

/**
 * Remplit Activities.powerBests pour les sorties vélo qui ont un stream watts
 * et pas encore de powerBests. Idempotent : ne touche que powerBests IS NULL.
 * Curseur sur id → terminaison garantie même si certaines activités n'ont pas de watts.
 */
async function backfillPowerBests() {
  let lastId = 0;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const batch = await Activity.findAll({
      where: {
        type: { [Op.in]: RIDE_TYPES },
        powerBests: { [Op.is]: null },
        id: { [Op.gt]: lastId },
      },
      attributes: ['id'],
      order: [['id', 'ASC']],
      limit: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    lastId = batch[batch.length - 1].id;
    scanned += batch.length;

    const streams = await ActivityStream.findAll({
      where: { activityId: batch.map(a => a.id) },
      attributes: ['activityId', 'watts', 'time'],
    });

    for (const stream of streams) {
      const powerBests = computeActivityPowerBests(stream.watts, stream.time);
      if (!powerBests) continue;
      await Activity.update({ powerBests }, { where: { id: stream.activityId } });
      updated += 1;
    }
  }

  return { scanned, updated };
}

module.exports = { backfillPowerBests };

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      const result = await backfillPowerBests();
      console.log('[backfillPowerBests] résultat :', result);
    } catch (err) {
      console.error('[backfillPowerBests] échec :', err.message);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  })();
}
