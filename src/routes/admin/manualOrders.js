/**
 * Admin Manual Orders Routes
 * Routes for operations team to manage manual order placement
 */

const express = require('express');
const router = express.Router();
const ManualOrderController = require('../../controllers/admin/manualOrderController');
const authMiddleware = require('../../middleware/authMiddleware');
// const adminMiddleware = require('../../middleware/adminMiddleware'); // TODO: Implement admin check

// All routes require authentication (and admin role in production)
router.use(authMiddleware);
// router.use(adminMiddleware); // TODO: Uncomment when admin middleware is implemented

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
