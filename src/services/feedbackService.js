/**
 * Feedback Service
 * Handles feedback submission, ticket generation, and management
 */

const pool = require('../db/pool');
const logger = require('../config/logger');
const {
  sendFeedbackNotificationEmail,
  sendFeedbackConfirmationEmail,
  sendFeedbackResponseNotification,
  sendStatusUpdateNotification
} = require('./emailService');

/**
 * Submit new feedback
 * @param {Object} feedbackData - Feedback submission data
 * @param {number} feedbackData.userId - User ID (optional, for logged in users)
 * @param {string} feedbackData.email - User email
 * @param {string} feedbackData.fullName - User's full name
 * @param {string} feedbackData.category - Feedback category
 * @param {string} feedbackData.subject - Subject line
 * @param {string} feedbackData.message - Feedback message
 * @param {string} feedbackData.userAgent - Browser user agent
 * @param {string} feedbackData.ipAddress - User IP address
 * @returns {Promise<Object>} - Created feedback submission with ticket number
 */
async function submitFeedback(feedbackData) {
  const {
    userId = null,
    email,
    fullName,
    category,
    subject,
    message,
    userAgent,
    ipAddress
  } = feedbackData;

  try {
    const result = await pool.query(
      `INSERT INTO feedback_submissions
       (user_id, email, full_name, category, subject, message, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, email, fullName, category, subject, message, userAgent, ipAddress]
    );

    const feedback = result.rows[0];
    logger.info(`Feedback submitted: ${feedback.ticket_number} by ${email}`);

    // Send email notifications asynchronously (don't block the response)
    setImmediate(async () => {
      try {
        // Send notification to feedback@muse.shopping
        await sendFeedbackNotificationEmail(feedback);

        // Send confirmation to user
        await sendFeedbackConfirmationEmail(feedback);
      } catch (emailError) {
        logger.error('Failed to send feedback emails:', emailError);
        // Don't throw - feedback was saved successfully
      }
    });

    return feedback;
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    throw error;
  }
}

/**
 * Get feedback by ticket number
 * @param {string} ticketNumber - Ticket number
 * @returns {Promise<Object>} - Feedback submission
 */
async function getFeedbackByTicket(ticketNumber) {
  try {
    const result = await pool.query(
      `SELECT
        f.*,
        u.email as user_email,
        u.full_name as user_full_name,
        a.email as assigned_to_email,
        a.full_name as assigned_to_name
       FROM feedback_submissions f
       LEFT JOIN users u ON f.user_id = u.id
       LEFT JOIN users a ON f.assigned_to = a.id
       WHERE f.ticket_number = $1`,
      [ticketNumber]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error fetching feedback ${ticketNumber}:`, error);
    throw error;
  }
}

/**
 * Get all feedback submissions with filters
 * @param {Object} filters - Query filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.category - Filter by category
 * @param {string} filters.priority - Filter by priority
 * @param {number} filters.userId - Filter by user ID
 * @param {number} filters.assignedTo - Filter by assigned admin
 * @param {number} filters.limit - Results limit
 * @param {number} filters.offset - Results offset
 * @returns {Promise<Array>} - Array of feedback submissions
 */
async function getAllFeedback(filters = {}) {
  const {
    status,
    category,
    priority,
    userId,
    assignedTo,
    limit = 50,
    offset = 0
  } = filters;

  try {
    let query = `
      SELECT
        f.*,
        u.email as user_email,
        u.full_name as user_full_name,
        a.email as assigned_to_email,
        a.full_name as assigned_to_name,
        (SELECT COUNT(*) FROM feedback_responses WHERE feedback_id = f.id) as response_count
      FROM feedback_submissions f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN users a ON f.assigned_to = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND f.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND f.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (priority) {
      query += ` AND f.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (userId) {
      query += ` AND f.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (assignedTo) {
      query += ` AND f.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching feedback list:', error);
    throw error;
  }
}

/**
 * Update feedback status
 * @param {string} ticketNumber - Ticket number
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated feedback
 */
async function updateFeedback(ticketNumber, updates) {
  const {
    status,
    priority,
    assignedTo,
    adminNotes,
    resolutionNotes
  } = updates;

  try {
    // First get the current feedback to track status changes
    const currentResult = await pool.query(
      'SELECT * FROM feedback_submissions WHERE ticket_number = $1',
      [ticketNumber]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Feedback not found');
    }

    const currentFeedback = currentResult.rows[0];
    const oldStatus = currentFeedback.status;

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      // Auto-set timestamps based on status
      if (status === 'resolved') {
        setClauses.push(`resolved_at = CURRENT_TIMESTAMP`);
      } else if (status === 'closed') {
        setClauses.push(`closed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (priority !== undefined) {
      setClauses.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (assignedTo !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex}`);
      params.push(assignedTo);
      paramIndex++;
    }

    if (adminNotes !== undefined) {
      setClauses.push(`admin_notes = $${paramIndex}`);
      params.push(adminNotes);
      paramIndex++;
    }

    if (resolutionNotes !== undefined) {
      setClauses.push(`resolution_notes = $${paramIndex}`);
      params.push(resolutionNotes);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(ticketNumber);

    const query = `
      UPDATE feedback_submissions
      SET ${setClauses.join(', ')}
      WHERE ticket_number = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Feedback not found');
    }

    const updatedFeedback = result.rows[0];

    logger.info(`Feedback ${ticketNumber} updated`);

    // Send status update notification if status changed to resolved/closed
    if (status !== undefined && status !== oldStatus && currentFeedback.email) {
      setImmediate(async () => {
        try {
          await sendStatusUpdateNotification(updatedFeedback, oldStatus, status);
        } catch (emailError) {
          logger.error(`Failed to send status update notification for ${ticketNumber}:`, emailError);
          // Don't throw - update was successful
        }
      });
    }

    return updatedFeedback;
  } catch (error) {
    logger.error(`Error updating feedback ${ticketNumber}:`, error);
    throw error;
  }
}

/**
 * Add a response to feedback
 * @param {string} ticketNumber - Ticket number
 * @param {Object} responseData - Response data
 * @returns {Promise<Object>} - Created response
 */
async function addFeedbackResponse(ticketNumber, responseData) {
  const { adminId, message, isPublic = true } = responseData;

  try {
    // Get full feedback details for email
    const feedbackResult = await pool.query(
      `SELECT f.*, u.full_name as admin_name
       FROM feedback_submissions f
       LEFT JOIN users u ON $1 = u.id
       WHERE f.ticket_number = $2`,
      [adminId, ticketNumber]
    );

    if (feedbackResult.rows.length === 0) {
      throw new Error('Feedback not found');
    }

    const feedback = feedbackResult.rows[0];
    const feedbackId = feedback.id;
    const adminName = feedback.admin_name || 'Our Team';

    // Insert response
    const result = await pool.query(
      `INSERT INTO feedback_responses (feedback_id, admin_id, message, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [feedbackId, adminId, message, isPublic]
    );

    const response = result.rows[0];

    logger.info(`Response added to feedback ${ticketNumber}`);

    // Send email notification if response is public
    if (isPublic && feedback.email) {
      setImmediate(async () => {
        try {
          await sendFeedbackResponseNotification(feedback, response, adminName);
        } catch (emailError) {
          logger.error(`Failed to send response notification for ${ticketNumber}:`, emailError);
          // Don't throw - response was saved successfully
        }
      });
    }

    return response;
  } catch (error) {
    logger.error(`Error adding response to ${ticketNumber}:`, error);
    throw error;
  }
}

/**
 * Get responses for a feedback ticket
 * @param {string} ticketNumber - Ticket number
 * @param {boolean} includePrivate - Include private responses (for admins)
 * @returns {Promise<Array>} - Array of responses
 */
async function getFeedbackResponses(ticketNumber, includePrivate = false) {
  try {
    const feedbackResult = await pool.query(
      'SELECT id FROM feedback_submissions WHERE ticket_number = $1',
      [ticketNumber]
    );

    if (feedbackResult.rows.length === 0) {
      throw new Error('Feedback not found');
    }

    const feedbackId = feedbackResult.rows[0].id;

    let query = `
      SELECT
        r.*,
        u.full_name as admin_name,
        u.email as admin_email
      FROM feedback_responses r
      LEFT JOIN users u ON r.admin_id = u.id
      WHERE r.feedback_id = $1
    `;

    if (!includePrivate) {
      query += ` AND r.is_public = true`;
    }

    query += ` ORDER BY r.created_at ASC`;

    const result = await pool.query(query, [feedbackId]);
    return result.rows;
  } catch (error) {
    logger.error(`Error fetching responses for ${ticketNumber}:`, error);
    throw error;
  }
}

/**
 * Get feedback statistics
 * @returns {Promise<Object>} - Feedback statistics
 */
async function getFeedbackStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'in_review' THEN 1 END) as in_review_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
        COUNT(CASE WHEN category = 'bug' THEN 1 END) as bug_count,
        COUNT(CASE WHEN category = 'feature_request' THEN 1 END) as feature_request_count,
        COUNT(CASE WHEN category = 'tech_help' THEN 1 END) as tech_help_count,
        COUNT(CASE WHEN category = 'complaint' THEN 1 END) as complaint_count,
        COUNT(CASE WHEN category = 'question' THEN 1 END) as question_count,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_count,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
      FROM feedback_submissions
    `);

    return result.rows[0];
  } catch (error) {
    logger.error('Error fetching feedback stats:', error);
    throw error;
  }
}

module.exports = {
  submitFeedback,
  getFeedbackByTicket,
  getAllFeedback,
  updateFeedback,
  addFeedbackResponse,
  getFeedbackResponses,
  getFeedbackStats
};
