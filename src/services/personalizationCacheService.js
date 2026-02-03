const cache = new Map();

class PersonalizationCacheService {
  static get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  static set(key, value, ttlMs = 60000) {
    cache.set(key, { value, expires: Date.now() + ttlMs });
  }
}

module.exports = PersonalizationCacheService;
