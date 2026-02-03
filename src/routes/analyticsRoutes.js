/**
 * Analytics API Routes
 * Public and admin endpoints for metrics and analytics
 */

const express = require('express');
const router = express.Router();
const MetricsService = require('../services/metricsService');
const AnalyticsReportingService = require('../services/analyticsReportingService');
const { requireAdmin } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ============================================
// PUBLIC METRICS TRACKING ENDPOINTS
// ============================================

/**
 * POST /analytics/session/start
 * Track session start
 */
router.post('/session/start', async (req, res) => {
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
});

/**
 * POST /analytics/session/end
 * Track session end
 */
router.post('/session/end', async (req, res) => {
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
});

/**
 * POST /analytics/page-view
 * Track page view
 */
router.post('/page-view', async (req, res) => {
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
});

/**
 * POST /analytics/page-view/end
 * Track page view end
 */
router.post('/page-view/end', async (req, res) => {
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
});

/**
 * POST /analytics/funnel
 * Track funnel stage progression
 */
router.post('/funnel', async (req, res) => {
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
});

/**
 * POST /analytics/cart-event
 * Track cart event
 */
router.post('/cart-event', async (req, res) => {
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
});

// ============================================
// ADMIN ANALYTICS REPORTING ENDPOINTS
// ============================================

/**
 * GET /analytics/sessions
 * Get session statistics
 * Query params: startDate, endDate, groupBy
 */
router.get('/sessions', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/page-views
 * Get page view statistics
 * Query params: startDate, endDate, pageType
 */
router.get('/page-views', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/top-pages
 * Get top pages by views
 * Query params: limit, startDate, endDate
 */
router.get('/top-pages', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/funnel
 * Get conversion funnel analysis
 * Query params: startDate, endDate
 */
router.get('/funnel', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/cart
 * Get cart analytics
 * Query params: startDate, endDate
 */
router.get('/cart', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/cart/top-products
 * Get top products by cart adds
 * Query params: limit, startDate, endDate
 */
router.get('/cart/top-products', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/realtime
 * Get real-time metrics (last 24 hours)
 */
router.get('/realtime', requireAdmin, async (req, res) => {
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
});

/**
 * GET /analytics/session/:sessionId
 * Get detailed session timeline
 */
router.get('/session/:sessionId', requireAdmin, async (req, res) => {
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
});

module.exports = router;
