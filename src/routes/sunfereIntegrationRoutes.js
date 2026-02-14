/**
 * Sunfere Integration API Routes
 * Endpoints for syncing Sunfere products to main catalog
 */

const express = require('express');
const router = express.Router();
const sunfereIntegrationService = require('../services/sunfereIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/sunfere-integration/sync
 * Sync Sunfere products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await sunfereIntegrationService.syncSunfereToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Sunfere Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

/**
 * POST /api/v1/sunfere-integration/update-prices
 * Update item prices from latest Sunfere scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await sunfereIntegrationService.updatePricesFromSunfere();
    res.json(result);
  } catch (error) {
    logger.error('[Sunfere Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * GET /api/v1/sunfere-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await sunfereIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Sunfere Integration API] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/v1/sunfere-integration/brand/:brandName
 * Get Sunfere products for a brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const products = await sunfereIntegrationService.getSunfereItemsForBrand(brandName);
    res.json(products);
  } catch (error) {
    logger.error('[Sunfere Integration API] Error getting brand products:', error);
    res.status(500).json({ error: 'Failed to get brand products' });
  }
});

/**
 * GET /api/v1/sunfere-integration/newsfeed
 * Get Sunfere products for user's followed brands
 */
router.get('/newsfeed', async (req, res) => {
  try {
    const userId = req.user?.id; // Assumes auth middleware
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const products = await sunfereIntegrationService.getSunfereItemsForNewsfeed(userId, limit);
    res.json(products);
  } catch (error) {
    logger.error('[Sunfere Integration API] Error getting newsfeed:', error);
    res.status(500).json({ error: 'Failed to get newsfeed' });
  }
});

module.exports = router;
