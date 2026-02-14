/**
 * Apple OAuth Routes
 * Routes for "Sign in with Apple" functionality
 */

const express = require('express');
const AppleAuthController = require('../controllers/appleAuthController');

const router = express.Router();

/**
 * @route   GET /api/v1/auth/apple
 * @desc    Initiate Apple Sign-In flow
 * @access  Public
 * @returns {authUrl: string, state: string}
 */
router.get('/apple', AppleAuthController.initiateAppleAuth);

/**
 * @route   POST /api/v1/auth/apple/callback
 * @desc    Handle Apple OAuth callback
 * @access  Public (called by Apple)
 * @body    code - Authorization code from Apple
 * @body    id_token - ID token from Apple
 * @body    state - State parameter for CSRF protection
 * @body    user - User info (only provided on first sign-in)
 */
router.post('/apple/callback', AppleAuthController.handleAppleCallback);

module.exports = router;
