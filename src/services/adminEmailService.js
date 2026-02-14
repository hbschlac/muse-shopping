/**
 * Admin Email Service
 * Allows administrators to send emails to shoppers (individual or bulk)
 */

const pool = require('../db/pool');
const emailService = require('./emailService');
const logger = require('../config/logger');

/**
 * Send email to a single shopper
 * @param {object} params
 * @param {number} params.userId - User ID
 * @param {string} params.subject - Email subject
 * @param {string} params.heading - Email heading
 * @param {string} params.body - Email body (HTML)
 * @param {string} params.buttonText - CTA button text (optional)
 * @param {string} params.buttonUrl - CTA button URL (optional)
 * @param {string} params.preheader - Preview text (optional)
 * @param {string} params.emailType - Email type: 'marketing' or 'transactional'
 * @param {number} params.adminUserId - Admin user who sent the email
 * @returns {Promise<object>} - Result with success status
 */
async function sendEmailToShopper(params) {
  const {
    userId,
    subject,
    heading,
    body,
    buttonText,
    buttonUrl,
    preheader,
    emailType = 'transactional',
    adminUserId
  } = params;

  try {
    // Get user details including privacy consent
    const userResult = await pool.query(
      'SELECT id, email, full_name, privacy_consent FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const user = userResult.rows[0];

    // Check email consent for marketing emails
    if (emailType === 'marketing') {
      const hasConsent = user.privacy_consent?.email_marketing === true;
      if (!hasConsent) {
        throw new Error(`User ${user.email} has not consented to marketing emails`);
      }
    }

    // Send email
    const emailData = {
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader
    };

    const sendFunction = emailType === 'marketing'
      ? emailService.sendMarketingEmail
      : emailService.sendTransactionalEmail;

    await sendFunction(user.email, user.full_name, emailData);

    // Log the email send
    await pool.query(
      `INSERT INTO admin_email_logs (
        user_id,
        subject,
        email_type,
        sent_by_admin_id,
        status,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, subject, emailType, adminUserId, 'sent']
    );

    return {
      success: true,
      email: user.email,
      userId: user.id
    };
  } catch (error) {
    logger.error('Failed to send email to shopper:', error);

    // Log failure
    await pool.query(
      `INSERT INTO admin_email_logs (
        user_id,
        subject,
        email_type,
        sent_by_admin_id,
        status,
        error_message,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [userId, subject, emailType, adminUserId, 'failed', error.message]
    ).catch(err => logger.error('Failed to log email error:', err));

    throw error;
  }
}

/**
 * Send email to multiple shoppers
 * @param {object} params
 * @param {array} params.userIds - Array of user IDs
 * @param {string} params.subject - Email subject
 * @param {string} params.heading - Email heading
 * @param {string} params.body - Email body (HTML)
 * @param {string} params.buttonText - CTA button text (optional)
 * @param {string} params.buttonUrl - CTA button URL (optional)
 * @param {string} params.preheader - Preview text (optional)
 * @param {string} params.emailType - Email type: 'marketing' or 'transactional'
 * @param {number} params.adminUserId - Admin user who sent the email
 * @returns {Promise<object>} - Result with sent/failed counts
 */
async function sendBulkEmail(params) {
  const {
    userIds,
    subject,
    heading,
    body,
    buttonText,
    buttonUrl,
    preheader,
    emailType = 'marketing',
    adminUserId
  } = params;

  const results = {
    total: userIds.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  // Create a bulk send record
  const bulkResult = await pool.query(
    `INSERT INTO admin_email_bulk_sends (
      subject,
      email_type,
      total_recipients,
      sent_by_admin_id,
      created_at
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    RETURNING id`,
    [subject, emailType, userIds.length, adminUserId]
  );

  const bulkSendId = bulkResult.rows[0].id;

  // Send emails in batches to avoid overwhelming the SMTP server
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (userId) => {
        try {
          await sendEmailToShopper({
            userId,
            subject,
            heading,
            body,
            buttonText,
            buttonUrl,
            preheader,
            emailType,
            adminUserId
          });

          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId,
            error: error.message
          });
        }
      })
    );

    // Small delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Update bulk send record
  await pool.query(
    `UPDATE admin_email_bulk_sends
     SET emails_sent = $1, emails_failed = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [results.sent, results.failed, bulkSendId]
  );

  logger.info(`Bulk email completed: ${results.sent} sent, ${results.failed} failed`);

  return {
    success: true,
    bulkSendId,
    ...results
  };
}

/**
 * Send email to shoppers matching criteria
 * @param {object} params
 * @param {object} params.criteria - Filter criteria
 * @param {string} params.criteria.minOrderValue - Minimum total spent (optional)
 * @param {string} params.criteria.maxOrderValue - Maximum total spent (optional)
 * @param {array} params.criteria.brandIds - Array of brand IDs (optional)
 * @param {string} params.criteria.signupAfter - Signup date filter (optional)
 * @param {string} params.criteria.signupBefore - Signup date filter (optional)
 * @param {string} params.subject - Email subject
 * @param {string} params.heading - Email heading
 * @param {string} params.body - Email body (HTML)
 * @param {string} params.buttonText - CTA button text (optional)
 * @param {string} params.buttonUrl - CTA button URL (optional)
 * @param {string} params.preheader - Preview text (optional)
 * @param {string} params.emailType - Email type: 'marketing' or 'transactional'
 * @param {number} params.adminUserId - Admin user who sent the email
 * @returns {Promise<object>} - Result with sent/failed counts
 */
async function sendEmailByCriteria(params) {
  const { criteria, emailType = 'marketing', ...emailParams } = params;

  // Build query to find matching users
  let query = 'SELECT DISTINCT u.id FROM users u';
  const conditions = [];
  const values = [];
  let valueIndex = 1;

  // For marketing emails, only include users who have consented
  if (emailType === 'marketing') {
    conditions.push("(u.privacy_consent->>'email_marketing')::boolean = true");
  }

  // Join with shopper_profiles if needed
  if (criteria.minOrderValue || criteria.maxOrderValue || criteria.brandIds) {
    query += ' LEFT JOIN shopper_profiles sp ON u.id = sp.user_id';
  }

  if (criteria.brandIds && criteria.brandIds.length > 0) {
    query += ' LEFT JOIN order_products op ON u.id = op.user_id';
  }

  // Add filters
  if (criteria.minOrderValue) {
    conditions.push(`sp.total_spent_cents >= $${valueIndex}`);
    values.push(criteria.minOrderValue * 100);
    valueIndex++;
  }

  if (criteria.maxOrderValue) {
    conditions.push(`sp.total_spent_cents <= $${valueIndex}`);
    values.push(criteria.maxOrderValue * 100);
    valueIndex++;
  }

  if (criteria.brandIds && criteria.brandIds.length > 0) {
    conditions.push(`op.brand_id = ANY($${valueIndex})`);
    values.push(criteria.brandIds);
    valueIndex++;
  }

  if (criteria.signupAfter) {
    conditions.push(`u.created_at >= $${valueIndex}`);
    values.push(criteria.signupAfter);
    valueIndex++;
  }

  if (criteria.signupBefore) {
    conditions.push(`u.created_at <= $${valueIndex}`);
    values.push(criteria.signupBefore);
    valueIndex++;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Get matching users
  const result = await pool.query(query, values);
  const userIds = result.rows.map(row => row.id);

  logger.info(`Found ${userIds.length} users matching criteria`);

  if (userIds.length === 0) {
    return {
      success: true,
      total: 0,
      sent: 0,
      failed: 0,
      message: 'No users match the specified criteria'
    };
  }

  // Send bulk email
  return sendBulkEmail({
    userIds,
    ...emailParams
  });
}

/**
 * Get email send history
 * @param {object} params
 * @param {number} params.limit - Limit results
 * @param {number} params.offset - Offset for pagination
 * @param {number} params.userId - Filter by user ID (optional)
 * @param {string} params.status - Filter by status (optional)
 * @returns {Promise<array>} - Email log entries
 */
async function getEmailHistory(params = {}) {
  const { limit = 50, offset = 0, userId, status } = params;

  let query = `
    SELECT
      ael.id,
      ael.user_id,
      u.email,
      u.full_name,
      ael.subject,
      ael.email_type,
      ael.status,
      ael.error_message,
      ael.sent_at,
      ael.sent_by_admin_id
    FROM admin_email_logs ael
    LEFT JOIN users u ON ael.user_id = u.id
    WHERE 1=1
  `;

  const values = [];
  let valueIndex = 1;

  if (userId) {
    query += ` AND ael.user_id = $${valueIndex}`;
    values.push(userId);
    valueIndex++;
  }

  if (status) {
    query += ` AND ael.status = $${valueIndex}`;
    values.push(status);
    valueIndex++;
  }

  query += ` ORDER BY ael.sent_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Get bulk send history
 * @param {object} params
 * @param {number} params.limit - Limit results
 * @param {number} params.offset - Offset for pagination
 * @returns {Promise<array>} - Bulk send records
 */
async function getBulkSendHistory(params = {}) {
  const { limit = 50, offset = 0 } = params;

  const query = `
    SELECT
      id,
      subject,
      email_type,
      total_recipients,
      emails_sent,
      emails_failed,
      sent_by_admin_id,
      created_at,
      completed_at
    FROM admin_email_bulk_sends
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

module.exports = {
  sendEmailToShopper,
  sendBulkEmail,
  sendEmailByCriteria,
  getEmailHistory,
  getBulkSendHistory
};
