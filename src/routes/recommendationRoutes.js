const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const RecommendationTabsService = require('../services/recommendationTabsService');
const EnhancedRecommendationService = require('../services/enhancedRecommendationService');
const logger = require('../config/logger');

/**
 * GET /api/v1/recommendations/tabs
 * Get all active recommendation tabs
 */
router.get('/tabs', authenticateToken, async (req, res) => {
  try {
    const tabs = await RecommendationTabsService.getActiveTabs();

    res.status(200).json({
      success: true,
      data: { tabs }
    });
  } catch (error) {
    logger.error('Failed to get recommendation tabs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation tabs'
    });
  }
});

/**
 * GET /api/v1/recommendations/tabs/:tabKey/items
 * Get items for a specific tab
 */
router.get('/tabs/:tabKey/items', authenticateToken, async (req, res) => {
  try {
    const { tabKey } = req.params;
    const { limit = 20, offset = 0, currentItemId } = req.query;
    const userId = req.userId;

    const items = await RecommendationTabsService.getTabItems(userId, tabKey, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      currentItemId: currentItemId ? parseInt(currentItemId) : null
    });

    res.status(200).json({
      success: true,
      data: {
        tab_key: tabKey,
        items,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: items.length
        }
      }
    });
  } catch (error) {
    logger.error(`Failed to get items for tab ${req.params.tabKey}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tab items'
    });
  }
});

/**
 * POST /api/v1/recommendations/tabs/:tabKey/click
 * Track click on tab item
 */
router.post('/tabs/:tabKey/click', authenticateToken, async (req, res) => {
  try {
    const { tabKey } = req.params;
    const userId = req.userId;

    await RecommendationTabsService.trackTabItemClick(userId, tabKey);

    res.status(200).json({
      success: true,
      data: { tracked: true }
    });
  } catch (error) {
    logger.error(`Failed to track click for tab ${req.params.tabKey}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to track click'
    });
  }
});

/**
 * GET /api/v1/recommendations/user-preferences
 * Get user's top tabs (for analytics/personalization)
 */
router.get('/user-preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 3 } = req.query;

    const topTabs = await RecommendationTabsService.getUserTopTabs(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: { top_tabs: topTabs }
    });
  } catch (error) {
    logger.error('Failed to get user tab preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user preferences'
    });
  }
});

// ============================================================================
// ENHANCED PERSONALIZED RECOMMENDATIONS
// ============================================================================

/**
 * GET /api/v1/recommendations/personalized
 * Get enhanced personalized recommendations using shopper data
 * Query params:
 *   - context: 'newsfeed', 'search', 'product_detail', 'cart'
 *   - limit: number of recommendations (default: 20)
 *   - moduleId: feed module ID for experiment tracking
 */
router.get('/personalized', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      context = 'newsfeed',
      limit = 20,
      offset = 0,
      categoryFilter,
      brandFilter,
      moduleId,
    } = req.query;

    const result = await EnhancedRecommendationService.getPersonalizedRecommendations(userId, {
      context,
      limit: parseInt(limit),
      offset: parseInt(offset),
      categoryFilter: categoryFilter || null,
      brandFilter: brandFilter ? parseInt(brandFilter) : null,
      moduleId: moduleId ? parseInt(moduleId) : null,
      sessionId: req.sessionID,
    });

    res.status(200).json({
      success: true,
      data: {
        items: result.recommendations,
        metadata: result.metadata,
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.recommendations.length,
      },
    });
  } catch (error) {
    logger.error('Error getting personalized recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get personalized recommendations',
    });
  }
});

/**
 * GET /api/v1/recommendations/similar/:productId
 * Get similar product recommendations
 */
router.get('/similar/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;
    const { limit = 10 } = req.query;

    const result = await EnhancedRecommendationService.getPersonalizedRecommendations(userId, {
      context: 'product_detail',
      limit: parseInt(limit),
      sessionId: req.sessionID,
    });

    res.status(200).json({
      success: true,
      data: {
        product_id: parseInt(productId),
        items: result.recommendations,
        algorithm: result.metadata.algorithm,
      },
    });
  } catch (error) {
    logger.error('Error getting similar products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get similar products',
    });
  }
});

module.exports = router;
