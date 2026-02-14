/**
 * Nordstrom Inventory API Routes
 * Provides access to scraped Nordstrom inventory data for academic research
 */

const express = require('express');
const router = express.Router();
const nordstromInventoryService = require('../services/nordstromInventoryService');
const { getSchedulerStatus } = require('../jobs/nordstromInventoryScheduler');
const logger = require('../config/logger');

/**
 * GET /api/nordstrom/stats
 * Get overall inventory statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await nordstromInventoryService.getInventoryStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('[Nordstrom API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory statistics'
    });
  }
});

/**
 * GET /api/nordstrom/products
 * Get products with filtering
 * Query params: brand, inStock, minPrice, maxPrice, category, limit, offset
 */
router.get('/products', async (req, res) => {
  try {
    const filters = {
      brand: req.query.brand,
      inStock: req.query.inStock === 'true' ? true : req.query.inStock === 'false' ? false : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const result = await nordstromInventoryService.getProducts(filters);

    res.json({
      success: true,
      data: result.products,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        pages: Math.ceil(result.total / result.limit)
      }
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error getting products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve products'
    });
  }
});

/**
 * GET /api/nordstrom/products/:productId
 * Get specific product details
 */
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await nordstromInventoryService.getProducts({ limit: 1 });
    const product = result.products.find(p => p.product_id === productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error getting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve product'
    });
  }
});

/**
 * GET /api/nordstrom/products/:productId/price-history
 * Get price history for a product
 */
router.get('/products/:productId/price-history', async (req, res) => {
  try {
    const { productId } = req.params;

    const history = await nordstromInventoryService.getPriceHistory(productId);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error getting price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve price history'
    });
  }
});

/**
 * GET /api/nordstrom/brands
 * Get list of all brands with product counts
 */
router.get('/brands', async (req, res) => {
  try {
    const pool = require('../db/pool');
    const client = await pool.connect();

    const result = await client.query(`
      SELECT
        brand_name,
        COUNT(*) as product_count,
        AVG(current_price) as avg_price,
        COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock_count
      FROM nordstrom_products
      WHERE brand_name IS NOT NULL
      GROUP BY brand_name
      ORDER BY product_count DESC
    `);

    client.release();

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error getting brands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve brands'
    });
  }
});

/**
 * GET /api/nordstrom/snapshots
 * Get inventory snapshots (daily summaries)
 */
router.get('/snapshots', async (req, res) => {
  try {
    const pool = require('../db/pool');
    const client = await pool.connect();

    const limit = req.query.limit ? parseInt(req.query.limit) : 30;

    const result = await client.query(`
      SELECT
        snapshot_date,
        total_products,
        in_stock_products,
        out_of_stock_products,
        average_price,
        scrape_duration_seconds,
        scrape_status,
        created_at
      FROM nordstrom_inventory_snapshots
      ORDER BY snapshot_date DESC
      LIMIT $1
    `, [limit]);

    client.release();

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error getting snapshots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve snapshots'
    });
  }
});

/**
 * GET /api/nordstrom/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = getSchedulerStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scheduler status'
    });
  }
});

/**
 * POST /api/nordstrom/scrape/trigger
 * Manually trigger a scrape (protected endpoint - add auth as needed)
 */
router.post('/scrape/trigger', async (req, res) => {
  try {
    logger.info('[Nordstrom API] Manual scrape triggered');

    // Run async - don't wait for completion
    const { runInventoryScrape } = require('../jobs/nordstromInventoryJob');
    runInventoryScrape()
      .then(() => logger.info('[Nordstrom API] Manual scrape completed'))
      .catch(err => logger.error('[Nordstrom API] Manual scrape failed:', err));

    res.json({
      success: true,
      message: 'Scrape job triggered. Check logs for progress.'
    });

  } catch (error) {
    logger.error('[Nordstrom API] Error triggering scrape:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger scrape'
    });
  }
});

/**
 * GET /api/nordstrom/export/csv
 * Export products as CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const filters = {
      brand: req.query.brand,
      inStock: req.query.inStock === 'true' ? true : req.query.inStock === 'false' ? false : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      category: req.query.category,
      limit: 10000 // Export max 10k products
    };

    const result = await nordstromInventoryService.getProducts(filters);

    // Generate CSV
    const headers = [
      'Product ID',
      'Product Name',
      'Brand',
      'Price',
      'In Stock',
      'Rating',
      'Reviews',
      'Category',
      'Subcategory',
      'First Seen',
      'Last Seen',
      'Image URL',
      'Product URL'
    ];

    const csvRows = [headers.join(',')];

    result.products.forEach(product => {
      const row = [
        product.product_id,
        `"${product.product_name?.replace(/"/g, '""') || ''}"`,
        `"${product.brand_name?.replace(/"/g, '""') || ''}"`,
        product.current_price || '',
        product.is_in_stock ? 'Yes' : 'No',
        product.average_rating || '',
        product.review_count || 0,
        `"${product.category?.replace(/"/g, '""') || ''}"`,
        `"${product.subcategory?.replace(/"/g, '""') || ''}"`,
        product.first_seen_at || '',
        product.last_seen_at || '',
        product.image_url || '',
        product.product_url || ''
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=nordstrom_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    logger.error('[Nordstrom API] Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV'
    });
  }
});

module.exports = router;
