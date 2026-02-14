/**
 * The Commense Integration API Routes
 * Endpoints for syncing The Commense products to main catalog
 */

const express = require('express');
const router = express.Router();
const commenseIntegrationService = require('../services/commenseIntegrationService');
const logger = require('../config/logger');

/**
 * POST /api/v1/commense-integration/sync
 * Sync The Commense products to items table
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await commenseIntegrationService.syncCommenseToItems();
    res.json(result);
  } catch (error) {
    logger.error('[Commense Integration API] Sync failed:', error);
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

/**
 * POST /api/v1/commense-integration/update-prices
 * Update item prices from latest The Commense scrape
 */
router.post('/update-prices', async (req, res) => {
  try {
    const result = await commenseIntegrationService.updatePricesFromCommense();
    res.json(result);
  } catch (error) {
    logger.error('[Commense Integration API] Price update failed:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * GET /api/v1/commense-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await commenseIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Commense Integration API] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/v1/commense-integration/brand/:brandName
 * Get The Commense products for a brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const products = await commenseIntegrationService.getCommenseItemsForBrand(brandName);
    res.json(products);
  } catch (error) {
    logger.error('[Commense Integration API] Error getting brand products:', error);
    res.status(500).json({ error: 'Failed to get brand products' });
  }
});

/**
 * GET /api/v1/commense-integration/newsfeed
 * Get The Commense products for user's followed brands
 */
router.get('/newsfeed', async (req, res) => {
  try {
    const userId = req.user?.id; // Assumes auth middleware
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const products = await commenseIntegrationService.getCommenseItemsForNewsfeed(userId, limit);
    res.json(products);
  } catch (error) {
    logger.error('[Commense Integration API] Error getting newsfeed:', error);
    res.status(500).json({ error: 'Failed to get newsfeed' });
  }
});

module.exports = router;
