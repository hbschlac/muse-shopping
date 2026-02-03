const express = require('express');
const router = express.Router();
const ItemController = require('../controllers/itemController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Public endpoints (no auth required)
router.get('/filters', ItemController.getFilterOptions);
router.get('/search', ItemController.searchItems);

// Optional auth endpoints (work with or without auth)
router.get('/:itemId', optionalAuthMiddleware, ItemController.getItemDetails);
router.get('/:itemId/similar', ItemController.getSimilarItems);

// General discover (no auth required)
router.get('/', ItemController.discoverItems);

// Personalized discover (requires auth)
router.get('/discover/personalized', authMiddleware, ItemController.getPersonalizedDiscover);

// Interaction tracking (requires auth)
router.post('/:itemId/view', authMiddleware, ItemController.trackView);
router.post('/:itemId/click', authMiddleware, ItemController.trackClick);

// Favorites (requires auth)
router.get('/favorites', authMiddleware, ItemController.getFavorites);
router.post('/:itemId/favorite', authMiddleware, ItemController.addToFavorites);
router.delete('/:itemId/favorite', authMiddleware, ItemController.removeFromFavorites);

module.exports = router;
