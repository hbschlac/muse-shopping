const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = authMiddleware;

// Get campaign details with items
router.get('/:campaignId', optionalAuthMiddleware, campaignController.getCampaignDetails);

// Track campaign impression
router.post('/:campaignId/impressions', optionalAuthMiddleware, campaignController.trackImpression);

// Track campaign click
router.post('/:campaignId/clicks', optionalAuthMiddleware, campaignController.trackClick);

// Track campaign conversion
router.post('/:campaignId/conversions', optionalAuthMiddleware, campaignController.trackConversion);

module.exports = router;
