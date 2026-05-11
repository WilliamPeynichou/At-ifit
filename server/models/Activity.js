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
  elapsedTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  maxSpeed: {
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
  hasHeartrate: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  kilojoules: {
    type: DataTypes.FLOAT,
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
  maxWatts: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  weightedAverageWatts: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  deviceWatts: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  averageCadence: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  averageTemp: {
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
  workoutType: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  athleteCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  kudosCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  prCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  achievementCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  summaryPolyline: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  startLatlng: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  endLatlng: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  locationCity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  locationCountry: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bestEfforts: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  splitsMetric: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  laps: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  detailFetchedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  streamFetchedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  raw: {
    type: DataTypes.JSON,
    allowNull: true,
  },
});

module.exports = Activity;
