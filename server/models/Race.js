const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Race = sequelize.define('Race', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  sport: { type: DataTypes.STRING(20), allowNull: false },
  raceDate: { type: DataTypes.DATEONLY, allowNull: true },
  locationLabel: { type: DataTypes.STRING(255), allowNull: true },
  distanceKm: { type: DataTypes.FLOAT, allowNull: true },
  elevationGainM: { type: DataTypes.FLOAT, allowNull: true },
  targetMinutes: { type: DataTypes.FLOAT, allowNull: true },
  objective: { type: DataTypes.JSON, allowNull: true },
  planner: { type: DataTypes.JSON, allowNull: true },
  strategy: { type: DataTypes.JSON, allowNull: true },
  trainingPlan: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'Races',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'updatedAt'] },
  ],
});

module.exports = Race;
