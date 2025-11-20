require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../database');
const User = require('../models/User');

const resetPassword = async () => {
  try {
    const userId = 1;
    const newPassword = 'password123'; // Nouveau mot de passe

    // Trouver l'utilisateur
    const user = await User.findByPk(userId);

    if (!user) {
      console.error(`❌ User with ID ${userId} not found.`);
      process.exit(1);
    }

    console.log(`📧 User found: ${user.email}`);
    
    // Hash le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour directement le mot de passe hashé
    await user.update({ password: hashedPassword }, {
      hooks: false // Désactive les hooks pour éviter de re-hasher
    });

    console.log(`✅ Password updated successfully for user ID ${userId}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`\n🎉 You can now login with these credentials!`);

  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

resetPassword();
