/**
 * Script pour mettre à jour l'IMC pour tous les utilisateurs existants
 */

require('dotenv').config();
const sequelize = require('../database');
const User = require('../models/User');
const { updateUserIMCAndCalories } = require('../utils/userCalculations');

async function updateAllUsers() {
  try {
    console.log('🔄 Mise à jour de l\'IMC pour tous les utilisateurs...');
    
    const users = await User.findAll();
    console.log(`📊 ${users.length} utilisateur(s) trouvé(s)`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      try {
        const result = await updateUserIMCAndCalories(user);
        
        if (result.updated) {
          updated++;
          console.log(`✅ Utilisateur ${user.id} (${user.email}): IMC=${result.imc}`);
        } else {
          skipped++;
          console.log(`⏭️  Utilisateur ${user.id} (${user.email}): Données insuffisantes (poids ou taille manquant)`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour l'utilisateur ${user.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Mise à jour terminée:`);
    console.log(`   - ${updated} utilisateur(s) mis à jour`);
    console.log(`   - ${skipped} utilisateur(s) ignoré(s) (données insuffisantes)`);
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    await sequelize.close();
    process.exit(1);
  }
}

updateAllUsers();

