/**
 * Influencer Routes
 * API routes for influencer browsing and following
 */

const express = require('express');
const router = express.Router();
const InfluencerController = require('../controllers/InfluencerController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Browse influencers
router.get('/', InfluencerController.getInfluencers);

// Get recommended influencers
router.get('/recommended', InfluencerController.getRecommendedInfluencers);

// Get influencers user is following
router.get('/following', InfluencerController.getFollowedInfluencers);

// Get single influencer
router.get('/:id', InfluencerController.getInfluencer);

// Follow influencer
router.post('/:id/follow', InfluencerController.followInfluencer);

// Unfollow influencer
router.delete('/:id/unfollow', InfluencerController.unfollowInfluencer);

module.exports = router;
