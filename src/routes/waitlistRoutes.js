const express = require('express');
const router = express.Router();
const WaitlistController = require('../controllers/waitlistController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

/**
 * Public Routes
 */

// Add new waitlist signup
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('first_name').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('phone').optional().trim(),
    body('interest_categories').optional().isArray().withMessage('Interest categories must be an array'),
    body('favorite_brands').optional().isArray().withMessage('Favorite brands must be an array'),
    body('price_range_preference')
      .optional()
      .isIn(['budget', 'mid-range', 'luxury', 'mixed'])
      .withMessage('Invalid price range preference'),
    body('referral_source').optional().trim(),
    body('utm_source').optional().trim(),
    body('utm_medium').optional().trim(),
    body('utm_campaign').optional().trim(),
    body('referral_code').optional().trim(),
    validate,
  ],
  WaitlistController.addSignup
);

// Check waitlist status by email
router.get(
  '/status',
  [query('email').isEmail().normalizeEmail().withMessage('Valid email is required'), validate],
  WaitlistController.getStatus
);

// Unsubscribe from waitlist
router.post(
  '/unsubscribe',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required'), validate],
  WaitlistController.unsubscribe
);

// Get referral link for a user
router.get(
  '/referral-link',
  [query('email').isEmail().normalizeEmail().withMessage('Valid email is required'), validate],
  WaitlistController.getReferralLink
);

// Track referral share
router.post(
  '/track-share',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('share_method').optional().trim(),
    body('share_platform').optional().trim(),
    validate,
  ],
  WaitlistController.trackShare
);

// Track referral click
router.post(
  '/track-click',
  [
    body('referral_code').trim().notEmpty().withMessage('Referral code is required'),
    body('utm_source').optional().trim(),
    body('utm_medium').optional().trim(),
    body('utm_campaign').optional().trim(),
    validate,
  ],
  WaitlistController.trackClick
);

// Get referral analytics for a user
router.get(
  '/referral-analytics',
  [query('email').isEmail().normalizeEmail().withMessage('Valid email is required'), validate],
  WaitlistController.getReferralAnalytics
);

/**
 * Admin Routes (protected)
 */

// Get waitlist statistics
router.get('/admin/statistics', authMiddleware, WaitlistController.getStatistics);

// Get paginated waitlist
router.get(
  '/admin/list',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
    query('status').optional().isIn(['pending', 'invited', 'converted', 'unsubscribed']).withMessage('Invalid status'),
    query('orderBy')
      .optional()
      .isIn(['priority_score', 'created_at', 'email', 'status'])
      .withMessage('Invalid orderBy field'),
    query('orderDir').optional().isIn(['ASC', 'DESC']).withMessage('Invalid order direction'),
    validate,
  ],
  WaitlistController.getWaitlist
);

// Get specific waitlist signup by ID
router.get(
  '/admin/:id',
  authMiddleware,
  [param('id').isInt().withMessage('ID must be an integer'), validate],
  WaitlistController.getSignupById
);

// Update waitlist signup
router.patch(
  '/admin/:id',
  authMiddleware,
  [
    param('id').isInt().withMessage('ID must be an integer'),
    body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('phone').optional().trim(),
    body('interest_categories').optional().isArray(),
    body('favorite_brands').optional().isArray(),
    body('price_range_preference').optional().isIn(['budget', 'mid-range', 'luxury', 'mixed']),
    body('status').optional().isIn(['pending', 'invited', 'converted', 'unsubscribed']),
    body('notes').optional().trim(),
    body('tags').optional().isArray(),
    validate,
  ],
  WaitlistController.updateSignup
);

// Send invite to single signup
router.post(
  '/admin/:id/invite',
  authMiddleware,
  [param('id').isInt().withMessage('ID must be an integer'), validate],
  WaitlistController.sendInvite
);

// Batch send invites to top priority signups
router.post(
  '/admin/batch-invite',
  authMiddleware,
  [body('count').optional().isInt({ min: 1, max: 100 }).withMessage('Count must be between 1 and 100'), validate],
  WaitlistController.batchSendInvites
);

module.exports = router;
