/**
 * In-memory cache with TTL support
 * For production, replace with Redis or similar
 */
class CacheStore {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSec - Time-to-live in seconds
   */
  set(key, value, ttlSec) {
    const expiresAt = Date.now() + ttlSec * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get cache value if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get cache size for monitoring
   * @returns {number} Number of entries
   */
  size() {
    return this.store.size;
  }
}

// Global cache instance
export const cache = new CacheStore();
