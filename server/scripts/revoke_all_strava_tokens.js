/**
 * Script to revoke all Strava access tokens and disconnect all users
 * This helps free up the athlete limit quota for Strava applications
 * 
 * Usage: node server/scripts/revoke_all_strava_tokens.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../database');
const User = require('../models/User');
const axios = require('axios');
const logger = require('../utils/logger');

const revokeStravaToken = async (accessToken) => {
  try {
    // Strava API endpoint to deauthorize/revoke access
    await axios.post('https://www.strava.com/oauth/deauthorize', {
      access_token: accessToken
    });
    return true;
  } catch (error) {
    // If token is already invalid/revoked, that's okay
    if (error.response?.status === 401 || error.response?.status === 404) {
      return true; // Token already invalid
    }
    console.error('Error revoking token:', error.message);
    return false;
  }
};

const revokeAllTokens = async () => {
  try {
    console.log('🔍 Searching for users with Strava tokens...');
    
    // Find all users with Strava tokens
    const users = await User.findAll({
      where: {
        stravaAccessToken: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });

    console.log(`📊 Found ${users.length} users with Strava tokens`);

    if (users.length === 0) {
      console.log('✅ No users with Strava tokens found. Nothing to revoke.');
      return;
    }

    let revokedCount = 0;
    let clearedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`\n👤 Processing user ${user.id} (${user.email})...`);
        
        // Try to revoke the token via Strava API
        if (user.stravaAccessToken) {
          const revoked = await revokeStravaToken(user.stravaAccessToken);
          if (revoked) {
            revokedCount++;
            console.log(`   ✅ Token revoked via Strava API`);
          } else {
            errorCount++;
            console.log(`   ⚠️  Failed to revoke token via API (will still clear from DB)`);
          }
        }

        // Clear tokens from database regardless
        await user.update({
          stravaAccessToken: null,
          stravaRefreshToken: null,
          stravaExpiresAt: null
        });
        clearedCount++;
        console.log(`   ✅ Tokens cleared from database`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   Total users processed: ${users.length}`);
    console.log(`   ✅ Tokens revoked via API: ${revokedCount}`);
    console.log(`   ✅ Tokens cleared from DB: ${clearedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));
    console.log('\n✅ All Strava tokens have been revoked and cleared!');
    console.log('💡 You can now connect new Strava accounts.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the script
revokeAllTokens();

