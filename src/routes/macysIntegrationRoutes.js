/**
 * Macys Integration API Routes
 * Endpoints for syncing Macys data with main Muse catalog
 */

const express = require('express');
const router = express.Router();
const macysIntegrationService = require('../services/macysIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/macys-integration/sync
 * Sync Macys products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await macysIntegrationService.syncMacysToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Macys Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

/**
 * POST /api/v1/macys-integration/update-prices
 * Update prices from latest Macys scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await macysIntegrationService.updatePricesFromLatestScrape();
    res.json(result);
  } catch (error) {
    logger.error('[Macys Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Price update failed', message: error.message });
  }
});

/**
 * GET /api/v1/macys-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await macysIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Macys Integration API] Stats fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/v1/macys-integration/brand/:brandName
 * Get Macys products for a specific brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const products = await macysIntegrationService.getProductsByBrand(req.params.brandName);
    res.json({ products, count: products.length });
  } catch (error) {
    logger.error('[Macys Integration API] Brand fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v1/macys-integration/newsfeed
 * Get Macys items for user's newsfeed
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

    const items = await macysIntegrationService.getNewsfeedItems(userId, limit, offset);
    res.json({ items, count: items.length });
  } catch (error) {
    logger.error('[Macys Integration API] Newsfeed fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch newsfeed items' });
  }
});

module.exports = router;
