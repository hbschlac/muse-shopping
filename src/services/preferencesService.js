const UserPreference = require('../models/UserPreference');
const User = require('../models/User');
const { NotFoundError } = require('../utils/errors');

class PreferencesService {
  static async getPreferences(userId) {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    let preferences = await UserPreference.find(userId);

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await UserPreference.create(userId);
    }

    return preferences;
  }

  static async updatePreferences(userId, updates) {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const preferences = await UserPreference.upsert(userId, updates);
    return preferences;
  }

  static async patchPreferences(userId, updates) {
    // For PATCH, we merge with existing preferences
    const existing = await this.getPreferences(userId);

    const merged = {
      preferred_colors: updates.preferred_colors || existing.preferred_colors,
      preferred_styles: updates.preferred_styles || existing.preferred_styles,
      preferred_categories: updates.preferred_categories || existing.preferred_categories,
      avoided_materials: updates.avoided_materials || existing.avoided_materials,
      fit_preferences: updates.fit_preferences || existing.fit_preferences,
      occasions: updates.occasions || existing.occasions,
    };

    return this.updatePreferences(userId, merged);
  }
}

module.exports = PreferencesService;
