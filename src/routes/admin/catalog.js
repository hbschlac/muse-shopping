/**
 * Admin Catalog Management Routes
 */

const express = require('express');
const router = express.Router();
const CatalogSyncService = require('../../services/catalogSyncService');
const ProductMatchingService = require('../../services/productMatchingService');
const { requireAdmin } = require('../../middleware/authMiddleware');

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * POST /admin/catalog/sync/queue
 * Queue a new catalog sync job
 */
router.post('/sync/queue', async (req, res) => {
  try {
    const {
      storeId,
      syncType = 'full',
      priority = 50,
      categoryFilter,
      brandFilter,
      scheduledFor,
      metadata
    } = req.body;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'storeId is required'
      });
    }

    if (!['full', 'incremental', 'category', 'brand'].includes(syncType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid syncType. Must be one of: full, incremental, category, brand'
      });
    }

    const job = await CatalogSyncService.queueSync({
      storeId,
      syncType,
      priority,
      categoryFilter,
      brandFilter,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      metadata: metadata || {}
    });

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/catalog/sync/queue
 * Get sync queue status
 */
router.get('/sync/queue', async (req, res) => {
  try {
    const { storeId, status, limit } = req.query;

    const jobs = await CatalogSyncService.getQueueStatus({
      storeId: storeId ? parseInt(storeId) : null,
      status,
      limit: limit ? parseInt(limit) : 50
    });

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/catalog/sync/stats
 * Get sync statistics
 */
router.get('/sync/stats', async (req, res) => {
  try {
    const { storeId } = req.query;

    const stats = await CatalogSyncService.getSyncStats(
      storeId ? parseInt(storeId) : null
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /admin/catalog/sync/cleanup
 * Clean up old sync jobs
 */
router.delete('/sync/cleanup', async (req, res) => {
  try {
    const { daysOld = 30 } = req.query;

    const deletedCount = await CatalogSyncService.cleanupOldJobs(
      parseInt(daysOld)
    );

    res.json({
      success: true,
      data: {
        deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/catalog/matching/find
 * Find potential matches for a product
 */
router.post('/matching/find', async (req, res) => {
  try {
    const { productId, minSimilarity = 0.75 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    const matches = await ProductMatchingService.findPotentialMatches(
      productId,
      minSimilarity
    );

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/catalog/matching/create-group
 * Create a match group
 */
router.post('/matching/create-group', async (req, res) => {
  try {
    const {
      productIds,
      canonicalName,
      canonicalBrandId,
      category,
      productType,
      matchMethod = 'manual',
      confidenceScore = 1.0
    } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'productIds array is required'
      });
    }

    const matchGroup = await ProductMatchingService.createMatchGroup(
      productIds,
      {
        canonicalName,
        canonicalBrandId,
        category,
        productType,
        matchMethod,
        confidenceScore
      }
    );

    res.json({
      success: true,
      data: matchGroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/catalog/matching/group/:id
 * Get match group with products
 */
router.get('/matching/group/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const matchGroup = await ProductMatchingService.getMatchGroup(
      parseInt(id)
    );

    res.json({
      success: true,
      data: matchGroup
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/catalog/matching/auto-match
 * Auto-match products using similarity algorithm
 */
router.post('/matching/auto-match', async (req, res) => {
  try {
    const {
      brandId,
      category,
      minSimilarity = 0.80,
      limit = 100
    } = req.body;

    const results = await ProductMatchingService.autoMatchProducts({
      brandId,
      category,
      minSimilarity,
      limit
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/catalog/matching/stats
 * Get matching statistics
 */
router.get('/matching/stats', async (req, res) => {
  try {
    const stats = await ProductMatchingService.getMatchStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /admin/catalog/matching/group/:id/update-stats
 * Update match group statistics
 */
router.put('/matching/group/:id/update-stats', async (req, res) => {
  try {
    const { id } = req.params;

    const matchGroup = await ProductMatchingService.updateMatchGroupStats(
      parseInt(id)
    );

    res.json({
      success: true,
      data: matchGroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
