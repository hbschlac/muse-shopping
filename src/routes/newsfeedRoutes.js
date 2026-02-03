const express = require('express');
const router = express.Router();
const NewsfeedController = require('../controllers/newsfeedController');
const authMiddleware = require('../middleware/authMiddleware');

// All newsfeed routes require authentication
router.use(authMiddleware);

// Complete feed (stories + modules)
router.get('/', NewsfeedController.getFeed);

// Stories endpoints
router.get('/stories', NewsfeedController.getStories);
router.get('/stories/:storyId', NewsfeedController.getStoryDetails);
router.post('/stories/:storyId/view', NewsfeedController.markStoryViewed);
router.get('/stories/:storyId/analytics', NewsfeedController.getStoryAnalytics);

// Modules endpoints
router.get('/modules', NewsfeedController.getModules);
router.get('/modules/:moduleId/items', NewsfeedController.getModuleItems);
router.post('/modules/:moduleId/interact', NewsfeedController.trackModuleInteraction);
router.get('/modules/:moduleId/analytics', NewsfeedController.getModuleAnalytics);

module.exports = router;
