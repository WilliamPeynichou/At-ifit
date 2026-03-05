const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Goal = sequelize.define('Goal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  // Type d'objectif
  type: {
    type: DataTypes.ENUM('distance_monthly', 'sessions_weekly', 'calories_weekly', 'elevation_monthly'),
    allowNull: false,
  },
  // Sport ciblé (null = tous sports)
  sportType: { type: DataTypes.STRING(50), allowNull: true },
  // Valeur cible
  targetValue: { type: DataTypes.FLOAT, allowNull: false },
  // Période de l'objectif
  period: { type: DataTypes.ENUM('week', 'month'), allowNull: false },
  // Actif ou archivé
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'Goals',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'active'] },
  ],
});

module.exports = Goal;
