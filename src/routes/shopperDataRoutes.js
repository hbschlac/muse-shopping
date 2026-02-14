/**
 * Shopper Data Routes
 * API routes for shopper activity tracking, metrics, and privacy management
 */

const express = require('express');
const router = express.Router();
const ShopperDataController = require('../controllers/shopperDataController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

/**
 * Track shopper activity
 * POST /api/shopper/activity
 * Body: { activityType, activityCategory, pageUrl, productId, etc. }
 */
router.post('/activity', ShopperDataController.trackActivity);

/**
 * Get shopper activity history
 * GET /api/shopper/activity
 * Query: ?limit=100&offset=0&activityTypes=product_view,click&startDate=2026-01-01
 */
router.get('/activity', ShopperDataController.getActivity);

// ============================================================================
// METRICS & SEGMENTS
// ============================================================================

/**
 * Get engagement metrics
 * GET /api/shopper/metrics
 */
router.get('/metrics', ShopperDataController.getMetrics);

/**
 * Get shopper segments
 * GET /api/shopper/segments
 */
router.get('/segments', ShopperDataController.getSegments);

/**
 * Get shopper context (for personalization)
 * GET /api/shopper/context
 */
router.get('/context', ShopperDataController.getContext);

// ============================================================================
// PRIVACY & CONSENT
// ============================================================================

/**
 * Update privacy consent
 * POST /api/shopper/privacy/consent
 * Body: { data_collection: true, personalization: true, marketing: false, etc. }
 */
router.post('/privacy/consent', ShopperDataController.updateConsent);

/**
 * Export user data (GDPR)
 * GET /api/shopper/data/export
 */
router.get('/data/export', ShopperDataController.exportData);

/**
 * Request data deletion (GDPR)
 * POST /api/shopper/data/delete
 */
router.post('/data/delete', ShopperDataController.requestDeletion);

module.exports = router;
