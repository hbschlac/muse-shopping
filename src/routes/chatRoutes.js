const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Chat endpoints (optional auth for personalization)
router.post('/', optionalAuthMiddleware, ChatController.chat);
router.get('/sessions/:sessionId/messages', optionalAuthMiddleware, ChatController.getSessionMessages);
router.post('/feedback', optionalAuthMiddleware, ChatController.submitFeedback);

module.exports = router;
