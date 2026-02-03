/**
 * Secured Analytics API Routes
 * With rate limiting, validation, and audit logging
 */

const express = require('express');
const router = express.Router();
const MetricsService = require('../services/metricsService');
const AnalyticsReportingService = require('../services/analyticsReportingService');
const { requireAdmin } = require('../middleware/authMiddleware');
const {
  RateLimiter,
  validateInput,
  sanitizeInput,
  auditLog,
  logDataAccess,
  securityHeaders
} = require('../middleware/securityMiddleware');
const logger = require('../utils/logger');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Rate limiters
const publicTrackingRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 200, // 200 requests per minute for tracking
  identifierType: 'both' // Use user ID if available, otherwise IP
});

const adminRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute for admins
  identifierType: 'user'
});

// ============================================
// PUBLIC METRICS TRACKING ENDPOINTS
// ============================================

/**
 * POST /analytics/session/start
 * Track session start
 */
router.post(
  '/session/start',
  (req, res, next) => publicTrackingRateLimiter.middleware(req, res, next),
  validateInput({
    required: ['sessionId'],
    fields: {
      userId: { type: 'number', min: 1 },
      sessionId: { type: 'string', minLength: 1, maxLength: 255 },
      deviceType: { type: 'string', enum: ['desktop', 'mobile', 'tablet'] },
      browser: { type: 'string', maxLength: 100 },
      platform: { type: 'string', maxLength: 50 },
      utmSource: { type: 'string', maxLength: 255 },
      utmMedium: { type: 'string', maxLength: 255 },
      utmCampaign: { type: 'string', maxLength: 255 }
    }
  }),
  async (req, res) => {
    try {
      const sessionData = req.body;
      const session = await MetricsService.trackSessionStart(sessionData);

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Error tracking session start:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /analytics/session/end
 * Track session end
 */
router.post(
  '/session/end',
  (req, res, next) => publicTrackingRateLimiter.middleware(req, res, next),
  validateInput({
    required: ['sessionId'],
    fields: {
      sessionId: { type: 'string', minLength: 1, maxLength: 255 },
      exitPageUrl: { type: 'string', maxLength: 2000 }
    }
  }),
  async (req, res) => {
    try {
      const { sessionId, exitPageUrl } = req.body;
      const session = await MetricsService.trackSessionEnd(sessionId, exitPageUrl);

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Error tracking session end:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /analytics/page-view
 * Track page view
 */
router.post(
  '/page-view',
  (req, res, next) => publicTrackingRateLimiter.middleware(req, res, next),
  validateInput({
    required: ['sessionId', 'pageUrl'],
    fields: {
      sessionId: { type: 'string', minLength: 1, maxLength: 255 },
      userId: { type: 'number', min: 1 },
      pageUrl: { type: 'string', minLength: 1, maxLength: 2000 },
      pageType: { type: 'string', enum: ['home', 'search', 'product', 'cart', 'newsfeed', 'checkout'] },
      pageTitle: { type: 'string', maxLength: 500 },
      productId: { type: 'number', min: 1 },
      brandId: { type: 'number', min: 1 },
      isEntryPage: { type: 'boolean' }
    }
  }),
  async (req, res) => {
    try {
      const pageData = req.body;
      const pageView = await MetricsService.trackPageView(pageData);

      res.json({
        success: true,
        data: pageView
      });
    } catch (error) {
      logger.error('Error tracking page view:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /analytics/page-view/end
 * Track page view end
 */
router.post(
  '/page-view/end',
  (req, res, next) => publicTrackingRateLimiter.middleware(req, res, next),
  validateInput({
    required: ['pageViewId'],
    fields: {
      pageViewId: { type: 'number', min: 1 },
      scrollDepthPercent: { type: 'number', min: 0, max: 100 },
      interactionsOnPage: { type: 'number', min: 0 },
      isExitPage: { type: 'boolean' }
    }
  }),
  async (req, res) => {
    try {
      const {
        pageViewId,
        scrollDepthPercent,
        interactionsOnPage,
        isExitPage
      } = req.body;

      const pageView = await MetricsService.trackPageViewEnd(
        pageViewId,
        scrollDepthPercent,
        interactionsOnPage,
        isExitPage
      );

      res.json({
        success: true,
        data: pageView
      });
    } catch (error) {
      logger.error('Error tracking page view end:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /analytics/funnel
 * Track funnel stage progression
 */
router.post(
  '/funnel',
  (req, res, next) => publicTrackingRateLimiter.middleware(req, res, next),
  validateInput({
    required: ['sessionId', 'funnelStage'],
    fields: {
      sessionId: { type: 'string', minLength: 1, maxLength: 255 },
      userId: { type: 'number', min: 1 },
      funnelStage: {
        type: 'string',
        enum: ['browse', 'view_product', 'add_to_cart', 'view_cart', 'checkout', 'purchase']
      },
      productId: { type: 'number', min: 1 },
      brandId: { type: 'number', min: 1 },
      valueCents: { type: 'number', min: 0 }
    }
  }),
  async (req, res) => {
    try {
      const funnelData = req.body;
      const funnel = await MetricsService.trackFunnelStage(funnelData);

      res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      logger.error('Error tracking funnel stage:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /analytics/cart-event
 * Track cart event
 */
router.post(
  '/cart-event',
  (req, res, next) => publicTrackingRateLimiter.middleware(req, res, next),
  validateInput({
    required: ['userId', 'eventType'],
    fields: {
      userId: { type: 'number', min: 1 },
      sessionId: { type: 'string', maxLength: 255 },
      eventType: {
        type: 'string',
        enum: ['created', 'item_added', 'item_removed', 'quantity_changed', 'abandoned', 'converted']
      },
      productId: { type: 'number', min: 1 },
      cartItemId: { type: 'number', min: 1 },
      quantity: { type: 'number', min: 0 },
      valueCents: { type: 'number', min: 0 }
    }
  }),
  async (req, res) => {
    try {
      const cartData = req.body;
      const cartEvent = await MetricsService.trackCartEvent(cartData);

      res.json({
        success: true,
        data: cartEvent
      });
    } catch (error) {
      logger.error('Error tracking cart event:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ============================================
// ADMIN ANALYTICS REPORTING ENDPOINTS
// ============================================

/**
 * GET /analytics/sessions
 * Get session statistics
 */
router.get(
  '/sessions',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_sessions'),
  logDataAccess('analytics_sessions'),
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const stats = await AnalyticsReportingService.getSessionStats({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting session stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/page-views
 * Get page view statistics
 */
router.get(
  '/page-views',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_page_views'),
  logDataAccess('analytics_page_views'),
  async (req, res) => {
    try {
      const { startDate, endDate, pageType } = req.query;

      const stats = await AnalyticsReportingService.getPageViewStats({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        pageType
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting page view stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/top-pages
 * Get top pages by views
 */
router.get(
  '/top-pages',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_top_pages'),
  async (req, res) => {
    try {
      const { limit, startDate, endDate } = req.query;

      const pages = await AnalyticsReportingService.getTopPages({
        limit: limit ? parseInt(limit) : 20,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      res.json({
        success: true,
        data: pages
      });
    } catch (error) {
      logger.error('Error getting top pages:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/funnel
 * Get conversion funnel analysis
 */
router.get(
  '/funnel',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_funnel'),
  logDataAccess('analytics_funnel'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const funnel = await AnalyticsReportingService.getFunnelAnalysis({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      logger.error('Error getting funnel analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/cart
 * Get cart analytics
 */
router.get(
  '/cart',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_cart'),
  logDataAccess('analytics_cart'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const stats = await AnalyticsReportingService.getCartAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting cart analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/cart/top-products
 * Get top products by cart adds
 */
router.get(
  '/cart/top-products',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_cart_top_products'),
  async (req, res) => {
    try {
      const { limit, startDate, endDate } = req.query;

      const products = await AnalyticsReportingService.getTopCartProducts({
        limit: limit ? parseInt(limit) : 20,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Error getting top cart products:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/realtime
 * Get real-time metrics (last 24 hours)
 */
router.get(
  '/realtime',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_realtime'),
  async (req, res) => {
    try {
      const metrics = await AnalyticsReportingService.getRealTimeMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting realtime metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /analytics/session/:sessionId
 * Get detailed session timeline
 */
router.get(
  '/session/:sessionId',
  requireAdmin,
  (req, res, next) => adminRateLimiter.middleware(req, res, next),
  auditLog('read', 'analytics_session_detail'),
  logDataAccess('analytics_session_detail'),
  validateInput({
    required: [],
    fields: {
      sessionId: { type: 'string', minLength: 1, maxLength: 255 }
    }
  }),
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const [session, pageViews, funnel] = await Promise.all([
        MetricsService.getSession(sessionId),
        MetricsService.getSessionPageViews(sessionId),
        MetricsService.getSessionFunnel(sessionId)
      ]);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: {
          session,
          page_views: pageViews,
          funnel: funnel
        }
      });
    } catch (error) {
      logger.error('Error getting session details:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
