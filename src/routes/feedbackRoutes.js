/**
 * Feedback Routes
 * API endpoints for feedback submission and management
 */

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { validateFeedbackSubmission } = require('../middleware/validation');

/**
 * @route   POST /api/feedback
 * @desc    Submit new feedback
 * @access  Public (but enhanced if authenticated)
 */
router.post(
  '/',
  optionalAuthMiddleware,
  validateFeedbackSubmission,
  feedbackController.submitFeedback
);

/**
 * @route   GET /api/feedback/stats
 * @desc    Get feedback statistics
 * @access  Admin only
 * @note    Must come before /:ticketNumber to avoid route conflict
 */
router.get(
  '/stats',
  requireAdmin,
  feedbackController.getStats
);

/**
 * @route   GET /api/feedback/my-submissions
 * @desc    Get user's own feedback submissions
 * @access  Private
 * @note    Must come before /:ticketNumber to avoid route conflict
 */
router.get(
  '/my-submissions',
  authMiddleware,
  feedbackController.getMyFeedback
);

/**
 * @route   GET /api/feedback/:ticketNumber
 * @desc    Get feedback by ticket number
 * @access  Private (owner or admin)
 */
router.get(
  '/:ticketNumber',
  authMiddleware,
  feedbackController.getFeedback
);

/**
 * @route   GET /api/feedback
 * @desc    Get all feedback (with filters)
 * @access  Admin only
 */
router.get(
  '/',
  requireAdmin,
  feedbackController.getAllFeedback
);

/**
 * @route   PATCH /api/feedback/:ticketNumber
 * @desc    Update feedback
 * @access  Admin only
 */
router.patch(
  '/:ticketNumber',
  requireAdmin,
  feedbackController.updateFeedback
);

/**
 * @route   POST /api/feedback/:ticketNumber/responses
 * @desc    Add response to feedback
 * @access  Admin only
 */
router.post(
  '/:ticketNumber/responses',
  requireAdmin,
  feedbackController.addResponse
);

module.exports = router;
