'use strict';

module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('Activities');
    const singleStravaUniqueIndexes = indexes.filter(index =>
      index.unique === true &&
      index.fields?.length === 1 &&
      index.fields[0]?.attribute === 'stravaId'
    );

    for (const index of singleStravaUniqueIndexes) {
      await queryInterface.removeIndex('Activities', index.name);
    }

    const refreshedIndexes = await queryInterface.showIndex('Activities');
    const hasCompositeUnique = refreshedIndexes.some(index =>
      index.unique === true &&
      index.fields?.map(field => field.attribute).join(',') === 'userId,stravaId'
    );

    if (!hasCompositeUnique) {
      await queryInterface.addIndex('Activities', ['userId', 'stravaId'], {
        unique: true,
        name: 'activities_user_strava_unique',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('Activities');
    if (indexes.some(index => index.name === 'activities_user_strava_unique')) {
      await queryInterface.removeIndex('Activities', 'activities_user_strava_unique');
    }
  },
};
