const PreferencesService = require('../services/preferencesService');
const { successResponse } = require('../utils/responseFormatter');

class PreferencesController {
  static async getPreferences(req, res, next) {
    try {
      const preferences = await PreferencesService.getPreferences(req.userId);
      res.status(200).json(successResponse({ preferences }));
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req, res, next) {
    try {
      const preferences = await PreferencesService.updatePreferences(req.userId, req.body);
      res.status(200).json(successResponse({ preferences }, 'Preferences updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async patchPreferences(req, res, next) {
    try {
      const preferences = await PreferencesService.patchPreferences(req.userId, req.body);
      res.status(200).json(successResponse({ preferences }, 'Preferences updated successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PreferencesController;
