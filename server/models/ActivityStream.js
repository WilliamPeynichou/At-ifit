const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ActivityStream = sequelize.define('ActivityStream', {
  activityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  stravaId: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  time: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  distance: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  heartrate: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  watts: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  cadence: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  velocitySmooth: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  altitude: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  latlng: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  gradeSmooth: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  temp: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  moving: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  resolution: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fetchedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = ActivityStream;
