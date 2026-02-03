/**
 * Admin Newsfeed Management Routes
 */

const express = require('express');
const router = express.Router();
const PersonalizedRecommendationService = require('../../services/personalizedRecommendationService');
const pool = require('../../db/pool');
const { requireAdmin } = require('../../middleware/authMiddleware');

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * POST /admin/newsfeed/modules/:moduleId/populate
 * Populate a feed module with personalized items for testing
 */
router.post('/modules/:moduleId/populate', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { userId, limit = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const items = await PersonalizedRecommendationService.populateModuleWithPersonalizedItems(
      userId,
      parseInt(moduleId),
      limit
    );

    res.json({
      success: true,
      data: {
        module_id: parseInt(moduleId),
        items_added: items.length,
        items
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
 * POST /admin/newsfeed/sync-product-to-item
 * Sync a product from product_catalog to items table
 */
router.post('/sync-product-to-item', async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    const result = await pool.query(
      'SELECT sync_product_to_item($1) as item_id',
      [productId]
    );

    const itemId = result.rows[0].item_id;

    res.json({
      success: true,
      data: {
        product_id: productId,
        item_id: itemId,
        message: 'Product synced to items table successfully'
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
 * POST /admin/newsfeed/sync-all-products
 * Sync all active products from product_catalog to items
 */
router.post('/sync-all-products', async (req, res) => {
  try {
    const { limit = 100, storeId = null } = req.body;

    let query = `
      SELECT id
      FROM product_catalog
      WHERE sync_status = 'active'
        AND is_available = true
    `;
    const params = [];

    if (storeId) {
      query += ' AND store_id = $1';
      params.push(storeId);
    }

    query += ` ORDER BY last_batch_update DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const productsResult = await pool.query(query, params);
    const products = productsResult.rows;

    let synced = 0;
    let failed = 0;

    for (const product of products) {
      try {
        await pool.query('SELECT sync_product_to_item($1)', [product.id]);
        synced++;
      } catch (error) {
        failed++;
        console.error(`Failed to sync product ${product.id}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        total_products: products.length,
        synced,
        failed
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
 * GET /admin/newsfeed/recommendations/test
 * Test personalized recommendations for a user
 */
router.get('/recommendations/test', async (req, res) => {
  try {
    const { userId, brandId, category, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
    }

    const items = await PersonalizedRecommendationService.getPersonalizedItems(
      parseInt(userId),
      {
        brandId: brandId ? parseInt(brandId) : null,
        category,
        limit: parseInt(limit)
      }
    );

    // Get recommendation stats
    const stats = await PersonalizedRecommendationService.getRecommendationStats(
      parseInt(userId)
    );

    res.json({
      success: true,
      data: {
        stats,
        items,
        count: items.length
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
 * GET /admin/newsfeed/modules/:moduleId/preview
 * Preview personalized items for a module without adding them
 */
router.get('/modules/:moduleId/preview', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
    }

    const items = await PersonalizedRecommendationService.getPersonalizedModuleItems(
      parseInt(userId),
      parseInt(moduleId)
    );

    res.json({
      success: true,
      data: {
        module_id: parseInt(moduleId),
        user_id: parseInt(userId),
        items,
        count: items.length
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
 * GET /admin/newsfeed/stats/recommendations
 * Get recommendation statistics across all users
 */
router.get('/stats/recommendations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT user_id) as users_with_profiles,
        AVG(total_orders_analyzed) as avg_orders_analyzed,
        AVG(total_items_purchased) as avg_items_purchased,
        COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(interests, '[]'::jsonb)) > 0) as users_with_interests
      FROM shopper_profiles
    `);

    const itemsResult = await pool.query(`
      SELECT
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE is_available = true) as available_items,
        COUNT(DISTINCT brand_id) as unique_brands,
        COUNT(DISTINCT store_id) as unique_stores
      FROM items
    `);

    res.json({
      success: true,
      data: {
        profiles: result.rows[0],
        items: itemsResult.rows[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
