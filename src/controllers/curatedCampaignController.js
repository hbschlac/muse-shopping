const curatedCampaignService = require('../services/curatedCampaignService');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');

class CuratedCampaignController {
  /**
   * Get campaigns eligible for a specific placement
   * GET /api/v1/curated-campaigns/eligible
   */
  async getEligibleCampaigns(req, res) {
    try {
      const userId = req.user?.id;
      const { placementSlot, limit = 5 } = req.query;

      if (!placementSlot) {
        return res.status(400).json({
          success: false,
          message: 'placementSlot is required'
        });
      }

      const campaigns = await curatedCampaignService.getEligibleCampaigns(
        userId,
        placementSlot,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      logger.error('Error in getEligibleCampaigns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch eligible campaigns'
      });
    }
  }

  /**
   * Get campaign details with items
   * GET /api/v1/curated-campaigns/:campaignId
   */
  async getCampaignDetails(req, res) {
    try {
      const { campaignId } = req.params;
      const userId = req.user?.id;

      const campaign = await curatedCampaignService.getCampaignDetails(campaignId, userId);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      logger.error('Error in getCampaignDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign details'
      });
    }
  }

  /**
   * Get items for a campaign
   * GET /api/v1/curated-campaigns/:campaignId/items
   */
  async getCampaignItems(req, res) {
    try {
      const { campaignId } = req.params;
      const { limit = 20 } = req.query;

      const items = await curatedCampaignService.getCampaignItems(
        campaignId,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      logger.error('Error in getCampaignItems:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign items'
      });
    }
  }

  /**
   * Create a new curated campaign
   * POST /api/v1/curated-campaigns
   */
  async createCampaign(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const campaignData = {
        ...req.body,
        createdBy: userId
      };

      const campaign = await curatedCampaignService.createCampaign(campaignData);

      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully'
      });
    } catch (error) {
      logger.error('Error in createCampaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign'
      });
    }
  }

  /**
   * Update a campaign
   * PUT /api/v1/curated-campaigns/:campaignId
   */
  async updateCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const updates = req.body;

      const campaign = await curatedCampaignService.updateCampaign(campaignId, updates);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateCampaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update campaign'
      });
    }
  }

  /**
   * Add items to a campaign
   * POST /api/v1/curated-campaigns/:campaignId/items
   */
  async addItemsToCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { items } = req.body;
      const userId = req.user?.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required'
        });
      }

      await curatedCampaignService.addItemsToCampaign(campaignId, items, userId);

      res.json({
        success: true,
        message: `${items.length} items added to campaign`
      });
    } catch (error) {
      logger.error('Error in addItemsToCampaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add items to campaign'
      });
    }
  }

  /**
   * Remove items from a campaign
   * DELETE /api/v1/curated-campaigns/:campaignId/items
   */
  async removeItemsFromCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { itemIds } = req.body;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'itemIds array is required'
        });
      }

      await curatedCampaignService.removeItemsFromCampaign(campaignId, itemIds);

      res.json({
        success: true,
        message: `${itemIds.length} items removed from campaign`
      });
    } catch (error) {
      logger.error('Error in removeItemsFromCampaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove items from campaign'
      });
    }
  }

  /**
   * Track campaign impression
   * POST /api/v1/curated-campaigns/:campaignId/impressions
   */
  async trackImpression(req, res) {
    try {
      const { campaignId } = req.params;
      const userId = req.user?.id;
      const context = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const impressionId = await curatedCampaignService.trackImpression(
        campaignId,
        userId,
        context
      );

      res.json({
        success: true,
        data: { impressionId }
      });
    } catch (error) {
      logger.error('Error in trackImpression:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track impression'
      });
    }
  }

  /**
   * Track campaign click
   * POST /api/v1/curated-campaigns/:campaignId/clicks
   */
  async trackClick(req, res) {
    try {
      const { campaignId } = req.params;
      const userId = req.user?.id;
      const clickData = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const clickId = await curatedCampaignService.trackClick(
        campaignId,
        userId,
        clickData
      );

      res.json({
        success: true,
        data: { clickId }
      });
    } catch (error) {
      logger.error('Error in trackClick:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track click'
      });
    }
  }

  /**
   * Track campaign conversion
   * POST /api/v1/curated-campaigns/:campaignId/conversions
   */
  async trackConversion(req, res) {
    try {
      const { campaignId } = req.params;
      const userId = req.user?.id;
      const conversionData = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const conversionId = await curatedCampaignService.trackConversion(
        campaignId,
        userId,
        conversionData
      );

      res.json({
        success: true,
        data: { conversionId }
      });
    } catch (error) {
      logger.error('Error in trackConversion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track conversion'
      });
    }
  }

  /**
   * Get campaign performance analytics
   * GET /api/v1/curated-campaigns/:campaignId/performance
   */
  async getCampaignPerformance(req, res) {
    try {
      const { campaignId } = req.params;
      const { startDate, endDate } = req.query;

      const performance = await curatedCampaignService.getCampaignPerformance(
        campaignId,
        { startDate, endDate }
      );

      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error in getCampaignPerformance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign performance'
      });
    }
  }

  /**
   * List all campaigns with filters
   * GET /api/v1/curated-campaigns
   */
  async listCampaigns(req, res) {
    try {
      const filters = {
        status: req.query.status,
        campaignType: req.query.campaignType,
        placementSlot: req.query.placementSlot,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const campaigns = await curatedCampaignService.listCampaigns(filters);

      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      logger.error('Error in listCampaigns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list campaigns'
      });
    }
  }

  /**
   * Delete a campaign
   * DELETE /api/v1/curated-campaigns/:campaignId
   */
  async deleteCampaign(req, res) {
    try {
      const { campaignId } = req.params;

      await curatedCampaignService.deleteCampaign(campaignId);

      res.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteCampaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete campaign'
      });
    }
  }

  /**
   * Create a reusable collection
   * POST /api/v1/curated-campaigns/collections
   */
  async createCollection(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const collectionData = {
        ...req.body,
        createdBy: userId
      };

      const collection = await curatedCampaignService.createCollection(collectionData);

      res.status(201).json({
        success: true,
        data: collection,
        message: 'Collection created successfully'
      });
    } catch (error) {
      logger.error('Error in createCollection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create collection'
      });
    }
  }
}

module.exports = new CuratedCampaignController();
