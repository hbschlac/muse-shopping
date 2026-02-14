const express = require('express');
const router = express.Router();
const NewsfeedController = require('../controllers/newsfeedController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Demo feed with sample Instagram-style modules (no auth required)
router.get('/demo', NewsfeedController.getDemoFeed);

// Complete feed (stories + modules) - optional auth for demo/public access
router.get('/', optionalAuthMiddleware, NewsfeedController.getFeed);

// Stories endpoints - require auth
router.get('/stories', authMiddleware, NewsfeedController.getStories);
router.get('/stories/:storyId', authMiddleware, NewsfeedController.getStoryDetails);
router.post('/stories/:storyId/view', authMiddleware, NewsfeedController.markStoryViewed);
router.get('/stories/:storyId/analytics', authMiddleware, NewsfeedController.getStoryAnalytics);

// Modules endpoints - require auth
router.get('/modules', authMiddleware, NewsfeedController.getModules);
router.get('/modules/:moduleId/items', authMiddleware, NewsfeedController.getModuleItems);
router.post('/modules/:moduleId/interact', authMiddleware, NewsfeedController.trackModuleInteraction);
router.get('/modules/:moduleId/analytics', authMiddleware, NewsfeedController.getModuleAnalytics);

module.exports = router;
