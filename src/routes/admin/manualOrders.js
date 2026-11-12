/**
 * Admin Manual Orders Routes
 * Routes for operations team to manage manual order placement
 */

const express = require('express');
const router = express.Router();
const ManualOrderController = require('../../controllers/admin/manualOrderController');
const { requireAdmin } = require('../../middleware/authMiddleware');

// Admin only: these show shoppers' emails and shipping/billing addresses and
// change order status. A sign-in alone is not enough.
router.use(requireAdmin);

/**
 * Manual order management
 */

// Get statistics (must come before /:orderNumber)
router.get('/stats', ManualOrderController.getStatistics);

// Get all pending manual orders
router.get('/', ManualOrderController.getPendingOrders);

// Get specific order details
router.get('/:orderNumber', ManualOrderController.getOrderDetails);

// Get placement instructions for order
router.get('/:orderNumber/instructions', ManualOrderController.getPlacementInstructions);

// Mark order as placed
router.post('/:orderNumber/place', ManualOrderController.markAsPlaced);

// Mark order as failed
router.post('/:orderNumber/fail', ManualOrderController.markAsFailed);

module.exports = router;
