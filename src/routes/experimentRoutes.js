/**
 * Experiment Assignment Routes
 * Public API for experiment variant assignment and event tracking
 * Matches CODEX spec for /experiments/assign endpoint
 */

const express = require('express');
const router = express.Router();
const ExperimentService = require('../services/experimentService');
const AnalyticsService = require('../services/analyticsService');
const { extractExperimentInfo } = require('../middleware/experimentMiddleware');
const logger = require('../utils/logger');

/**
 * POST /experiments/assign
 * Assign user to experiment variant
 * Matches CODEX specification
 */
router.post('/assign', async (req, res) => {
  try {
    const {
      user_id,
      session_id,
      context = {}
    } = req.body;

    // Validate input
    if (!user_id && !session_id) {
      return res.status(400).json({
        error: 'user_id or session_id is required'
      });
    }

    const {
      page_type = 'feed',
      placement = 'newsfeed',
      locale = 'en-US'
    } = context;

    // Find active experiment for this placement
    const experiments = await ExperimentService.getRunningExperiments();
    const experiment = experiments.find(exp =>
      exp.target === placement ||
      exp.target === 'newsfeed' ||
      exp.target === 'item_ordering'
    );

    if (!experiment) {
      // No active experiment, return default config
      return res.json({
        experiment_id: null,
        variant: 'default',
        params: {}
      });
    }

    // Assign user to variant (uses user_id first, falls back to session_id)
    const variant = await ExperimentService.assignUserToVariant(
      user_id || null,
      experiment.id,
      session_id
    );

    if (!variant) {
      // User not in experiment
      return res.json({
        experiment_id: null,
        variant: 'default',
        params: {}
      });
    }

    // Parse variant config
    const config = typeof variant.config === 'string'
      ? JSON.parse(variant.config)
      : variant.config;

    // Return assignment response
    const response = {
      experiment_id: experiment.name,
      variant: variant.name,
      params: config
    };

    // Log exposure event
    await AnalyticsService.trackImpression({
      userId: user_id,
      sessionId: session_id,
      experimentId: experiment.id,
      variantId: variant.id,
      placement,
      pageType: page_type,
      metadata: { locale }
    });

    logger.info(`Assignment: user=${user_id || session_id}, experiment=${experiment.name}, variant=${variant.name}`);

    res.json(response);
  } catch (error) {
    logger.error('Error in experiment assignment:', error);

    // Fallback to default on error
    res.json({
      experiment_id: null,
      variant: 'default',
      params: {}
    });
  }
});

/**
 * POST /experiments/track-impression
 * Track impression event
 */
router.post('/track-impression', extractExperimentInfo, async (req, res) => {
  try {
    const {
      user_id,
      session_id,
      experiment_id,
      variant_id,
      item_id,
      brand_id,
      position,
      placement = 'newsfeed',
      page_type = 'feed'
    } = req.body;

    await AnalyticsService.trackImpression({
      userId: user_id,
      sessionId: session_id,
      experimentId: experiment_id,
      variantId: variant_id,
      itemId: item_id,
      brandId: brand_id,
      position,
      placement,
      pageType: page_type
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking impression:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /experiments/track-click
 * Track click event
 */
router.post('/track-click', extractExperimentInfo, async (req, res) => {
  try {
    const {
      user_id,
      session_id,
      experiment_id,
      variant_id,
      item_id,
      brand_id,
      position,
      placement = 'newsfeed',
      page_type = 'feed'
    } = req.body;

    await AnalyticsService.trackClick({
      userId: user_id,
      sessionId: session_id,
      experimentId: experiment_id,
      variantId: variant_id,
      itemId: item_id,
      brandId: brand_id,
      position,
      placement,
      pageType: page_type
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking click:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /experiments/track-add-to-cart
 * Track add-to-cart event (primary success metric)
 */
router.post('/track-add-to-cart', extractExperimentInfo, async (req, res) => {
  try {
    const {
      user_id,
      session_id,
      experiment_id,
      variant_id,
      item_id,
      brand_id,
      position,
      value,
      placement = 'newsfeed'
    } = req.body;

    await AnalyticsService.trackAddToCart({
      userId: user_id,
      sessionId: session_id,
      experimentId: experiment_id,
      variantId: variant_id,
      itemId: item_id,
      brandId: brand_id,
      position,
      value,
      placement
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking add-to-cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /experiments/track-purchase
 * Track purchase event
 */
router.post('/track-purchase', extractExperimentInfo, async (req, res) => {
  try {
    const {
      user_id,
      session_id,
      experiment_id,
      variant_id,
      item_id,
      brand_id,
      value
    } = req.body;

    await AnalyticsService.trackPurchase({
      userId: user_id,
      sessionId: session_id,
      experimentId: experiment_id,
      variantId: variant_id,
      itemId: item_id,
      brandId: brand_id,
      value
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking purchase:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
