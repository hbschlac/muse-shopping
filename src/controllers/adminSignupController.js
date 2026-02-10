/**
 * Admin Signup Request Controller
 * Handles admin access requests and approvals
 */

const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const { sendAdminRequestNotification } = require('../services/emailService');

/**
 * Submit a new admin signup request
 */
async function submitRequest(req, res) {
  try {
    const { full_name, email, reason } = req.body;

    // Validation
    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Full name and email are required'
      });
    }

    // Check if email already exists as a user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'This email is already registered'
      });
    }

    // Check if there's already a pending request for this email
    const existingRequest = await pool.query(
      'SELECT id FROM admin_signup_requests WHERE email = $1 AND status = $2',
      [email, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A request for this email is already pending approval'
      });
    }

    // Create the request
    const result = await pool.query(
      `INSERT INTO admin_signup_requests (email, full_name, reason, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, status, created_at`,
      [email, full_name, reason || null, 'pending']
    );

    logger.info(`New admin signup request from: ${email}`);

    // Send notification email to support
    try {
      await sendAdminRequestNotification({
        id: result.rows[0].id,
        full_name: full_name,
        email: email,
        reason: reason || 'No reason provided'
      });
      logger.info(`Admin request notification email sent for request #${result.rows[0].id}`);
    } catch (emailError) {
      logger.error('Failed to send admin request notification email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error in submitRequest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all pending signup requests (admin only)
 */
async function getPendingRequests(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, reason, status, created_at
       FROM admin_signup_requests
       WHERE status = $1
       ORDER BY created_at DESC`,
      ['pending']
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error in getPendingRequests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all signup requests with any status (admin only)
 */
async function getAllRequests(req, res) {
  try {
    const { status, limit = 50 } = req.query;

    let query = `
      SELECT
        r.id,
        r.email,
        r.full_name,
        r.reason,
        r.status,
        r.created_at,
        r.approved_at,
        r.rejection_reason,
        u.full_name as approved_by_name
      FROM admin_signup_requests r
      LEFT JOIN users u ON r.approved_by = u.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE r.status = $1';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error in getAllRequests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Approve a signup request and create admin account
 */
async function approveRequest(req, res) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const requestId = parseInt(req.params.id);
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Get the request
    const requestResult = await client.query(
      'SELECT * FROM admin_signup_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This request has already been processed'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Create user account with admin role
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, is_admin`,
      [request.email, hashedPassword, request.full_name, true]
    );

    // Update request status
    await client.query(
      `UPDATE admin_signup_requests
       SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ['approved', req.userId, requestId]
    );

    await client.query('COMMIT');

    logger.info(`Admin account created for: ${request.email}`);

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        message: 'Admin account created successfully'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in approveRequest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Reject a signup request
 */
async function rejectRequest(req, res) {
  try {
    const requestId = parseInt(req.params.id);
    const { rejection_reason } = req.body;

    const result = await pool.query(
      `UPDATE admin_signup_requests
       SET status = $1,
           rejection_reason = $2,
           approved_by = $3,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND status = $5
       RETURNING id, email, status`,
      ['rejected', rejection_reason || null, req.userId, requestId, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found or already processed'
      });
    }

    logger.info(`Admin request rejected for: ${result.rows[0].email}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error in rejectRequest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  submitRequest,
  getPendingRequests,
  getAllRequests,
  approveRequest,
  rejectRequest
};
