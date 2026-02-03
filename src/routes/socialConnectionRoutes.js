/**
 * Social Connection Routes
 * Routes for connecting Instagram, Facebook, and other social media accounts
 */

const express = require('express');
const MetaAuthController = require('../controllers/metaAuthController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/v1/social/instagram/connect
 * @desc    Initiate Instagram connection flow
 * @access  Private
 * @returns {authUrl: string, state: string, provider: string}
 */
router.get('/instagram/connect', authMiddleware, MetaAuthController.initiateInstagramAuth);

/**
 * @route   GET /api/v1/social/facebook/connect
 * @desc    Initiate Facebook connection flow
 * @access  Private
 * @returns {authUrl: string, state: string, provider: string}
 */
router.get('/facebook/connect', authMiddleware, MetaAuthController.initiateFacebookAuth);

/**
 * @route   GET /api/v1/social/meta/callback
 * @desc    Handle Meta (Instagram/Facebook) OAuth callback
 * @access  Public (called by Meta)
 * @query   code - Authorization code from Meta
 * @query   state - State parameter (format: provider_userId_timestamp)
 */
router.get('/meta/callback', MetaAuthController.handleMetaCallback);

/**
 * @route   GET /api/v1/social/connections
 * @desc    Get user's social media connections
 * @access  Private
 * @query   provider - Optional filter by provider (instagram, facebook)
 * @returns {connections: Array, count: number}
 */
router.get('/connections', authMiddleware, MetaAuthController.getUserConnections);

/**
 * @route   DELETE /api/v1/social/:provider/disconnect
 * @desc    Disconnect a social media account
 * @access  Private
 * @param   provider - Provider name (instagram or facebook)
 */
router.delete('/:provider/disconnect', authMiddleware, MetaAuthController.disconnectAccount);

module.exports = router;
