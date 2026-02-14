/**
 * Item Cache Service
 * Provides caching layer for frequently accessed item queries
 */

const crypto = require('crypto');

const cache = new Map();
const MAX_CACHE_SIZE = parseInt(process.env.ITEM_CACHE_SIZE) || 500;
const DEFAULT_TTL_MS = parseInt(process.env.ITEM_CACHE_TTL) || 180000; // 3 minutes
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

class ItemCacheService {
  /**
   * Generate cache key from query parameters
   */
  static generateKey(method, params) {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(`${method}:${normalized}`).digest('hex');
    return `item:${method}:${hash}`;
  }

  /**
   * Get cached result
   */
  static get(key) {
    const entry = cache.get(key);
    if (!entry) {
      this._recordMiss();
      return null;
    }

    if (Date.now() > entry.expires) {
      cache.delete(key);
      this._recordMiss();
      return null;
    }

    this._recordHit();
    entry.lastAccessed = Date.now();
    entry.hits++;
    return entry.value;
  }

  /**
   * Set cached result
   */
  static set(key, value, ttlMs = DEFAULT_TTL_MS) {
    // Implement LRU eviction if cache is full
    if (cache.size >= MAX_CACHE_SIZE) {
      this._evictLRU();
    }

    cache.set(key, {
      value,
      expires: Date.now() + ttlMs,
      lastAccessed: Date.now(),
      created: Date.now(),
      hits: 0,
    });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  static invalidate(pattern) {
    let invalidated = 0;
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
        invalidated++;
      }
    }
    console.log(`[ItemCache] Invalidated ${invalidated} entries matching: ${pattern}`);
    return invalidated;
  }

  /**
   * Clear all cache
   */
  static clear() {
    cache.clear();
    this._resetStats();
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    let totalHits = 0;

    for (const [key, entry] of cache.entries()) {
      if (now > entry.expires) {
        expired++;
      } else {
        active++;
        totalHits += entry.hits;
      }
    }

    return {
      total: cache.size,
      active,
      expired,
      maxSize: MAX_CACHE_SIZE,
      totalHits,
      avgHitsPerEntry: active > 0 ? (totalHits / active).toFixed(2) : 0,
      hitRate: this._calculateHitRate(),
      hits: this.hits || 0,
      misses: this.misses || 0,
    };
  }

  /**
   * Evict least recently used entry
   */
  static _evictLRU() {
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
    }
  }

  /**
   * Cleanup expired entries
   */
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
      console.log(`[ItemCache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Record cache hit
   */
  static _recordHit() {
    this.hits = (this.hits || 0) + 1;
  }

  /**
   * Record cache miss
   */
  static _recordMiss() {
    this.misses = (this.misses || 0) + 1;
  }

  /**
   * Calculate hit rate
   */
  static _calculateHitRate() {
    const total = (this.hits || 0) + (this.misses || 0);
    if (total === 0) return 0;
    return ((this.hits || 0) / total * 100).toFixed(2);
  }

  /**
   * Reset statistics
   */
  static _resetStats() {
    this.hits = 0;
    this.misses = 0;
  }
}

// Start periodic cleanup
setInterval(() => {
  ItemCacheService._cleanupExpired();
}, CLEANUP_INTERVAL_MS);

module.exports = ItemCacheService;
