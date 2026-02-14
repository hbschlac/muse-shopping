/**
 * Nordstrom Integration Routes
 * Connects Nordstrom inventory to Muse items catalog
 */

const express = require('express');
const router = express.Router();
const nordstromIntegrationService = require('../services/nordstromIntegrationService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/nordstrom-integration/sync
 * Sync Nordstrom products into items table
 * Admin/internal use
 */
router.post('/sync', async (req, res) => {
  try {
    logger.info('[Nordstrom Integration API] Starting sync');

    const result = await nordstromIntegrationService.syncNordstromToItems();

    res.json({
      success: true,
      message: 'Nordstrom products synced to items catalog',
      data: result
    });

  } catch (error) {
    logger.error('[Nordstrom Integration API] Sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Nordstrom products'
    });
  }
});

/**
 * POST /api/nordstrom-integration/update-prices
 * Update item prices from latest Nordstrom data
 */
router.post('/update-prices', async (req, res) => {
  try {
    logger.info('[Nordstrom Integration API] Updating prices');

    const result = await nordstromIntegrationService.updatePricesFromNordstrom();

    res.json({
      success: true,
      message: 'Prices updated from Nordstrom',
      data: result
    });

  } catch (error) {
    logger.error('[Nordstrom Integration API] Price update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prices'
    });
  }
});

/**
 * GET /api/nordstrom-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await nordstromIntegrationService.getIntegrationStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('[Nordstrom Integration API] Stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration stats'
    });
  }
});

/**
 * GET /api/nordstrom-integration/brand/:brandName
 * Get Nordstrom products for a specific brand
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;

    const items = await nordstromIntegrationService.getNordstromItemsForBrand(brandName);

    res.json({
      success: true,
      data: items,
      count: items.length
    });

  } catch (error) {
    logger.error('[Nordstrom Integration API] Brand query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get brand products'
    });
  }
});

/**
 * GET /api/nordstrom-integration/newsfeed
 * Get Nordstrom products for user's followed brands
 * Requires authentication
 */
router.get('/newsfeed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const items = await nordstromIntegrationService.getNordstromItemsForNewsfeed(userId, limit);

    res.json({
      success: true,
      data: items,
      count: items.length
    });

  } catch (error) {
    logger.error('[Nordstrom Integration API] Newsfeed query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get newsfeed items'
    });
  }
});

module.exports = router;
