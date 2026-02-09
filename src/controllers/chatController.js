const ChatService = require('../services/chatService');
const { successResponse } = require('../utils/responseFormatter');
const { ValidationError } = require('../utils/errors');

class ChatController {
  /**
   * POST /api/v1/chat
   * Body: { message: string, history?: Array<{role, content}>, context?: object, session_id?: number }
   */
  static async chat(req, res, next) {
    try {
      const { message, history = [], context = {}, session_id } = req.body || {};

      if (!message || typeof message !== 'string') {
        throw new ValidationError('message is required and must be a string');
      }

      const result = await ChatService.getChatResponse({
        message,
        history,
        context,
        userId: req.userId || null,
        sessionId: session_id || null,
      });

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/sessions/:sessionId/messages
   */
  static async getSessionMessages(req, res, next) {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (Number.isNaN(sessionId)) {
        throw new ValidationError('sessionId must be a valid number');
      }

      const messages = await ChatService.getSessionMessages(sessionId);
      res.status(200).json(successResponse(messages));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/feedback
   * Body: { message_id: number, rating: 1-5, notes?: string }
   */
  static async submitFeedback(req, res, next) {
    try {
      const { message_id, rating, notes } = req.body || {};

      if (!message_id || !rating) {
        throw new ValidationError('message_id and rating are required');
      }

      const ratingInt = parseInt(rating, 10);
      if (Number.isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
        throw new ValidationError('rating must be between 1 and 5');
      }

      const feedback = await ChatService.submitFeedback(message_id, ratingInt, notes || null);
      res.status(200).json(successResponse(feedback));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatController;
