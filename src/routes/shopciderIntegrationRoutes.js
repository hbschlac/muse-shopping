/**
 * Shop Cider Integration API Routes
 * Endpoints for syncing Shop Cider products to main catalog
 */

const express = require('express');
const router = express.Router();
const shopciderIntegrationService = require('../services/shopciderIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/shopcider-integration/sync
 * Sync Shop Cider products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await shopciderIntegrationService.syncShopciderToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Shopcider Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

/**
 * POST /api/v1/shopcider-integration/update-prices
 * Update item prices from latest Shop Cider scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await shopciderIntegrationService.updatePricesFromShopcider();
    res.json(result);
  } catch (error) {
    logger.error('[Shopcider Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * GET /api/v1/shopcider-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await shopciderIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Shopcider Integration API] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/v1/shopcider-integration/brand/:brandName
 * Get Shop Cider products for a brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const products = await shopciderIntegrationService.getShopciderItemsForBrand(brandName);
    res.json(products);
  } catch (error) {
    logger.error('[Shopcider Integration API] Error getting brand products:', error);
    res.status(500).json({ error: 'Failed to get brand products' });
  }
});

/**
 * GET /api/v1/shopcider-integration/newsfeed
 * Get Shop Cider products for user's followed brands
 */
router.get('/newsfeed', async (req, res) => {
  try {
    const userId = req.user?.id; // Assumes auth middleware
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const products = await shopciderIntegrationService.getShopciderItemsForNewsfeed(userId, limit);
    res.json(products);
  } catch (error) {
    logger.error('[Shopcider Integration API] Error getting newsfeed:', error);
    res.status(500).json({ error: 'Failed to get newsfeed' });
  }
});

module.exports = router;
