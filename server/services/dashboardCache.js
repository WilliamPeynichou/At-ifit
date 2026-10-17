const cache = require('../utils/memoryCache');

const DASHBOARD_TTL_SECONDS = 600;

// Génération par user : incrémentée à chaque invalidation. Un calcul lancé avant une
// invalidation ne doit pas écrire son résultat (il peut avoir lu des données périmées).
const generations = new Map();

function generationOf(userId) {
  return generations.get(String(userId)) || 0;
}

/**
 * Clé de cache dashboard : dash:<userId>:<sport>:<JSON des paramètres>.
 * Le jour local est inclus : les périodes par défaut (30D, YTD…) dépendent de « maintenant »,
 * donc une entrée ne doit jamais survivre au changement de jour (même résultat qu'en non-caché).
 * Le ':' après userId garantit que invalidateUserDashboards(1) ne touche pas l'user 12.
 */
function localDay() {
  return new Date().toLocaleDateString('en-CA');
}

function dashKey(userId, sport, parts = {}) {
  return `dash:${userId}:${sport}:${JSON.stringify({ day: localDay(), ...(parts ?? {}) })}`;
}

function userIdFromKey(key) {
  const match = /^dash:([^:]+):/.exec(key);
  return match ? match[1] : null;
}

/**
 * Renvoie la valeur en cache, sinon exécute fn() et la met en cache (TTL en secondes).
 * Seul le résultat calculé doit être passé ici ; les champs frais (sync, user) restent hors cache.
 */
async function getOrCompute(key, ttlSec = DASHBOARD_TTL_SECONDS, fn) {
  const cached = cache.get(key);
  if (cached !== null) return cached;

  const userId = userIdFromKey(key);
  const generationBefore = userId === null ? null : generationOf(userId);
  const value = await fn();

  const stale = userId !== null && generationOf(userId) !== generationBefore;
  if (!stale) cache.set(key, value, ttlSec);
  return value;
}

/** Supprime toutes les entrées dashboard d'un user (après sync, enrichissement, webhook, profil). */
function invalidateUserDashboards(userId) {
  const id = String(userId);
  generations.set(id, generationOf(id) + 1);
  cache.deletePrefix(`dash:${id}:`);
}

module.exports = {
  DASHBOARD_TTL_SECONDS,
  dashKey,
  getOrCompute,
  invalidateUserDashboards,
};
