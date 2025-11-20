const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  height: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pseudo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING, // 'male', 'female', 'other'
    allowNull: true,
  },
  targetWeight: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  stravaAccessToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stravaRefreshToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stravaExpiresAt: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  consoKcal: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  weeksToGoal: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  timestamps: true
});

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Method to compare passwords
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
