'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Goals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('distance_monthly', 'sessions_weekly', 'calories_weekly', 'elevation_monthly'),
        allowNull: false,
      },
      sportType: { type: Sequelize.STRING(50), allowNull: true },
      targetValue: { type: Sequelize.FLOAT, allowNull: false },
      period: { type: Sequelize.ENUM('week', 'month'), allowNull: false },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Goals', ['userId']);
    await queryInterface.addIndex('Goals', ['userId', 'active']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Goals');
  },
};
