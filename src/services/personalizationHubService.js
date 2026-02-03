const BrandAffinityService = require('./brandAffinityService');
const ChatSegmentService = require('./chatSegmentService');
const PersonalizationCacheService = require('./personalizationCacheService');
const ShopperProfileService = require('./shopperProfileService');
const PreferencesService = require('./preferencesService');
const ChatPersonalizationService = require('./chatPersonalizationService');

class PersonalizationHubService {
  static async getUnifiedProfile(userId, sessionId = null) {
    const cacheKey = `${userId || "anon"}:${sessionId || "no-session"}`;
    const cached = PersonalizationCacheService.get(cacheKey);
    if (cached) return cached;
    const [shopper, preferences, chatProfile, sessionMemory, brandAffinity, segments] = await Promise.all([
      ShopperProfileService.getShopperProfile(userId),
      PreferencesService.getPreferences(userId).catch(() => null),
      ChatPersonalizationService.getUserProfile(userId),
      sessionId ? ChatPersonalizationService.getSessionMemory(sessionId) : Promise.resolve(null),
      BrandAffinityService.getBrandAffinity(userId),
      ChatSegmentService.listSegments().catch(() => []),
    ]);

    const unified = {
      shopper_profile: shopper,
      fashion_preferences: preferences,
      chat_profile: chatProfile,
      session_memory: sessionMemory,
      brand_affinity: brandAffinity,
      segments: segments,
    };
    PersonalizationCacheService.set(cacheKey, unified);
    return unified;
  }
}

module.exports = PersonalizationHubService;
