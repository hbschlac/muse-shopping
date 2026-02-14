const express = require('express');
const router = express.Router();
const curatedCampaignService = require('../../services/curatedCampaignService');
const { body } = require('express-validator');
const authMiddleware = require('../../middleware/authMiddleware');

// All admin routes require authentication
router.use(authMiddleware);

/**
 * GET /api/v1/admin/curated-campaigns
 * List all curated campaigns with filters and pagination
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      campaignType: req.query.campaignType,
      placementSlot: req.query.placementSlot,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const campaigns = await curatedCampaignService.listCampaigns(filters);

    // Get counts by status for dashboard
    const statusCounts = await curatedCampaignService.getCampaignCountsByStatus();

    res.json({
      success: true,
      data: {
        campaigns,
        statusCounts,
        pagination: {
          limit: filters.limit,
          offset: filters.offset
        }
      }
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list campaigns'
    });
  }
});

/**
 * GET /api/v1/admin/curated-campaigns/:campaignId
 * Get detailed campaign info
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await curatedCampaignService.getCampaignDetails(campaignId);

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
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign details'
    });
  }
});

/**
 * POST /api/v1/admin/curated-campaigns
 * Create a new curated campaign
 */
router.post(
  '/',
  [
    body('name').notEmpty().trim().isLength({ max: 255 }),
    body('campaignType').isIn([
      'seasonal_collection',
      'trend_spotlight',
      'style_edit',
      'new_arrivals',
      'sale_promotion',
      'brand_story',
      'gift_guide',
      'occasion_based',
      'editorial'
    ]),
    body('placementSlot').isIn([
      'homepage_hero',
      'newsfeed_top',
      'newsfeed_position_3',
      'newsfeed_position_5',
      'newsfeed_position_8',
      'stories_carousel',
      'category_hero',
      'search_hero'
    ])
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;

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
      console.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign'
      });
    }
  }
);

/**
 * PUT /api/v1/admin/curated-campaigns/:campaignId
 * Update a campaign
 */
router.put('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;

    const campaign = await curatedCampaignService.updateCampaign(campaignId, updates);

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign'
    });
  }
});

/**
 * PATCH /api/v1/admin/curated-campaigns/:campaignId/status
 * Update campaign status (draft -> scheduled -> active -> paused -> completed)
 */
router.patch('/:campaignId/status', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;

    if (!['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const campaign = await curatedCampaignService.updateCampaign(campaignId, { status });

    res.json({
      success: true,
      data: campaign,
      message: `Campaign status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign status'
    });
  }
});

/**
 * DELETE /api/v1/admin/curated-campaigns/:campaignId
 * Delete a campaign
 */
router.delete('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    await curatedCampaignService.deleteCampaign(campaignId);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign'
    });
  }
});

/**
 * POST /api/v1/admin/curated-campaigns/:campaignId/items
 * Add items to a campaign
 */
router.post('/:campaignId/items', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { items } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items)) {
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
    console.error('Error adding items to campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add items to campaign'
    });
  }
});

/**
 * DELETE /api/v1/admin/curated-campaigns/:campaignId/items
 * Remove items from a campaign
 */
router.delete('/:campaignId/items', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) {
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
    console.error('Error removing items from campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove items from campaign'
    });
  }
});

/**
 * GET /api/v1/admin/curated-campaigns/:campaignId/performance
 * Get campaign analytics and performance metrics
 */
router.get('/:campaignId/performance', async (req, res) => {
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
    console.error('Error getting campaign performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign performance'
    });
  }
});

/**
 * GET /api/v1/admin/curated-campaigns/analytics/overview
 * Get overall analytics across all campaigns
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const overview = await curatedCampaignService.getCampaignsOverview({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error getting campaigns overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaigns overview'
    });
  }
});

/**
 * POST /api/v1/admin/curated-campaigns/collections
 * Create a reusable collection
 */
router.post(
  '/collections',
  [
    body('name').notEmpty().trim().isLength({ max: 255 }),
    body('collectionType').isIn(['manual', 'algorithmic', 'hybrid'])
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;

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
      console.error('Error creating collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create collection'
      });
    }
  }
);

/**
 * POST /api/v1/admin/curated-campaigns/:campaignId/duplicate
 * Duplicate an existing campaign
 */
router.post('/:campaignId/duplicate', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;

    const duplicatedCampaign = await curatedCampaignService.duplicateCampaign(
      campaignId,
      userId
    );

    res.status(201).json({
      success: true,
      data: duplicatedCampaign,
      message: 'Campaign duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate campaign'
    });
  }
});

/**
 * GET /api/v1/admin/curated-campaigns/templates
 * Get campaign templates for quick creation
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        name: 'Seasonal Collection',
        campaignType: 'seasonal_collection',
        placementSlot: 'homepage_hero',
        headline: 'Shop the Season',
        subheadline: 'Discover the latest trends for [Season]',
        callToAction: 'Explore Collection'
      },
      {
        name: 'New Arrivals',
        campaignType: 'new_arrivals',
        placementSlot: 'newsfeed_position_3',
        headline: 'Just In',
        subheadline: 'Fresh styles just landed',
        callToAction: 'Shop New'
      },
      {
        name: 'Sale Promotion',
        campaignType: 'sale_promotion',
        placementSlot: 'homepage_hero',
        headline: 'Sale Now On',
        subheadline: 'Up to 70% off selected styles',
        callToAction: 'Shop Sale'
      },
      {
        name: 'Gift Guide',
        campaignType: 'gift_guide',
        placementSlot: 'category_hero',
        headline: 'Gift Guide',
        subheadline: 'Find the perfect gift for every occasion',
        callToAction: 'Explore Gifts'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates'
    });
  }
});

module.exports = router;
