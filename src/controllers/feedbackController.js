/**
 * Feedback Controller
 * Handles HTTP requests for feedback submission and management
 */

const feedbackService = require('../services/feedbackService');
const logger = require('../config/logger');
const { APIError } = require('../utils/errors');

/**
 * Submit new feedback
 * POST /api/feedback
 */
async function submitFeedback(req, res, next) {
  try {
    const { category, subject, message, email, fullName } = req.body;

    // Validation
    if (!category || !subject || !message) {
      throw new APIError('Category, subject, and message are required', 400);
    }

    if (!email) {
      throw new APIError('Email is required', 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new APIError('Invalid email format', 400);
    }

    // Category validation
    const validCategories = ['bug', 'feature_request', 'tech_help', 'complaint', 'question', 'other'];
    if (!validCategories.includes(category)) {
      throw new APIError('Invalid category', 400);
    }

    // Get user ID if logged in
    const userId = req.user?.id || null;

    // Get user info from token or request body
    const userFullName = fullName || req.user?.full_name || 'Anonymous';

    // Get metadata
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const feedbackData = {
      userId,
      email,
      fullName: userFullName,
      category,
      subject,
      message,
      userAgent,
      ipAddress
    };

    const feedback = await feedbackService.submitFeedback(feedbackData);

    res.status(201).json({
      success: true,
      data: {
        ticketNumber: feedback.ticket_number,
        status: feedback.status,
        createdAt: feedback.created_at
      },
      message: `Feedback submitted successfully. Ticket number: ${feedback.ticket_number}`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get feedback by ticket number
 * GET /api/feedback/:ticketNumber
 */
async function getFeedback(req, res, next) {
  try {
    const { ticketNumber } = req.params;

    const feedback = await feedbackService.getFeedbackByTicket(ticketNumber);

    if (!feedback) {
      throw new APIError('Feedback not found', 404);
    }

    // Check if user can view this feedback
    // Users can only view their own feedback unless they're admin
    const isAdmin = req.user?.is_admin === true;
    const isOwner = req.user?.id === feedback.user_id || req.user?.email === feedback.email;

    if (!isAdmin && !isOwner) {
      throw new APIError('Not authorized to view this feedback', 403);
    }

    // Get responses (include private only for admins)
    const responses = await feedbackService.getFeedbackResponses(ticketNumber, isAdmin);

    res.json({
      success: true,
      data: {
        feedback,
        responses
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all feedback (Admin only)
 * GET /api/feedback
 */
async function getAllFeedback(req, res, next) {
  try {
    // Check admin access
    if (!req.user?.is_admin) {
      throw new APIError('Admin access required', 403);
    }

    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      userId: req.query.userId ? parseInt(req.query.userId) : undefined,
      assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const feedback = await feedbackService.getAllFeedback(filters);

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update feedback (Admin only)
 * PATCH /api/feedback/:ticketNumber
 */
async function updateFeedback(req, res, next) {
  try {
    // Check admin access
    if (!req.user?.is_admin) {
      throw new APIError('Admin access required', 403);
    }

    const { ticketNumber } = req.params;
    const updates = req.body;

    // Validate status if provided
    if (updates.status) {
      const validStatuses = ['new', 'in_review', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(updates.status)) {
        throw new APIError('Invalid status', 400);
      }
    }

    // Validate priority if provided
    if (updates.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(updates.priority)) {
        throw new APIError('Invalid priority', 400);
      }
    }

    const feedback = await feedbackService.updateFeedback(ticketNumber, updates);

    res.json({
      success: true,
      data: feedback,
      message: 'Feedback updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add response to feedback (Admin only)
 * POST /api/feedback/:ticketNumber/responses
 */
async function addResponse(req, res, next) {
  try {
    // Check admin access
    if (!req.user?.is_admin) {
      throw new APIError('Admin access required', 403);
    }

    const { ticketNumber } = req.params;
    const { message, isPublic = true } = req.body;

    if (!message) {
      throw new APIError('Message is required', 400);
    }

    const responseData = {
      adminId: req.user.id,
      message,
      isPublic
    };

    const response = await feedbackService.addFeedbackResponse(ticketNumber, responseData);

    res.status(201).json({
      success: true,
      data: response,
      message: 'Response added successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get feedback statistics (Admin only)
 * GET /api/feedback/stats
 */
async function getStats(req, res, next) {
  try {
    // Check admin access
    if (!req.user?.is_admin) {
      throw new APIError('Admin access required', 403);
    }

    const stats = await feedbackService.getFeedbackStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's own feedback submissions
 * GET /api/feedback/my-submissions
 */
async function getMyFeedback(req, res, next) {
  try {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    const filters = {
      userId: req.user.id,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const feedback = await feedbackService.getAllFeedback(filters);

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitFeedback,
  getFeedback,
  getAllFeedback,
  updateFeedback,
  addResponse,
  getStats,
  getMyFeedback
};
