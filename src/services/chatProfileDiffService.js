const pool = require('../db/pool');
const ShopperProfileService = require('./shopperProfileService');
const PreferencesService = require('./preferencesService');

class ChatProfileDiffService {
  static async snapshotDiff(userId, beforeProfile, afterProfile) {
    await pool.query(
      `INSERT INTO chat_profile_diffs (user_id, before_profile, after_profile)
       VALUES ($1, $2, $3)`,
      [userId, JSON.stringify(beforeProfile), JSON.stringify(afterProfile)]
    );
  }

  static async captureBeforeAfter(userId, fn) {
    const before = {
      shopper: await ShopperProfileService.getShopperProfile(userId).catch(() => null),
      preferences: await PreferencesService.getPreferences(userId).catch(() => null),
    };

    await fn();

    const after = {
      shopper: await ShopperProfileService.getShopperProfile(userId).catch(() => null),
      preferences: await PreferencesService.getPreferences(userId).catch(() => null),
    };

    await this.snapshotDiff(userId, before, after);
  }
}

module.exports = ChatProfileDiffService;
