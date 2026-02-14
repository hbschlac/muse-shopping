const express = require('express');
const router = express.Router();
const ItemController = require('../controllers/itemController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Public endpoints (no auth required)
router.get('/filters', ItemController.getFilterOptions);
router.get('/search', ItemController.searchItems);

// Favorites (requires auth) - MUST be before /:itemId routes
router.get('/favorites', authMiddleware, ItemController.getFavorites);

// Personalized discover (requires auth) - MUST be before /:itemId routes
router.get('/discover/personalized', authMiddleware, ItemController.getPersonalizedDiscover);

// Optional auth endpoints (work with or without auth)
router.get('/:itemId/pdp', optionalAuthMiddleware, ItemController.getPdpBundle);
router.get('/:itemId/reviews', ItemController.getItemReviews);
router.post('/:itemId/reviews', optionalAuthMiddleware, ItemController.createItemReview);
router.post('/:itemId/reviews/:reviewId/helpful', optionalAuthMiddleware, ItemController.markReviewHelpful);
router.post('/:itemId/reviews/:reviewId/report', optionalAuthMiddleware, ItemController.reportReview);
router.get('/:itemId/similar', ItemController.getSimilarItems);
router.get('/:itemId', optionalAuthMiddleware, ItemController.getItemDetails);

// Interaction tracking (requires auth)
router.post('/:itemId/view', authMiddleware, ItemController.trackView);
router.post('/:itemId/click', authMiddleware, ItemController.trackClick);

// Favorite actions (requires auth)
router.post('/:itemId/favorite', authMiddleware, ItemController.addToFavorites);
router.delete('/:itemId/favorite', authMiddleware, ItemController.removeFromFavorites);

// General discover (no auth required) - MUST be last
router.get('/', ItemController.discoverItems);

module.exports = router;
