/**
 * Proxy API REST pour MySQL
 * 
 * Expose MySQL via des endpoints REST sécurisés pour n8n
 * Plus sécurisé qu'un tunnel TCP direct
 */

const express = require('express');
const mysql = require('mysql2/promise');
const config = require('../config/config.json');

const app = express();
const PORT = process.env.TUNNEL_PROXY_PORT || 3002;

// Configuration MySQL
const dbConfig = config.development;

// Middleware
app.use(express.json());

// Authentification simple par token (à améliorer pour la production)
const AUTH_TOKEN = process.env.TUNNEL_AUTH_TOKEN || 'changez-ce-token-en-production';

const authenticate = (req, res, next) => {
  const token = req.headers['x-auth-token'] || req.query.token;
  
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Token d\'authentification invalide' });
  }
  
  next();
};

// Créer une pool de connexions MySQL
let pool;

async function initPool() {
  pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  // Tester la connexion
  try {
    const connection = await pool.getConnection();
    console.log('[MySQL Proxy] ✅ Connexion à MySQL établie');
    connection.release();
  } catch (error) {
    console.error('[MySQL Proxy] ❌ Erreur de connexion MySQL:', error.message);
    process.exit(1);
  }
}

// Routes API

/**
 * GET /health
 * Vérifier l'état du proxy
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mysql: pool ? 'connected' : 'disconnected',
    database: dbConfig.database 
  });
});

/**
 * POST /query
 * Exécuter une requête SQL SELECT
 * Body: { query: "SELECT * FROM users LIMIT 10", params: [] }
 */
app.post('/query', authenticate, async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'La requête SQL est requise' });
    }
    
    // Sécurité : seulement les SELECT sont autorisés
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return res.status(403).json({ error: 'Seules les requêtes SELECT sont autorisées' });
    }
    
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
    
  } catch (error) {
    console.error('[MySQL Proxy] Erreur requête:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tables
 * Lister toutes les tables de la base de données
 */
app.get('/tables', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute('SHOW TABLES');
    const tables = rows.map(row => Object.values(row)[0]);
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /table/:tableName
 * Récupérer toutes les données d'une table
 * Query params: limit, offset
 */
app.get('/table/:tableName', authenticate, async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Sécurité : valider le nom de table (prévenir SQL injection)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({ error: 'Nom de table invalide' });
    }
    
    // LIMIT et OFFSET doivent être des valeurs directes, pas des placeholders
    const query = `SELECT * FROM \`${tableName}\` LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await pool.execute(query);
    
    res.json({ 
      success: true, 
      table: tableName,
      data: rows, 
      count: rows.length,
      limit,
      offset 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /table/:tableName/structure
 * Récupérer la structure d'une table
 */
app.get('/table/:tableName/structure', authenticate, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({ error: 'Nom de table invalide' });
    }
    
    const [rows] = await pool.execute(`DESCRIBE \`${tableName}\``);
    res.json({ success: true, table: tableName, structure: rows });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /execute
 * Exécuter une requête SQL (INSERT, UPDATE, DELETE)
 * Body: { query: "INSERT INTO ...", params: [] }
 * ⚠️ Utiliser avec précaution en production
 */
app.post('/execute', authenticate, async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'La requête SQL est requise' });
    }
    
    // En production, vous pourriez vouloir désactiver cette route
    const trimmedQuery = query.trim().toUpperCase();
    const allowedOperations = ['INSERT', 'UPDATE', 'DELETE'];
    const isAllowed = allowedOperations.some(op => trimmedQuery.startsWith(op));
    
    if (!isAllowed) {
      return res.status(403).json({ 
        error: 'Seules les opérations INSERT, UPDATE, DELETE sont autorisées' 
      });
    }
    
    const [result] = await pool.execute(query, params);
    res.json({ 
      success: true, 
      affectedRows: result.affectedRows,
      insertId: result.insertId 
    });
    
  } catch (error) {
    console.error('[MySQL Proxy] Erreur exécution:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Démarrer le serveur
async function start() {
  await initPool();
  
  app.listen(PORT, () => {
    console.log(`[MySQL Proxy] 🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`[MySQL Proxy] 📊 Base de données: ${dbConfig.database}`);
    console.log(`[MySQL Proxy] 🔐 Token d'authentification: ${AUTH_TOKEN}`);
    console.log(`[MySQL Proxy] 📝 Endpoints disponibles:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /tables (nécessite token)`);
    console.log(`   GET  /table/:tableName (nécessite token)`);
    console.log(`   GET  /table/:tableName/structure (nécessite token)`);
    console.log(`   POST /query (nécessite token)`);
    console.log(`   POST /execute (nécessite token)`);
    console.log(`\n[MySQL Proxy] 🌐 Pour exposer via ngrok: ngrok http ${PORT}`);
  });
}

start().catch(console.error);

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  console.log('[MySQL Proxy] Arrêt en cours...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

