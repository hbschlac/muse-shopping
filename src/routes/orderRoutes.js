/**
 * Order Routes
 * Handles order tracking and management API endpoints
 */

const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// All order routes require authentication
router.use(authMiddleware);

/**
 * Order management
 */

// Get order statistics (must come before /:orderNumber route)
router.get('/stats', OrderController.getOrderStats);

// Get all orders for user
router.get('/', OrderController.getUserOrders);

// Get specific order by Muse order number
router.get('/:orderNumber', OrderController.getOrder);

// Update order tracking (webhook/admin endpoint)
router.put('/:orderNumber/tracking', OrderController.updateTracking);

module.exports = router;
