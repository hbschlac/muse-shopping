const cache = new Map();
const MAX_CACHE_SIZE = parseInt(process.env.PERSONALIZATION_CACHE_SIZE) || 1000;
const DEFAULT_TTL_MS = parseInt(process.env.PERSONALIZATION_CACHE_TTL) || 300000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

class PersonalizationCacheService {
  static get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      cache.delete(key);
      return null;
    }
    // Update last accessed time for LRU
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  static set(key, value, ttlMs = DEFAULT_TTL_MS) {
    // Implement LRU eviction if cache is full
    if (cache.size >= MAX_CACHE_SIZE) {
      this._evictLRU();
    }
    cache.set(key, {
      value,
      expires: Date.now() + ttlMs,
      lastAccessed: Date.now(),
      created: Date.now()
    });
  }

  static delete(key) {
    cache.delete(key);
  }

  static clear() {
    cache.clear();
  }

  static getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, entry] of cache.entries()) {
      if (now > entry.expires) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: cache.size,
      active,
      expired,
      maxSize: MAX_CACHE_SIZE,
      hitRate: this._calculateHitRate()
    };
  }

  static _evictLRU() {
    // Find and remove the least recently used entry
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      console.log(`[PersonalizationCache] Evicted LRU entry: ${oldestKey}`);
    }
  }

  static _cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of cache.entries()) {
      if (now > entry.expires) {
        cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[PersonalizationCache] Cleaned up ${cleaned} expired entries`);
    }
  }

  static _calculateHitRate() {
    // This would need to be tracked separately in a production system
    // For now, return null as we don't track hits/misses
    return null;
  }
}

// Start periodic cleanup
setInterval(() => {
  PersonalizationCacheService._cleanupExpired();
}, CLEANUP_INTERVAL_MS);

module.exports = PersonalizationCacheService;
