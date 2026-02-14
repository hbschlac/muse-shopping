/**
 * Urban Outfitters Integration API Routes
 * Endpoints for syncing Urban Outfitters data with main Muse catalog
 */

const express = require('express');
const router = express.Router();
const urbanoutfittersIntegrationService = require('../services/urbanoutfittersIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/urbanoutfitters-integration/sync
 * Sync Urban Outfitters products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await urbanoutfittersIntegrationService.syncUrbanOutfittersToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Urban Outfitters Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

/**
 * POST /api/v1/urbanoutfitters-integration/update-prices
 * Update prices from latest Urban Outfitters scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await urbanoutfittersIntegrationService.updatePricesFromLatestScrape();
    res.json(result);
  } catch (error) {
    logger.error('[Urban Outfitters Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Price update failed', message: error.message });
  }
});

/**
 * GET /api/v1/urbanoutfitters-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await urbanoutfittersIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Urban Outfitters Integration API] Stats fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/v1/urbanoutfitters-integration/brand/:brandName
 * Get Urban Outfitters products for a specific brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const products = await urbanoutfittersIntegrationService.getProductsByBrand(req.params.brandName);
    res.json({ products, count: products.length });
  } catch (error) {
    logger.error('[Urban Outfitters Integration API] Brand fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v1/urbanoutfitters-integration/newsfeed
 * Get Urban Outfitters items for user's newsfeed
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

    const items = await urbanoutfittersIntegrationService.getNewsfeedItems(userId, limit, offset);
    res.json({ items, count: items.length });
  } catch (error) {
    logger.error('[Urban Outfitters Integration API] Newsfeed fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch newsfeed items' });
  }
});

module.exports = router;
