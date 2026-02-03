const pool = require('../db/pool');
const ShopperProfileService = require('./shopperProfileService');
const PreferencesService = require('./preferencesService');

class ChatProfileVersionService {
  static async snapshot(userId) {
    const snapshot = {
      shopper: await ShopperProfileService.getShopperProfile(userId).catch(() => null),
      preferences: await PreferencesService.getPreferences(userId).catch(() => null),
    };

    const result = await pool.query(
      `INSERT INTO chat_profile_versions (user_id, snapshot)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, JSON.stringify(snapshot)]
    );
    return result.rows[0];
  }

  static async listVersions(userId, limit = 20) {
    const result = await pool.query(
      `SELECT id, snapshot, created_at
       FROM chat_profile_versions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async restoreVersion(userId, versionId) {
    const res = await pool.query(
      `SELECT snapshot FROM chat_profile_versions WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );
    if (res.rows.length == 0) return null;
    const snapshot = res.rows[0].snapshot || {};

    if (snapshot.shopper) {
      await pool.query(
        `INSERT INTO shopper_profiles (user_id, favorite_categories, common_sizes, price_range, interests, last_analyzed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET favorite_categories = EXCLUDED.favorite_categories,
               common_sizes = EXCLUDED.common_sizes,
               price_range = EXCLUDED.price_range,
               interests = EXCLUDED.interests,
               updated_at = NOW()`,
        [
          userId,
          JSON.stringify(snapshot.shopper.favoriteCategories || {}),
          JSON.stringify(snapshot.shopper.commonSizes || []),
          JSON.stringify(snapshot.shopper.priceRange || {}),
          JSON.stringify(snapshot.shopper.interests || []),
        ]
      );
    }

    if (snapshot.preferences) {
      await PreferencesService.updatePreferences(userId, {
        preferred_colors: snapshot.preferences.preferred_colors || [],
        preferred_styles: snapshot.preferences.preferred_styles || [],
        preferred_categories: snapshot.preferences.preferred_categories || [],
        avoided_materials: snapshot.preferences.avoided_materials || [],
        fit_preferences: snapshot.preferences.fit_preferences || [],
        occasions: snapshot.preferences.occasions || [],
      });
    }

    await pool.query('INSERT INTO chat_profile_restore_audits (user_id, version_id, restored_by) VALUES ($1, $2, $3)', [userId, versionId, null]);

    return snapshot;
  }
}

module.exports = ChatProfileVersionService;
