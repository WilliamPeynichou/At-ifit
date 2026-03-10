const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

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
    type: DataTypes.STRING(600), // chiffré : iv(32) + ':' + ciphertext(~180) → ~215 chars
    allowNull: true,
    get() {
      return decrypt(this.getDataValue('stravaAccessToken'));
    },
    set(value) {
      this.setDataValue('stravaAccessToken', encrypt(value));
    }
  },
  stravaRefreshToken: {
    type: DataTypes.STRING(600),
    allowNull: true,
    get() {
      return decrypt(this.getDataValue('stravaRefreshToken'));
    },
    set(value) {
      this.setDataValue('stravaRefreshToken', encrypt(value));
    }
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
  },
  country: {
    type: DataTypes.STRING, // 'FR', 'US', 'GB', 'TR', 'IT'
    allowNull: true,
    defaultValue: 'FR'
  },
  imc: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Indice de Masse Corporelle (IMC)'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Dernière synchronisation Strava réussie'
  },
  stravaAthleteId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    unique: true,
    comment: 'ID athlète Strava — permet le lookup direct sur webhook'
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Compte verrouillé jusqu\'à cette date après trop d\'échecs de connexion'
  }
}, {
  timestamps: true
});

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

// Method to compare passwords
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
