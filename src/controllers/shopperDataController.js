/**
 * Shopper Data Controller
 * API endpoints for shopper data management, privacy, and activity tracking
 */

const ShopperDataService = require('../services/shopperDataService');
const logger = require('../utils/logger');

class ShopperDataController {
  /**
   * Track shopper activity
   * POST /api/shopper/activity
   */
  static async trackActivity(req, res) {
    try {
      const userId = req.userId;
      const {
        activityType,
        activityCategory,
        pageUrl,
        pageType,
        productId,
        brandId,
        itemId,
        searchQuery,
        searchFilters,
        interactionData,
        moduleId,
        positionInFeed,
        durationSeconds
      } = req.body;

      // Get session ID from request
      const sessionId = req.session?.id || req.sessionID || `session_${userId}_${Date.now()}`;

      // Get device info from request
      const deviceInfo = {
        deviceType: req.useragent?.isMobile ? 'mobile' : req.useragent?.isTablet ? 'tablet' : 'desktop',
        browser: req.useragent?.browser,
        platform: req.useragent?.platform,
        viewportWidth: req.body.viewportWidth,
        viewportHeight: req.body.viewportHeight
      };

      // Check if user is in any active experiments
      let experimentId = null;
      let variantId = null;

      if (moduleId) {
        // Get experiment assignment for this module
        const ExperimentService = require('../services/experimentService');
        const assignment = await ExperimentService.getModuleExperimentAssignment(userId, moduleId);
        if (assignment && assignment.in_experiment) {
          experimentId = assignment.experiment_id;
          variantId = assignment.variant_id;
        }
      }

      await ShopperDataService.trackActivity({
        userId,
        sessionId,
        activityType,
        activityCategory,
        pageUrl,
        pageType,
        referrerUrl: req.headers.referer,
        productId,
        brandId,
        itemId,
        searchQuery,
        searchFilters,
        interactionData,
        experimentId,
        variantId,
        moduleId,
        positionInFeed,
        ...deviceInfo,
        durationSeconds
      });

      res.status(200).json({
        success: true,
        message: 'Activity tracked'
      });
    } catch (error) {
      logger.error('Error in trackActivity controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track activity'
      });
    }
  }

  /**
   * Get shopper activity history
   * GET /api/shopper/activity
   */
  static async getActivity(req, res) {
    try {
      const userId = req.userId;
      const { limit, offset, activityTypes, startDate, endDate } = req.query;

      const options = {
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0,
        activityTypes: activityTypes ? activityTypes.split(',') : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        includeAnonymized: false
      };

      const activities = await ShopperDataService.getShopperActivity(userId, options);

      res.status(200).json({
        success: true,
        data: activities,
        count: activities.length
      });
    } catch (error) {
      logger.error('Error in getActivity controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve activity'
      });
    }
  }

  /**
   * Get engagement metrics
   * GET /api/shopper/metrics
   */
  static async getMetrics(req, res) {
    try {
      const userId = req.userId;

      const metrics = await ShopperDataService.getEngagementMetrics(userId);
      const engagementScore = await ShopperDataService.calculateEngagementScore(userId);

      res.status(200).json({
        success: true,
        data: {
          ...metrics,
          engagement_score: engagementScore
        }
      });
    } catch (error) {
      logger.error('Error in getMetrics controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }

  /**
   * Get shopper segments
   * GET /api/shopper/segments
   */
  static async getSegments(req, res) {
    try {
      const userId = req.userId;

      // Evaluate and update segments
      const segments = await ShopperDataService.evaluateShopperSegments(userId);

      res.status(200).json({
        success: true,
        data: segments
      });
    } catch (error) {
      logger.error('Error in getSegments controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve segments'
      });
    }
  }

  /**
   * Update privacy consent
   * POST /api/shopper/privacy/consent
   */
  static async updateConsent(req, res) {
    try {
      const userId = req.userId;
      const consents = req.body;

      const context = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        consentMethod: 'settings_update'
      };

      await ShopperDataService.updatePrivacyConsent(userId, consents, context);

      res.status(200).json({
        success: true,
        message: 'Privacy consent updated'
      });
    } catch (error) {
      logger.error('Error in updateConsent controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update consent'
      });
    }
  }

  /**
   * Export user data (GDPR)
   * GET /api/shopper/data/export
   */
  static async exportData(req, res) {
    try {
      const userId = req.userId;

      const userData = await ShopperDataService.exportUserData(userId);

      res.status(200).json({
        success: true,
        data: userData
      });
    } catch (error) {
      logger.error('Error in exportData controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }

  /**
   * Request data deletion (GDPR)
   * POST /api/shopper/data/delete
   */
  static async requestDeletion(req, res) {
    try {
      const userId = req.userId;

      // Mark for deletion (actual deletion happens after grace period)
      await ShopperDataService.anonymizeUserData(userId, 'user_request');

      res.status(200).json({
        success: true,
        message: 'Data deletion request submitted. Your data will be anonymized within 30 days.'
      });
    } catch (error) {
      logger.error('Error in requestDeletion controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process deletion request'
      });
    }
  }

  /**
   * Get shopper context for personalization
   * GET /api/shopper/context
   */
  static async getContext(req, res) {
    try {
      const userId = req.userId;

      const context = await ShopperDataService.getShopperContextForRecommendations(userId);

      res.status(200).json({
        success: true,
        data: context
      });
    } catch (error) {
      logger.error('Error in getContext controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve shopper context'
      });
    }
  }
}

module.exports = ShopperDataController;
