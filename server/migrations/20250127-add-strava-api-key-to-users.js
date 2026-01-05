'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'stravaApiKey', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Clé API Strava personnelle de l\'utilisateur'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'stravaApiKey');
  }
};

