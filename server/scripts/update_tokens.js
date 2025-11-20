require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../config/config.json');
const User = require('../models/User');

// Initialize Sequelize
const sequelize = new Sequelize(config.development);

// Initialize Model
const UserModel = User(sequelize, Sequelize.DataTypes);

const updateUser = async () => {
  try {
    const userId = 2;
    const accessToken = process.env.ACCES_JETON;
    const refreshToken = process.env.REFRESH_JETON;

    if (!accessToken || !refreshToken) {
      console.error('Error: ACCES_JETON or REFRESH_JETON not found in .env');
      process.exit(1);
    }

    const user = await UserModel.findByPk(userId);

    if (!user) {
      console.error(`Error: User with ID ${userId} not found.`);
      // Optional: Create the user if it doesn't exist? 
      // The user asked to "modify", implying existence. 
      // But if the DB is empty as they suspected, we might need to create.
      // For now, I'll just report not found.
    } else {
      await user.update({
        stravaAccessToken: accessToken,
        stravaRefreshToken: refreshToken,
        // Set expiry to a future date to avoid immediate refresh loop if we don't have the real expiry
        // Or set it to 0 to force refresh? 
        // If we set it to now, the app will try to refresh immediately using the new refresh token.
        // Let's set it to 0 (expired) so it forces a refresh on next use, 
        // assuming the refresh token in .env is valid.
        stravaExpiresAt: 0 
      });
      console.log(`Success: Updated User ${userId} with tokens from .env`);
    }

  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await sequelize.close();
  }
};

updateUser();
