/**
 * Target Integration API Routes
 * Endpoints for syncing Target data with main Muse catalog
 */

const express = require('express');
const router = express.Router();
const targetIntegrationService = require('../services/targetIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/target-integration/sync
 * Sync Target products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await targetIntegrationService.syncTargetToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Target Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

/**
 * POST /api/v1/target-integration/update-prices
 * Update prices from latest Target scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await targetIntegrationService.updatePricesFromLatestScrape();
    res.json(result);
  } catch (error) {
    logger.error('[Target Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Price update failed', message: error.message });
  }
});

/**
 * GET /api/v1/target-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await targetIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Target Integration API] Stats fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/v1/target-integration/brand/:brandName
 * Get Target products for a specific brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const products = await targetIntegrationService.getProductsByBrand(req.params.brandName);
    res.json({ products, count: products.length });
  } catch (error) {
    logger.error('[Target Integration API] Brand fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v1/target-integration/newsfeed
 * Get Target items for user's newsfeed
 * Requires authentication
 */
router.get('/newsfeed', async (req, res) => {
  try {
    // Get user ID from auth (if implemented)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const items = await targetIntegrationService.getNewsfeedItems(userId, limit, offset);
    res.json({ items, count: items.length });
  } catch (error) {
    logger.error('[Target Integration API] Newsfeed fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch newsfeed items' });
  }
});

module.exports = router;
