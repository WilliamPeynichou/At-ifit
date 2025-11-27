/**
 * Tunnel MySQL pour n8n
 * 
 * Ce script crée un tunnel TCP pour exposer MySQL local sur internet
 * Utilise ngrok ou un proxy TCP personnalisé
 */

const net = require('net');

// Configuration MySQL depuis config.json
const config = require('../config/config.json');
const dbConfig = config.development;

// Configuration du tunnel
const TUNNEL_PORT = process.env.TUNNEL_PORT || 33060; // Port local pour le tunnel
const MYSQL_HOST = dbConfig.host;
const MYSQL_PORT = dbConfig.port;

/**
 * Crée un proxy TCP qui redirige les connexions vers MySQL
 */
function createMySQLProxy() {
  const server = net.createServer((clientSocket) => {
    console.log(`[MySQL Tunnel] Nouvelle connexion depuis ${clientSocket.remoteAddress}`);
    
    // Connexion à MySQL
    const mysqlSocket = net.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT
    }, () => {
      console.log(`[MySQL Tunnel] Connecté à MySQL ${MYSQL_HOST}:${MYSQL_PORT}`);
    });

    // Rediriger les données du client vers MySQL
    clientSocket.on('data', (data) => {
      mysqlSocket.write(data);
    });

    // Rediriger les données de MySQL vers le client
    mysqlSocket.on('data', (data) => {
      clientSocket.write(data);
    });

    // Gérer les erreurs
    clientSocket.on('error', (err) => {
      console.error('[MySQL Tunnel] Erreur client:', err.message);
      mysqlSocket.destroy();
    });

    mysqlSocket.on('error', (err) => {
      console.error('[MySQL Tunnel] Erreur MySQL:', err.message);
      clientSocket.destroy();
    });

    // Fermer les connexions
    clientSocket.on('close', () => {
      console.log('[MySQL Tunnel] Connexion client fermée');
      mysqlSocket.destroy();
    });

    mysqlSocket.on('close', () => {
      clientSocket.destroy();
    });
  });

  server.listen(TUNNEL_PORT, () => {
    console.log(`[MySQL Tunnel] Proxy TCP démarré sur le port ${TUNNEL_PORT}`);
    console.log(`[MySQL Tunnel] Redirige vers MySQL ${MYSQL_HOST}:${MYSQL_PORT}`);
    console.log(`[MySQL Tunnel] Pour utiliser avec ngrok: ngrok tcp ${TUNNEL_PORT}`);
  });

  server.on('error', (err) => {
    console.error('[MySQL Tunnel] Erreur serveur:', err.message);
  });
}

// Démarrer le proxy
createMySQLProxy();

