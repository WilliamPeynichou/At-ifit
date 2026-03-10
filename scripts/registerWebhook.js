/**
 * Script one-shot — Enregistre le webhook Strava
 *
 * Usage : node scripts/registerWebhook.js
 *
 * Prérequis :
 *   - Le serveur doit être accessible depuis Internet (ngrok, Render, etc.)
 *   - STRAVA_WEBHOOK_CALLBACK_URL dans .env doit pointer vers l'URL publique
 *     ex: https://mon-serveur.com/api/webhook/strava
 */

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const https = require('https');
const http = require('http');
const querystring = require('querystring');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'atifit_webhook_token';
const CALLBACK_URL = process.env.STRAVA_WEBHOOK_CALLBACK_URL;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET requis dans server/.env');
  process.exit(1);
}

if (!CALLBACK_URL) {
  console.error('❌ STRAVA_WEBHOOK_CALLBACK_URL requis dans server/.env');
  console.error('   Ex: STRAVA_WEBHOOK_CALLBACK_URL=https://mon-serveur.com/api/webhook/strava');
  process.exit(1);
}

const args = process.argv[2];

// ── Lister les abonnements existants ────────────────────────────────────────
function listSubscriptions() {
  const url = `https://www.strava.com/api/v3/push_subscriptions?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Réponse invalide')); }
      });
    }).on('error', reject);
  });
}

// ── Créer un abonnement ──────────────────────────────────────────────────────
function createSubscription() {
  const body = querystring.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    callback_url: CALLBACK_URL,
    verify_token: VERIFY_TOKEN,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.strava.com',
      path: '/api/v3/push_subscriptions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { reject(new Error('Réponse invalide')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Supprimer un abonnement ──────────────────────────────────────────────────
function deleteSubscription(id) {
  const body = querystring.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.strava.com',
      path: `/api/v3/push_subscriptions/${id}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n== Strava Webhook Manager ==');
  console.log(`Callback URL : ${CALLBACK_URL}`);
  console.log(`Verify token : ${VERIFY_TOKEN}\n`);

  if (args === 'list') {
    const subs = await listSubscriptions();
    console.log('Abonnements existants :', JSON.stringify(subs, null, 2));
    return;
  }

  if (args && args.startsWith('delete:')) {
    const id = args.split(':')[1];
    const status = await deleteSubscription(id);
    console.log(status === 204 ? `✅ Abonnement ${id} supprimé.` : `❌ Erreur HTTP ${status}`);
    return;
  }

  // Vérifier qu'aucun abonnement n'existe déjà
  const existing = await listSubscriptions();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log('⚠️  Un abonnement existe déjà :');
    existing.forEach(s => console.log(`   ID ${s.id} → ${s.callback_url}`));
    console.log('\nPour le supprimer : node scripts/registerWebhook.js delete:<id>');
    return;
  }

  // Créer l'abonnement
  console.log('Création de l\'abonnement webhook...');
  const result = await createSubscription();

  if (result.status === 201) {
    console.log(`✅ Webhook enregistré — ID : ${result.body.id}`);
    console.log('   Strava enverra les événements à :', CALLBACK_URL);
  } else {
    console.error(`❌ Erreur HTTP ${result.status} :`, result.body);
  }
}

main().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
