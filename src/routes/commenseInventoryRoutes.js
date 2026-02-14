/**
 * The Commense Inventory API Routes
 * Endpoints for querying scraped The Commense product data
 */

const express = require('express');
const router = express.Router();
const commenseInventoryService = require('../services/commenseInventoryService');
const logger = require('../config/logger');

/**
 * GET /api/v1/commense/stats
 * Get inventory statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await commenseInventoryService.getInventoryStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Commense API] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get inventory statistics' });
  }
});

/**
 * GET /api/v1/commense/products
 * Get products with optional filters
 */
router.get('/products', async (req, res) => {
  try {
    const { brand, inStock, minPrice, maxPrice, category, limit, offset } = req.query;

    const filters = {
      brand,
      inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      category,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    };

    const result = await commenseInventoryService.getProducts(filters);
    res.json(result);
  } catch (error) {
    logger.error('[Commense API] Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

/**
 * GET /api/v1/commense/products/:productId
 * Get a single product by ID
 */
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await commenseInventoryService.getProducts({ limit: 1 });
    const product = result.products.find(p => p.product_id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('[Commense API] Error getting product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

/**
 * GET /api/v1/commense/products/:productId/price-history
 * Get price history for a product
 */
router.get('/products/:productId/price-history', async (req, res) => {
  try {
    const { productId } = req.params;
    const history = await commenseInventoryService.getPriceHistory(productId);
    res.json(history);
  } catch (error) {
    logger.error('[Commense API] Error getting price history:', error);
    res.status(500).json({ error: 'Failed to get price history' });
  }
});

/**
 * GET /api/v1/commense/brands
 * Get all brands
 */
router.get('/brands', async (req, res) => {
  try {
    const pool = require('../db/pool');
    const result = await pool.query(`
      SELECT DISTINCT brand_name, COUNT(*) as product_count
      FROM commense_products
      WHERE brand_name IS NOT NULL
      GROUP BY brand_name
      ORDER BY product_count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error('[Commense API] Error getting brands:', error);
    res.status(500).json({ error: 'Failed to get brands' });
  }
});

/**
 * GET /api/v1/commense/export/csv
 * Export all products to CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const result = await commenseInventoryService.getProducts({ limit: 10000 });

    // Create CSV header
    const csvHeader = 'product_id,product_name,brand_name,current_price,image_url,product_url,is_in_stock,category,subcategory,average_rating,review_count\n';

    // Create CSV rows
    const csvRows = result.products.map(p => {
      return [
        p.product_id,
        `"${(p.product_name || '').replace(/"/g, '""')}"`,
        `"${(p.brand_name || '').replace(/"/g, '""')}"`,
        p.current_price || '',
        p.image_url || '',
        p.product_url || '',
        p.is_in_stock ? 'true' : 'false',
        p.category || '',
        p.subcategory || '',
        p.average_rating || '',
        p.review_count || 0
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="commense_products.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('[Commense API] Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * POST /api/v1/commense/scrape/trigger
 * Manually trigger a scrape
 */
router.post('/scrape/trigger', async (req, res) => {
  try {
    // Run scrape in background
    commenseInventoryService.scrapeInventory().then(result => {
      logger.info('[Commense API] Scrape completed:', result);
    }).catch(error => {
      logger.error('[Commense API] Scrape failed:', error);
    });

    res.json({ message: 'Scrape started in background' });
  } catch (error) {
    logger.error('[Commense API] Error triggering scrape:', error);
    res.status(500).json({ error: 'Failed to trigger scrape' });
  }
});

module.exports = router;
