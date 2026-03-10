const crypto = require('crypto');
const logger = require('./logger');

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.ENCRYPTION_KEY || '';

/**
 * Retourne la clé de chiffrement (32 octets) depuis l'env.
 * Lance une erreur en production si absente.
 */
function getKey() {
  if (!KEY_HEX) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY manquante — requis en production');
    }
    // Dev sans clé : pas de chiffrement (tokens stockés en clair avec warning)
    return null;
  }
  const buf = Buffer.from(KEY_HEX, 'hex');
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY doit être 64 caractères hex (32 octets)');
  }
  return buf;
}

/**
 * Chiffre une valeur string. Retourne `null` si la valeur est vide.
 * Format : `iv_hex:ciphertext_hex`
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const key = getKey();
  if (!key) {
    // Dev sans clé : stockage en clair avec prefixe pour identifier
    logger.warn('[Encryption] ENCRYPTION_KEY absente — token stocké en clair (dev only)');
    return plaintext;
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Déchiffre une valeur. Retourne `null` si vide.
 * Gère la rétrocompatibilité (tokens non chiffrés sans le séparateur `:iv:`).
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const key = getKey();
  if (!key) {
    return ciphertext; // Dev sans clé
  }

  // Rétrocompatibilité : token non chiffré (pas de format iv:ciphertext)
  if (!ciphertext.includes(':')) {
    logger.warn('[Encryption] Token non chiffré détecté — sera rechiffré au prochain accès');
    return ciphertext;
  }

  try {
    const [ivHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    logger.error('[Encryption] Échec déchiffrement — token potentiellement corrompu', { error: err.message });
    return null;
  }
}

module.exports = { encrypt, decrypt };
