/**
 * Aritzia Integration API Routes
 * Endpoints for syncing Aritzia data with main Muse catalog
 */

const express = require('express');
const router = express.Router();
const aritziaIntegrationService = require('../services/aritziaIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/aritzia-integration/sync
 * Sync Aritzia products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await aritziaIntegrationService.syncAritziaToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Aritzia Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

/**
 * POST /api/v1/aritzia-integration/update-prices
 * Update prices from latest Aritzia scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await aritziaIntegrationService.updatePricesFromLatestScrape();
    res.json(result);
  } catch (error) {
    logger.error('[Aritzia Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Price update failed', message: error.message });
  }
});

/**
 * GET /api/v1/aritzia-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await aritziaIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Aritzia Integration API] Stats fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/v1/aritzia-integration/brand/:brandName
 * Get Aritzia products for a specific brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const products = await aritziaIntegrationService.getProductsByBrand(req.params.brandName);
    res.json({ products, count: products.length });
  } catch (error) {
    logger.error('[Aritzia Integration API] Brand fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v1/aritzia-integration/newsfeed
 * Get Aritzia items for user's newsfeed
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

    const items = await aritziaIntegrationService.getNewsfeedItems(userId, limit, offset);
    res.json({ items, count: items.length });
  } catch (error) {
    logger.error('[Aritzia Integration API] Newsfeed fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch newsfeed items' });
  }
});

module.exports = router;
