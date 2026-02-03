/**
 * Email Connection Routes
 * Routes for Gmail integration and email scanning
 */

const express = require('express');
const EmailConnectionController = require('../controllers/emailConnectionController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const callbackSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': 'Authorization code is required',
    'any.required': 'Authorization code is required',
  }),
});

const scanQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

/**
 * @route   GET /api/v1/email/callback
 * @desc    Handle OAuth callback from Google (NO AUTH REQUIRED)
 * @access  Public
 * @query   code - Authorization code from Google
 */
router.get('/callback', EmailConnectionController.handleCallback);

// All other routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/email/connect
 * @desc    Get Gmail OAuth authorization URL
 * @access  Private
 */
router.get('/connect', EmailConnectionController.initiateConnection);

/**
 * @route   POST /api/v1/email/scan
 * @desc    Trigger email scan for order confirmations
 * @access  Private
 */
router.post('/scan', EmailConnectionController.scanEmails);

/**
 * @route   GET /api/v1/email/status
 * @desc    Get Gmail connection status
 * @access  Private
 */
router.get('/status', EmailConnectionController.getStatus);

/**
 * @route   DELETE /api/v1/email/disconnect
 * @desc    Disconnect Gmail account
 * @access  Private
 */
router.delete('/disconnect', EmailConnectionController.disconnect);

/**
 * @route   GET /api/v1/email/scans
 * @desc    Get scan history
 * @access  Private
 * @query   page, limit
 */
router.get('/scans', EmailConnectionController.getScanHistory);

module.exports = router;
