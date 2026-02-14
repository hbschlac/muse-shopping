/**
 * Instagram Scan Routes
 * Routes for Instagram follower scanning and curator discovery
 */

const express = require('express');
const InstagramScanController = require('../controllers/instagramScanController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/v1/instagram/scan
 * @desc    Scan Instagram followers for curators
 * @access  Protected
 */
router.post('/scan', authMiddleware, InstagramScanController.scanFollowers);

/**
 * @route   POST /api/v1/instagram/auto-follow
 * @desc    Auto-follow discovered curators
 * @access  Protected
 */
router.post('/auto-follow', authMiddleware, InstagramScanController.autoFollowCurators);

/**
 * @route   GET /api/v1/instagram/mock-scan
 * @desc    Get mock scan data (for testing)
 * @access  Public (optional auth)
 */
router.get('/mock-scan', optionalAuthMiddleware, InstagramScanController.getMockScanData);

module.exports = router;
