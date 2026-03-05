'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Activities', {
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
      stravaId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Other',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      distance: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      movingTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      totalElevationGain: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      averageSpeed: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      averageHeartrate: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      maxHeartrate: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      calories: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sufferScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      averageWatts: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      commute: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      trainer: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      gearId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      raw: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('Activities', ['userId']);
    await queryInterface.addIndex('Activities', ['userId', 'startDate']);
    await queryInterface.addIndex('Activities', ['userId', 'type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Activities');
  },
};
