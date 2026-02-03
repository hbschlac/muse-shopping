const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Chat endpoint (optional auth for personalization)
router.post('/', optionalAuthMiddleware, ChatController.chat);
router.post('/feedback', optionalAuthMiddleware, ChatController.submitFeedback);

module.exports = router;
