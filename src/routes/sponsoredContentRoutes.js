/**
 * Sponsored Content Routes
 * Routes for managing sponsored content campaigns
 */

const express = require('express');
const SponsoredContentController = require('../controllers/sponsoredContentController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ========================================
// Public / User Routes (with auth)
// ========================================

// Track impression (requires auth)
router.post('/impressions', authMiddleware, SponsoredContentController.trackImpression);

// Track click (requires auth)
router.post('/clicks', authMiddleware, SponsoredContentController.trackClick);

// Track conversion (requires auth)
router.post('/conversions', authMiddleware, SponsoredContentController.trackConversion);

// Get eligible campaigns for placement (requires auth)
router.get('/eligible', authMiddleware, SponsoredContentController.getEligibleCampaigns);

// ========================================
// Marketing Admin Routes
// ========================================

// Create campaign (admin only)
router.post('/campaigns', authMiddleware, requireAdmin, SponsoredContentController.createCampaign);

// Get all campaigns (admin only)
router.get('/campaigns', authMiddleware, requireAdmin, SponsoredContentController.getAllCampaigns);

// Get campaign by ID (admin only)
router.get('/campaigns/:id', authMiddleware, requireAdmin, SponsoredContentController.getCampaign);

// Update campaign (admin only)
router.put('/campaigns/:id', authMiddleware, requireAdmin, SponsoredContentController.updateCampaign);

// Approve campaign (admin only)
router.post('/campaigns/:id/approve', authMiddleware, requireAdmin, SponsoredContentController.approveCampaign);

// Reject campaign (admin only)
router.post('/campaigns/:id/reject', authMiddleware, requireAdmin, SponsoredContentController.rejectCampaign);

// Activate campaign (admin only)
router.post('/campaigns/:id/activate', authMiddleware, requireAdmin, SponsoredContentController.activateCampaign);

// Pause campaign (admin only)
router.post('/campaigns/:id/pause', authMiddleware, requireAdmin, SponsoredContentController.pauseCampaign);

// Get campaign performance (admin only)
router.get('/campaigns/:id/performance', authMiddleware, requireAdmin, SponsoredContentController.getCampaignPerformance);

module.exports = router;
