/**
 * Aritzia Inventory API Routes
 * Academic research endpoints for Aritzia product data
 */

const express = require('express');
const router = express.Router();
const aritziaInventoryService = require('../services/aritziaInventoryService');
const logger = require('../config/logger');

/**
 * GET /api/v1/aritzia/stats
 * Get overall inventory statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await aritziaInventoryService.getInventoryStats();
    res.json(stats);
  } catch (error) {
    logger.error('[Aritzia API] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/v1/aritzia/products
 * Get products with optional filters
 * Query params: brand, inStock, minPrice, maxPrice, category, onSale, limit, offset
 */
router.get('/products', async (req, res) => {
  try {
    const filters = {
      brand: req.query.brand,
      inStock: req.query.inStock === 'true',
      onSale: req.query.onSale === 'true',
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const result = await aritziaInventoryService.getProducts(filters);
    res.json(result);
  } catch (error) {
    logger.error('[Aritzia API] Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v1/aritzia/products/:productId
 * Get single product by ID
 */
router.get('/products/:productId', async (req, res) => {
  try {
    const result = await aritziaInventoryService.getProducts({
      limit: 1,
      offset: 0
    });

    const product = result.products.find(p => p.product_id === req.params.productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('[Aritzia API] Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * GET /api/v1/aritzia/products/:productId/price-history
 * Get price history for a product
 */
router.get('/products/:productId/price-history', async (req, res) => {
  try {
    const history = await aritziaInventoryService.getPriceHistory(req.params.productId);
    res.json(history);
  } catch (error) {
    logger.error('[Aritzia API] Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

/**
 * GET /api/v1/aritzia/brands
 * Get all unique brands
 */
router.get('/brands', async (req, res) => {
  try {
    const result = await aritziaInventoryService.getProducts({ limit: 1000 });
    const brands = [...new Set(result.products.map(p => p.brand_name))].filter(Boolean);
    res.json({ brands });
  } catch (error) {
    logger.error('[Aritzia API] Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

/**
 * GET /api/v1/aritzia/export/csv
 * Export data as CSV for research
 */
router.get('/export/csv', async (req, res) => {
  try {
    const result = await aritziaInventoryService.getProducts({ limit: 10000 });

    // Create CSV
    const headers = [
      'Product ID', 'Name', 'Brand', 'Current Price', 'Original Price',
      'On Sale', 'Sale %', 'Category', 'Subcategory', 'Rating', 'Reviews',
      'In Stock', 'Colors', 'Sizes', 'Image URL', 'Product URL'
    ];

    const rows = result.products.map(p => [
      p.product_id,
      `"${p.product_name?.replace(/"/g, '""') || ''}"`,
      p.brand_name || '',
      p.current_price || '',
      p.original_price || '',
      p.is_on_sale ? 'Yes' : 'No',
      p.sale_percentage || '',
      p.category || '',
      p.subcategory || '',
      p.average_rating || '',
      p.review_count || 0,
      p.is_in_stock ? 'Yes' : 'No',
      p.available_colors?.join(';') || '',
      p.available_sizes?.join(';') || '',
      p.image_url || '',
      p.product_url || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=aritzia_data_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('[Aritzia API] Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * POST /api/v1/aritzia/scrape/trigger
 * Manually trigger a scrape (for testing/research)
 */
router.post('/scrape/trigger', async (req, res) => {
  try {
    // Don't await - return immediately and scrape in background
    aritziaInventoryService.scrapeInventory()
      .then(result => {
        logger.info('[Aritzia API] Scrape completed:', result);
      })
      .catch(error => {
        logger.error('[Aritzia API] Scrape failed:', error);
      });

    res.json({
      message: 'Scrape started in background',
      status: 'processing'
    });
  } catch (error) {
    logger.error('[Aritzia API] Error triggering scrape:', error);
    res.status(500).json({ error: 'Failed to trigger scrape' });
  }
});

module.exports = router;
