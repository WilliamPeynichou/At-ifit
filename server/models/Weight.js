const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Weight = sequelize.define('Weight', {
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Weight;
