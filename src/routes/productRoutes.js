/**
 * Product Routes
 * Routes for product catalog and real-time product data
 */

const express = require('express');
const ProductController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/products/:productId
 * @desc    Get real-time product details (when user clicks into product page)
 * @access  Private
 */
router.get('/:productId', ProductController.getProductDetails);

/**
 * @route   GET /api/v1/products/:productId/checkout-link
 * @desc    Generate affiliate checkout link
 * @access  Private
 */
router.get('/:productId/checkout-link', ProductController.getCheckoutLink);

/**
 * @route   POST /api/v1/products/:productId/cart
 * @desc    Add product to cart (triggers real-time price refresh)
 * @access  Private
 */
router.post('/:productId/cart', ProductController.addToCart);

/**
 * @route   POST /api/v1/products/cart-batch
 * @desc    Get real-time data for multiple cart items
 * @access  Private
 */
router.post('/cart-batch', ProductController.getCartItemsData);

/**
 * @route   GET /api/v1/products/stats/cost
 * @desc    Get API cost statistics (admin only)
 * @access  Private
 */
router.get('/stats/cost', ProductController.getCostStats);

/**
 * @route   GET /api/v1/products/stats/cache
 * @desc    Get cache performance statistics (admin only)
 * @access  Private
 */
router.get('/stats/cache', ProductController.getCacheStats);

/**
 * @route   GET /api/v1/products/stats/batch-imports
 * @desc    Get batch import statistics (admin only)
 * @access  Private
 */
router.get('/stats/batch-imports', ProductController.getBatchImportStats);

/**
 * @route   POST /api/v1/products/admin/batch-import
 * @desc    Manually trigger batch import (admin only)
 * @access  Private (Admin)
 */
router.post('/admin/batch-import', ProductController.triggerBatchImport);

module.exports = router;
