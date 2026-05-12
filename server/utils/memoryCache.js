/**
 * Cache mémoire simple avec TTL, scopé par clé.
 * Usage :
 *   const cached = cache.get('athlete:42');
 *   if (cached) return cached;
 *   const fresh = await fetchExpensive();
 *   cache.set('athlete:42', fresh, 3600); // 1h TTL
 *
 * Pour 4 users c'est largement suffisant — pas besoin de Redis.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 3600) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  deletePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }

  /**
   * Wrapper : si cache hit retourne, sinon exécute fn() et met en cache.
   * Évite la stampede de cache (si fn est lent et que plusieurs appels arrivent en même temps,
   * tous attendent la même promise).
   */
  async getOrSet(key, fn, ttlSeconds = 3600) {
    const cached = this.get(key);
    if (cached !== null) return cached;

    // Coalescence : si déjà en cours de fetch, attend la promise
    if (this._inflight && this._inflight.has(key)) {
      return this._inflight.get(key);
    }

    if (!this._inflight) this._inflight = new Map();

    const promise = Promise.resolve()
      .then(fn)
      .then((value) => {
        this.set(key, value, ttlSeconds);
        return value;
      })
      .finally(() => this._inflight.delete(key));

    this._inflight.set(key, promise);
    return promise;
  }
}

// Singleton global pour tout le serveur
const cache = new MemoryCache();

module.exports = cache;
module.exports.MemoryCache = MemoryCache;
