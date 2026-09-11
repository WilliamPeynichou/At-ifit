'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'maxHeartrate', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Fréquence cardiaque maximale mesurée ou testée',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Users', 'maxHeartrate');
  },
};
