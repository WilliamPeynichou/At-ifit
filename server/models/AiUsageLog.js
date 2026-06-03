const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AiUsageLog = sequelize.define('AiUsageLog', {
  userId: { type: DataTypes.INTEGER, allowNull: true },
  provider: { type: DataTypes.STRING(60), allowNull: false },
  model: { type: DataTypes.STRING(120), allowNull: true },
  usageType: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'message_agent' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'success' },
  durationMs: { type: DataTypes.INTEGER, allowNull: true },
  userMessageLength: { type: DataTypes.INTEGER, allowNull: true },
  responseLength: { type: DataTypes.INTEGER, allowNull: true },
  dataUsed: { type: DataTypes.JSON, allowNull: true },
  intents: { type: DataTypes.JSON, allowNull: true },
  actionProposed: { type: DataTypes.STRING(120), allowNull: true },
  actionStatus: { type: DataTypes.STRING(40), allowNull: true },
  promptTokens: { type: DataTypes.INTEGER, allowNull: true },
  completionTokens: { type: DataTypes.INTEGER, allowNull: true },
  estimatedTokens: { type: DataTypes.INTEGER, allowNull: true },
  estimatedCost: { type: DataTypes.FLOAT, allowNull: true },
  errorMessage: { type: DataTypes.STRING(500), allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'AiUsageLogs',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['provider', 'createdAt'] },
    { fields: ['usageType', 'createdAt'] },
    { fields: ['status', 'createdAt'] },
  ],
});

module.exports = AiUsageLog;
