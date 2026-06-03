const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const StravaApiLog = sequelize.define('StravaApiLog', {
  userId: { type: DataTypes.INTEGER, allowNull: true },
  callType: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'other' },
  endpoint: { type: DataTypes.STRING(255), allowNull: false },
  method: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'GET' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'success' },
  httpStatus: { type: DataTypes.INTEGER, allowNull: true },
  durationMs: { type: DataTypes.INTEGER, allowNull: true },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  errorMessage: { type: DataTypes.STRING(500), allowNull: true },
  itemCount: { type: DataTypes.INTEGER, allowNull: true },
  resourceId: { type: DataTypes.STRING(100), allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'StravaApiLogs',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['callType', 'createdAt'] },
    { fields: ['status', 'createdAt'] },
  ],
});

module.exports = StravaApiLog;
