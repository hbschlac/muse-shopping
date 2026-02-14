const express = require('express');
const router = express.Router();
const curatedCampaignController = require('../controllers/curatedCampaignController');
const { body, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Validation middleware
const validateCampaignCreation = [
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
  ]),
  body('priority').optional().isInt({ min: 0, max: 1000 }),
  body('startsAt').optional().isISO8601(),
  body('endsAt').optional().isISO8601(),
  body('headline').optional().isLength({ max: 200 }),
  body('subheadline').optional().isLength({ max: 300 }),
  body('callToAction').optional().isLength({ max: 100 }),
  body('items').optional().isArray(),
  body('collectionIds').optional().isArray()
];

// Public routes (with optional auth for personalization)

/**
 * Get campaigns eligible for a specific placement
 * Query params: placementSlot (required), limit (optional)
 */
router.get(
  '/eligible',
  optionalAuthMiddleware,
  curatedCampaignController.getEligibleCampaigns
);

/**
 * Get campaign details with items
 */
router.get(
  '/:campaignId',
  optionalAuthMiddleware,
  curatedCampaignController.getCampaignDetails
);

/**
 * Get items for a campaign
 * Query params: limit (optional)
 */
router.get(
  '/:campaignId/items',
  optionalAuthMiddleware,
  curatedCampaignController.getCampaignItems
);

// Tracking routes (require auth)

/**
 * Track campaign impression
 * Body: placementShown, deviceType, viewDurationSeconds, sessionId
 */
router.post(
  '/:campaignId/impressions',
  authMiddleware,
  curatedCampaignController.trackImpression
);

/**
 * Track campaign click
 * Body: impressionId, clickedItemId, clickType, sessionId
 */
router.post(
  '/:campaignId/clicks',
  authMiddleware,
  curatedCampaignController.trackClick
);

/**
 * Track campaign conversion
 * Body: clickId, conversionType, itemId, conversionValue, timeToConversionSeconds
 */
router.post(
  '/:campaignId/conversions',
  authMiddleware,
  curatedCampaignController.trackConversion
);

// Admin routes (require auth)

/**
 * List all campaigns with filters
 * Query params: status, campaignType, placementSlot, limit, offset
 */
router.get(
  '/',
  authMiddleware,
  curatedCampaignController.listCampaigns
);

/**
 * Create a new curated campaign
 * Body: name, description, campaignType, placementSlot, priority, startsAt, endsAt,
 *       heroImageUrl, thumbnailUrl, backgroundColor, textColor, headline, subheadline,
 *       callToAction, ctaUrl, targetAudience, geographicTargeting, maxImpressionsPerUser,
 *       showToNewUsersOnly, items, collectionIds
 */
router.post(
  '/',
  authMiddleware,
  validateCampaignCreation,
  curatedCampaignController.createCampaign
);

/**
 * Update a campaign
 * Body: any field from campaign (name, status, etc.)
 */
router.put(
  '/:campaignId',
  authMiddleware,
  curatedCampaignController.updateCampaign
);

/**
 * Delete a campaign
 */
router.delete(
  '/:campaignId',
  authMiddleware,
  curatedCampaignController.deleteCampaign
);

/**
 * Add items to a campaign
 * Body: items [{ itemId, position, customTitle, customDescription, customImageUrl }]
 */
router.post(
  '/:campaignId/items',
  authMiddleware,
  curatedCampaignController.addItemsToCampaign
);

/**
 * Remove items from a campaign
 * Body: itemIds [uuid, uuid, ...]
 */
router.delete(
  '/:campaignId/items',
  authMiddleware,
  curatedCampaignController.removeItemsFromCampaign
);

/**
 * Get campaign performance analytics
 * Query params: startDate, endDate
 */
router.get(
  '/:campaignId/performance',
  authMiddleware,
  curatedCampaignController.getCampaignPerformance
);

/**
 * Create a reusable collection
 * Body: name, description, collectionType, selectionRules, maxItems, items
 */
router.post(
  '/collections',
  authMiddleware,
  [
    body('name').notEmpty().trim().isLength({ max: 255 }),
    body('collectionType').isIn(['manual', 'algorithmic', 'hybrid']),
    body('maxItems').optional().isInt({ min: 1, max: 100 })
  ],
  curatedCampaignController.createCollection
);

module.exports = router;
