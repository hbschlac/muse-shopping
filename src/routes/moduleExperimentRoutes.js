/**
 * Module Experiment Routes
 * API endpoints for A/B testing Instagram-style modules
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ExperimentService = require('../services/experimentService');
const logger = require('../utils/logger');

/**
 * POST /api/v1/experiments/modules/track
 * Track module interaction (impression, click, swipe)
 */
router.post('/track', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId;
    const {
      event_type,
      module_id,
      variant_id,
      experiment_id,
      item_id,
      position,
      duration,
      metadata = {}
    } = req.body;

    // Validate event type
    const validEventTypes = ['module_impression', 'item_click', 'module_swipe', 'module_dismiss'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EVENT_TYPE',
          message: `Event type must be one of: ${validEventTypes.join(', ')}`
        }
      });
    }

    // Validate required fields
    if (!module_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_MODULE_ID',
          message: 'module_id is required'
        }
      });
    }

    // Track the event based on type
    switch (event_type) {
      case 'module_impression':
        await ExperimentService.trackModuleImpression(
          userId,
          module_id,
          variant_id,
          { position, ...metadata }
        );
        break;

      case 'item_click':
        await ExperimentService.trackModuleClick(
          userId,
          module_id,
          variant_id,
          item_id,
          metadata
        );
        break;

      case 'module_swipe':
      case 'module_dismiss':
        // Generic interaction tracking
        await ExperimentService.trackModuleImpression(
          userId,
          module_id,
          variant_id,
          { event_type, ...metadata }
        );
        break;
    }

    res.json({
      success: true,
      data: {
        tracked: true,
        event_type,
        module_id,
        variant_id
      }
    });
  } catch (error) {
    logger.error('Error tracking module experiment event:', error);
    next(error);
  }
});

/**
 * GET /api/v1/experiments/modules/:moduleId/metrics
 * Get performance metrics for a module by variant
 */
router.get('/:moduleId/metrics', authMiddleware, async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const days = parseInt(req.query.days) || 7;

    const metrics = await ExperimentService.getModulePerformanceMetrics(
      parseInt(moduleId),
      days
    );

    res.json({
      success: true,
      data: {
        module_id: parseInt(moduleId),
        days,
        metrics
      }
    });
  } catch (error) {
    logger.error('Error fetching module metrics:', error);
    next(error);
  }
});

/**
 * GET /api/v1/experiments/modules/:moduleId/realtime
 * Get real-time module statistics
 */
router.get('/:moduleId/realtime', authMiddleware, async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const variantId = req.query.variant_id ? parseInt(req.query.variant_id) : null;

    const stats = await ExperimentService.getModuleRealtimeStats(
      parseInt(moduleId),
      variantId
    );

    res.json({
      success: true,
      data: {
        module_id: parseInt(moduleId),
        variant_id: variantId,
        stats
      }
    });
  } catch (error) {
    logger.error('Error fetching module realtime stats:', error);
    next(error);
  }
});

/**
 * GET /api/v1/experiments/modules/:moduleId/assignment
 * Get user's experiment assignment for a module
 */
router.get('/:moduleId/assignment', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { moduleId } = req.params;

    const assignment = await ExperimentService.getModuleExperimentAssignment(
      userId,
      parseInt(moduleId)
    );

    if (!assignment) {
      return res.json({
        success: true,
        data: {
          has_experiment: false,
          message: 'Module has no active experiment'
        }
      });
    }

    res.json({
      success: true,
      data: {
        has_experiment: true,
        assignment
      }
    });
  } catch (error) {
    logger.error('Error getting module experiment assignment:', error);
    next(error);
  }
});

/**
 * POST /api/v1/experiments/modules/:moduleId/aggregate
 * Manually trigger metric aggregation for a module (admin only)
 */
router.post('/:moduleId/aggregate', authMiddleware, async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const { date } = req.body;

    // Call the aggregation function
    const pool = require('../db/pool');
    const targetDate = date || new Date().toISOString().split('T')[0];

    await pool.query('SELECT aggregate_module_metrics($1)', [targetDate]);

    res.json({
      success: true,
      data: {
        message: 'Metrics aggregated successfully',
        module_id: parseInt(moduleId),
        date: targetDate
      }
    });
  } catch (error) {
    logger.error('Error aggregating module metrics:', error);
    next(error);
  }
});

module.exports = router;
