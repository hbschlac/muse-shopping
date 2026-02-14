/**
 * Admin Signup Request Routes
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const adminSignupController = require('../../controllers/adminSignupController');

// Public route - submit signup request
router.post('/', adminSignupController.submitRequest);

// Admin-only routes
router.get('/pending', requireAdmin, adminSignupController.getPendingRequests);
router.get('/', requireAdmin, adminSignupController.getAllRequests);
router.post('/:id/approve', requireAdmin, adminSignupController.approveRequest);
router.post('/:id/reject', requireAdmin, adminSignupController.rejectRequest);

module.exports = router;
