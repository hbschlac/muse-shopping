/**
 * Admin Cache Management Routes
 * Provides endpoints for monitoring and managing application caches
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const PersonalizationCacheService = require('../../services/personalizationCacheService');
const ItemCacheService = require('../../services/itemCacheService');

/**
 * GET /api/v1/admin/cache/stats
 * Get statistics for all caches
 */
router.get('/stats', requireAdmin, (req, res) => {
  const personalizationStats = PersonalizationCacheService.getStats();
  const itemStats = ItemCacheService.getStats();

  res.json({
    success: true,
    data: {
      personalization: personalizationStats,
      items: itemStats,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/v1/admin/cache/personalization/stats
 * Get personalization cache statistics
 */
router.get('/personalization/stats', requireAdmin, (req, res) => {
  const stats = PersonalizationCacheService.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/v1/admin/cache/items/stats
 * Get item cache statistics
 */
router.get('/items/stats', requireAdmin, (req, res) => {
  const stats = ItemCacheService.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * POST /api/v1/admin/cache/clear
 * Clear all caches
 */
router.post('/clear', requireAdmin, (req, res) => {
  PersonalizationCacheService.clear();
  ItemCacheService.clear();

  res.json({
    success: true,
    message: 'All caches cleared successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/admin/cache/personalization/clear
 * Clear personalization cache only
 */
router.post('/personalization/clear', requireAdmin, (req, res) => {
  PersonalizationCacheService.clear();

  res.json({
    success: true,
    message: 'Personalization cache cleared successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/admin/cache/items/clear
 * Clear item cache only
 */
router.post('/items/clear', requireAdmin, (req, res) => {
  ItemCacheService.clear();

  res.json({
    success: true,
    message: 'Item cache cleared successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/admin/cache/items/invalidate
 * Invalidate specific item cache entries by pattern
 * Body: { pattern: 'findAll' | 'findById' | string }
 */
router.post('/items/invalidate', requireAdmin, (req, res) => {
  const { pattern } = req.body;

  if (!pattern) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PATTERN',
        message: 'Pattern is required',
      },
    });
  }

  const invalidated = ItemCacheService.invalidate(pattern);

  res.json({
    success: true,
    message: `Invalidated ${invalidated} cache entries matching pattern: ${pattern}`,
    data: {
      pattern,
      invalidated,
    },
  });
});

module.exports = router;
