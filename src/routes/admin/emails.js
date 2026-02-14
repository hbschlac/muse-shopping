/**
 * Admin Email Routes
 * Routes for sending emails to shoppers
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const adminEmailController = require('../../controllers/adminEmailController');

// All routes require admin authentication
router.use(requireAdmin);

// Send email to a single shopper
router.post('/send', adminEmailController.sendToShopper);

// Send bulk email to multiple shoppers
router.post('/send/bulk', adminEmailController.sendBulk);

// Send email to shoppers matching criteria
router.post('/send/criteria', adminEmailController.sendByCriteria);

// Get email send history
router.get('/history', adminEmailController.getHistory);

// Get bulk send history
router.get('/history/bulk', adminEmailController.getBulkHistory);

module.exports = router;
