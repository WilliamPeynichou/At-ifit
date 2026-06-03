const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AuditLog = sequelize.define('AuditLog', {
  userId: { type: DataTypes.INTEGER, allowNull: true },
  actorUserId: { type: DataTypes.INTEGER, allowNull: true },
  eventType: { type: DataTypes.STRING(100), allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'success' },
  riskLevel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'low' },
  category: { type: DataTypes.STRING(60), allowNull: true },
  message: { type: DataTypes.STRING(500), allowNull: true },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(500), allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'AuditLogs',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['actorUserId', 'createdAt'] },
    { fields: ['eventType', 'createdAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['riskLevel', 'createdAt'] },
  ],
});

module.exports = AuditLog;
