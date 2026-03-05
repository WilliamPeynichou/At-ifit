const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Activity = sequelize.define('Activity', {
  stravaId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Other',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  movingTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  totalElevationGain: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  averageSpeed: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  averageHeartrate: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  maxHeartrate: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sufferScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  averageWatts: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  commute: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  trainer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  gearId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  raw: {
    type: DataTypes.JSON,
    allowNull: true,
  },
});

module.exports = Activity;
