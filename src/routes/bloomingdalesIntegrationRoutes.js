/**
 * Bloomingdales Integration Routes
 * Connects Bloomingdales inventory to Muse items catalog
 */

const express = require('express');
const router = express.Router();
const bloomingdalesIntegrationService = require('../services/bloomingdalesIntegrationService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/bloomingdales-integration/sync
 * Sync Bloomingdales products into items table
 */
router.post('/sync', async (req, res) => {
  try {
    logger.info('[Bloomingdales Integration API] Starting sync');

    const result = await bloomingdalesIntegrationService.syncBloomingdalesToItems();

    res.json({
      success: true,
      message: 'Bloomingdales products synced to items catalog',
      data: result
    });

  } catch (error) {
    logger.error('[Bloomingdales Integration API] Sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * GET /api/bloomingdales-integration/stats
 * Get integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await bloomingdalesIntegrationService.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('[Bloomingdales Integration API] Stats query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Stats query failed'
    });
  }
});

/**
 * GET /api/bloomingdales-integration/newsfeed
 * Get Bloomingdales products for user's followed brands
 */
router.get('/newsfeed', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;

    const items = await bloomingdalesIntegrationService.getBloomingdalesItemsForNewsfeed(userId, limit);

    res.json({
      success: true,
      data: items,
      count: items.length
    });

  } catch (error) {
    logger.error('[Bloomingdales Integration API] Newsfeed query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Newsfeed query failed'
    });
  }
});

module.exports = router;
