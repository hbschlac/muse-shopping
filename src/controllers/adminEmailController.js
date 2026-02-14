/**
 * Admin Email Controller
 * Handles email sending to shoppers by admins/managers
 */

const adminEmailService = require('../services/adminEmailService');
const logger = require('../config/logger');

/**
 * Send email to a single shopper
 */
async function sendToShopper(req, res) {
  try {
    const {
      userId,
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader,
      emailType
    } = req.body;

    // Validate required fields
    if (!userId || !subject || !heading || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, subject, heading, body'
      });
    }

    const result = await adminEmailService.sendEmailToShopper({
      userId,
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader,
      emailType: emailType || 'transactional',
      adminUserId: req.userId // From auth middleware
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in sendToShopper:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Send email to multiple shoppers
 */
async function sendBulk(req, res) {
  try {
    const {
      userIds,
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader,
      emailType
    } = req.body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be a non-empty array'
      });
    }

    if (!subject || !heading || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, heading, body'
      });
    }

    // Limit bulk sends to prevent abuse
    if (userIds.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Bulk sends are limited to 1000 users per request'
      });
    }

    const result = await adminEmailService.sendBulkEmail({
      userIds,
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader,
      emailType: emailType || 'marketing',
      adminUserId: req.userId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in sendBulk:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Send email to shoppers matching criteria
 */
async function sendByCriteria(req, res) {
  try {
    const {
      criteria,
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader,
      emailType
    } = req.body;

    // Validate required fields
    if (!criteria || typeof criteria !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'criteria object is required'
      });
    }

    if (!subject || !heading || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, heading, body'
      });
    }

    const result = await adminEmailService.sendEmailByCriteria({
      criteria,
      subject,
      heading,
      body,
      buttonText,
      buttonUrl,
      preheader,
      emailType: emailType || 'marketing',
      adminUserId: req.userId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in sendByCriteria:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get email send history
 */
async function getHistory(req, res) {
  try {
    const {
      limit = 50,
      offset = 0,
      userId,
      status
    } = req.query;

    const history = await adminEmailService.getEmailHistory({
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: userId ? parseInt(userId) : undefined,
      status
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error in getHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get bulk send history
 */
async function getBulkHistory(req, res) {
  try {
    const {
      limit = 50,
      offset = 0
    } = req.query;

    const history = await adminEmailService.getBulkSendHistory({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error in getBulkHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  sendToShopper,
  sendBulk,
  sendByCriteria,
  getHistory,
  getBulkHistory
};
