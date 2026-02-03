/**
 * Return Routes
 * API endpoints for managing returns
 */

const express = require('express');
const router = express.Router();
const ReturnController = require('../controllers/returnController');
const requireAuth = require('../middleware/authMiddleware');

// Check return eligibility for an order
router.get('/eligibility/:orderId', requireAuth, ReturnController.checkEligibility);

// Get user's returns
router.get('/', requireAuth, ReturnController.getUserReturns);

// Get specific return
router.get('/:returnId', requireAuth, ReturnController.getReturn);

// Initiate return
router.post('/', requireAuth, ReturnController.initiateReturn);

// Sync return status from retailer
router.post('/:returnId/sync', requireAuth, ReturnController.syncStatus);

module.exports = router;
