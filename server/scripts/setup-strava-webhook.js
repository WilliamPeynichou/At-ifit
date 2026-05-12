#!/usr/bin/env node
/**
 * Script d'enregistrement de la subscription webhook Strava.
 *
 * Usage :
 *   node scripts/setup-strava-webhook.js               # liste les subscriptions actives
 *   node scripts/setup-strava-webhook.js --create      # crée une subscription
 *   node scripts/setup-strava-webhook.js --delete <id> # supprime une subscription
 *
 * Prérequis (env vars) :
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *   STRAVA_WEBHOOK_VERIFY_TOKEN
 *   WEBHOOK_CALLBACK_URL (ex: https://atifit.up.railway.app/api/webhook)
 *
 * Cette opération doit être faite UNE SEULE FOIS au déploiement.
 * Strava limite à 1 subscription par application.
 */

require('dotenv').config();
const axios = require('axios');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'atifit_webhook_token';
const CALLBACK_URL = process.env.WEBHOOK_CALLBACK_URL || `${process.env.FRONTEND_URL?.replace(/\/$/, '') || 'https://atifit.up.railway.app'}/api/webhook`;

const ENDPOINT = 'https://www.strava.com/api/v3/push_subscriptions';

async function listSubscriptions() {
  console.log('📋 Subscriptions actives...');
  try {
    const { data } = await axios.get(ENDPOINT, {
      params: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
    });
    if (!data || data.length === 0) {
      console.log('  Aucune subscription active.');
      return [];
    }
    data.forEach(sub => {
      console.log(`  → id: ${sub.id} | callback: ${sub.callback_url} | created: ${sub.created_at}`);
    });
    return data;
  } catch (err) {
    console.error('❌ Erreur lecture subscriptions:', err.response?.data || err.message);
    process.exit(1);
  }
}

async function createSubscription() {
  console.log('🔄 Création subscription Strava...');
  console.log(`   callback_url: ${CALLBACK_URL}`);
  console.log(`   verify_token: ${VERIFY_TOKEN}`);

  try {
    const { data } = await axios.post(ENDPOINT, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      callback_url: CALLBACK_URL,
      verify_token: VERIFY_TOKEN,
    });
    console.log('✅ Subscription créée avec succès :', data);
  } catch (err) {
    console.error('❌ Erreur création subscription:');
    console.error('   status:', err.response?.status);
    console.error('   data:', err.response?.data);
    if (err.response?.data?.errors?.some(e => e.code === 'already exists')) {
      console.log('\n💡 Une subscription existe déjà. Pour la remplacer :');
      console.log('   1. Listez avec : node scripts/setup-strava-webhook.js');
      console.log('   2. Supprimez avec : node scripts/setup-strava-webhook.js --delete <id>');
      console.log('   3. Recréez avec : node scripts/setup-strava-webhook.js --create');
    }
    process.exit(1);
  }
}

async function deleteSubscription(id) {
  console.log(`🗑️  Suppression subscription ${id}...`);
  try {
    await axios.delete(`${ENDPOINT}/${id}`, {
      params: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
    });
    console.log('✅ Subscription supprimée');
  } catch (err) {
    console.error('❌ Erreur suppression:', err.response?.data || err.message);
    process.exit(1);
  }
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET requis dans .env');
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args.includes('--create')) {
    await createSubscription();
  } else if (args.includes('--delete')) {
    const idx = args.indexOf('--delete');
    const id = args[idx + 1];
    if (!id) {
      console.error('❌ Usage : --delete <id>');
      process.exit(1);
    }
    await deleteSubscription(id);
  } else {
    await listSubscriptions();
  }
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
