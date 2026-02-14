/**
 * Google OAuth Routes
 * Routes for "Sign in with Google" functionality
 */

const express = require('express');
const GoogleAuthController = require('../controllers/googleAuthController');

const router = express.Router();

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google Sign-In flow
 * @access  Public
 * @returns {authUrl: string, state: string}
 */
router.get('/google', GoogleAuthController.initiateGoogleAuth);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public (called by Google)
 * @query   code - Authorization code from Google
 * @query   state - State parameter for CSRF protection
 */
router.get('/google/callback', GoogleAuthController.handleGoogleCallback);

/**
 * @route   POST /api/v1/auth/google/callback
 * @desc    Handle Google OAuth callback from frontend
 * @access  Public
 * @body    code - Authorization code from Google
 */
router.post('/google/callback', GoogleAuthController.handleGoogleCallbackPost);

module.exports = router;
