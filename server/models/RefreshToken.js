const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const RefreshToken = sequelize.define('RefreshToken', {
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: 'RefreshTokens'
});

module.exports = RefreshToken;

