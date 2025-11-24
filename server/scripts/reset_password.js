require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../database');
const User = require('../models/User');

const resetPassword = async () => {
  try {
    const userEmail = 'WILLIAMPEYNICHOU@GMAIL.COM';
    const newPassword = 'gliadioL5!'; // Nouveau mot de passe

    // Trouver l'utilisateur par email
    const user = await User.findOne({
      where: { email: userEmail }
    });

    if (!user) {
      console.error(`❌ User with email ${userEmail} not found.`);
      process.exit(1);
    }

    console.log(`📧 User found: ${user.email}`);
    console.log(`🆔 User ID: ${user.id}`);
    
    // Hash le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour directement le mot de passe hashé
    await user.update({ password: hashedPassword }, {
      hooks: false // Désactive les hooks pour éviter de re-hasher
    });

    console.log(`✅ Password updated successfully!`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`\n🎉 You can now login with these credentials!`);

  } catch (error) {
    console.error('❌ Error updating password:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

resetPassword();
