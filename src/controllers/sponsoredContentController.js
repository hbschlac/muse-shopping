/**
 * Sponsored Content Controller
 * Handles HTTP requests for sponsored content campaigns
 */

const SponsoredContentService = require('../services/sponsoredContentService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class SponsoredContentController {
  /**
   * Create new sponsored campaign
   * POST /api/v1/sponsored/campaigns
   */
  static async createCampaign(req, res, next) {
    try {
      const userId = req.userId;
      const campaignData = req.body;

      // Validate required fields
      if (!campaignData.campaignName || !campaignData.campaignCode || !campaignData.budgetAmount) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'campaignName, campaignCode, and budgetAmount are required'
        ));
      }

      const campaign = await SponsoredContentService.createCampaign(campaignData, userId);

      return res.status(201).json(successResponse(campaign, 'Campaign created successfully'));
    } catch (error) {
      logger.error('Error in createCampaign:', error);
      next(error);
    }
  }

  /**
   * Get all campaigns
   * GET /api/v1/sponsored/campaigns
   */
  static async getAllCampaigns(req, res, next) {
    try {
      const { status, brand_id, is_active, limit, offset } = req.query;

      const filters = {
        status,
        brandId: brand_id ? parseInt(brand_id) : null,
        isActive: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const campaigns = await SponsoredContentService.getAllCampaigns(filters);

      return res.status(200).json(successResponse({ campaigns }, 'Campaigns retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAllCampaigns:', error);
      next(error);
    }
  }

  /**
   * Get campaign by ID
   * GET /api/v1/sponsored/campaigns/:id
   */
  static async getCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      const campaign = await SponsoredContentService.getCampaign(campaignId);

      if (!campaign) {
        return res.status(404).json(errorResponse('NOT_FOUND', 'Campaign not found'));
      }

      return res.status(200).json(successResponse(campaign, 'Campaign retrieved successfully'));
    } catch (error) {
      logger.error('Error in getCampaign:', error);
      next(error);
    }
  }

  /**
   * Update campaign
   * PUT /api/v1/sponsored/campaigns/:id
   */
  static async updateCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const updates = req.body;

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      const campaign = await SponsoredContentService.updateCampaign(campaignId, updates);

      return res.status(200).json(successResponse(campaign, 'Campaign updated successfully'));
    } catch (error) {
      logger.error('Error in updateCampaign:', error);
      next(error);
    }
  }

  /**
   * Approve campaign
   * POST /api/v1/sponsored/campaigns/:id/approve
   */
  static async approveCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const userId = req.userId;

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      const campaign = await SponsoredContentService.approveCampaign(campaignId, userId);

      return res.status(200).json(successResponse(campaign, 'Campaign approved successfully'));
    } catch (error) {
      logger.error('Error in approveCampaign:', error);
      next(error);
    }
  }

  /**
   * Reject campaign
   * POST /api/v1/sponsored/campaigns/:id/reject
   */
  static async rejectCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      if (!reason) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Rejection reason is required'));
      }

      const campaign = await SponsoredContentService.rejectCampaign(campaignId, reason);

      return res.status(200).json(successResponse(campaign, 'Campaign rejected'));
    } catch (error) {
      logger.error('Error in rejectCampaign:', error);
      next(error);
    }
  }

  /**
   * Activate campaign
   * POST /api/v1/sponsored/campaigns/:id/activate
   */
  static async activateCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      const campaign = await SponsoredContentService.activateCampaign(campaignId);

      return res.status(200).json(successResponse(campaign, 'Campaign activated'));
    } catch (error) {
      logger.error('Error in activateCampaign:', error);
      next(error);
    }
  }

  /**
   * Pause campaign
   * POST /api/v1/sponsored/campaigns/:id/pause
   */
  static async pauseCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      const campaign = await SponsoredContentService.pauseCampaign(campaignId);

      return res.status(200).json(successResponse(campaign, 'Campaign paused'));
    } catch (error) {
      logger.error('Error in pauseCampaign:', error);
      next(error);
    }
  }

  /**
   * Get campaign performance
   * GET /api/v1/sponsored/campaigns/:id/performance
   */
  static async getCampaignPerformance(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const { start_date, end_date } = req.query;

      if (isNaN(campaignId)) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid campaign ID'));
      }

      const startDate = start_date ? new Date(start_date) : null;
      const endDate = end_date ? new Date(end_date) : null;

      const performance = await SponsoredContentService.getCampaignPerformance(
        campaignId,
        startDate,
        endDate
      );

      return res.status(200).json(successResponse(performance, 'Performance metrics retrieved'));
    } catch (error) {
      logger.error('Error in getCampaignPerformance:', error);
      next(error);
    }
  }

  /**
   * Track impression (called when user views sponsored content)
   * POST /api/v1/sponsored/impressions
   */
  static async trackImpression(req, res, next) {
    try {
      const userId = req.userId;
      const { campaign_id, placement, context } = req.body;

      if (!campaign_id || !placement) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'campaign_id and placement are required'
        ));
      }

      const impression = await SponsoredContentService.trackImpression(
        campaign_id,
        userId,
        placement,
        context || {}
      );

      return res.status(201).json(successResponse(impression, 'Impression tracked'));
    } catch (error) {
      logger.error('Error in trackImpression:', error);
      next(error);
    }
  }

  /**
   * Track click (called when user clicks sponsored content)
   * POST /api/v1/sponsored/clicks
   */
  static async trackClick(req, res, next) {
    try {
      const userId = req.userId;
      const { campaign_id, impression_id, context } = req.body;

      if (!campaign_id) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'campaign_id is required'));
      }

      const click = await SponsoredContentService.trackClick(
        campaign_id,
        userId,
        impression_id,
        context || {}
      );

      return res.status(201).json(successResponse(click, 'Click tracked'));
    } catch (error) {
      logger.error('Error in trackClick:', error);
      next(error);
    }
  }

  /**
   * Track conversion (called when user converts from sponsored content)
   * POST /api/v1/sponsored/conversions
   */
  static async trackConversion(req, res, next) {
    try {
      const userId = req.userId;
      const { campaign_id, click_id, conversion_data } = req.body;

      if (!campaign_id || !conversion_data || !conversion_data.conversionType) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'campaign_id and conversion_data.conversionType are required'
        ));
      }

      const conversion = await SponsoredContentService.trackConversion(
        campaign_id,
        userId,
        click_id,
        conversion_data
      );

      return res.status(201).json(successResponse(conversion, 'Conversion tracked'));
    } catch (error) {
      logger.error('Error in trackConversion:', error);
      next(error);
    }
  }

  /**
   * Get eligible campaigns for newsfeed
   * GET /api/v1/sponsored/eligible
   */
  static async getEligibleCampaigns(req, res, next) {
    try {
      const userId = req.userId;
      const { placement } = req.query;

      if (!placement) {
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'placement is required'));
      }

      // Get user context from request
      const userContext = {
        deviceType: req.headers['x-device-type'] || 'desktop',
        countryCode: req.headers['x-country-code'] || 'US',
        userAgent: req.headers['user-agent']
      };

      const campaigns = await SponsoredContentService.getEligibleCampaigns(
        userId,
        placement,
        userContext
      );

      return res.status(200).json(successResponse({ campaigns }, 'Eligible campaigns retrieved'));
    } catch (error) {
      logger.error('Error in getEligibleCampaigns:', error);
      next(error);
    }
  }
}

module.exports = SponsoredContentController;
