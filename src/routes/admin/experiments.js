/**
 * Admin Experiment Routes
 * Endpoints for managing A/B tests and multi-armed bandit experiments
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const ExperimentService = require('../../services/experimentService');
const MultiArmedBanditService = require('../../services/multiArmedBanditService');
const AnalyticsService = require('../../services/analyticsService');

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * POST /admin/experiments
 * Create a new experiment
 */
router.post('/', async (req, res) => {
  try {
    const experiment = await ExperimentService.createExperiment({
      ...req.body,
      createdBy: req.userId
    });

    res.status(201).json({
      success: true,
      data: experiment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments
 * List all experiments
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM experiments';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await require('../../db/pool').query(query, params);

    res.json({
      success: true,
      data: {
        experiments: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id
 * Get experiment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const experiment = await ExperimentService.getExperimentById(parseInt(req.params.id));

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    // Get variants
    const variants = await ExperimentService.getExperimentVariants(experiment.id);

    res.json({
      success: true,
      data: {
        ...experiment,
        variants
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/experiments/:id/variants
 * Add variant to experiment
 */
router.post('/:id/variants', async (req, res) => {
  try {
    const variant = await ExperimentService.createVariant({
      experimentId: parseInt(req.params.id),
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: variant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/experiments/:id/start
 * Start an experiment
 */
router.post('/:id/start', async (req, res) => {
  try {
    const experiment = await ExperimentService.startExperiment(parseInt(req.params.id));

    res.json({
      success: true,
      data: experiment,
      message: 'Experiment started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/experiments/:id/stop
 * Stop an experiment
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const experiment = await ExperimentService.stopExperiment(parseInt(req.params.id));

    res.json({
      success: true,
      data: experiment,
      message: 'Experiment stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/performance
 * Get experiment performance metrics
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const metrics = await AnalyticsService.calculateMetrics(
      parseInt(req.params.id),
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: {
        metrics,
        experiment_id: parseInt(req.params.id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/lift
 * Calculate lift vs control
 */
router.get('/:id/lift', async (req, res) => {
  try {
    const { metric = 'add_to_cart_rate' } = req.query;

    const lift = await AnalyticsService.calculateLift(
      parseInt(req.params.id),
      metric
    );

    res.json({
      success: true,
      data: {
        lift,
        metric
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/report
 * Get complete experiment report
 */
router.get('/:id/report', async (req, res) => {
  try {
    const report = await AnalyticsService.getExperimentReport(parseInt(req.params.id));

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/position-analysis
 * Get position performance analysis
 */
router.get('/:id/position-analysis', async (req, res) => {
  try {
    const positionAnalysis = await AnalyticsService.getPositionAnalysis(parseInt(req.params.id));

    res.json({
      success: true,
      data: {
        positions: positionAnalysis,
        experiment_id: parseInt(req.params.id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/time-series
 * Get time series data
 */
router.get('/:id/time-series', async (req, res) => {
  try {
    const { groupBy = 'day' } = req.query;

    const timeSeries = await AnalyticsService.getTimeSeries(
      parseInt(req.params.id),
      groupBy
    );

    res.json({
      success: true,
      data: {
        time_series: timeSeries,
        group_by: groupBy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/experiments/:id/declare-winner
 * Declare winning variant
 */
router.post('/:id/declare-winner', async (req, res) => {
  try {
    const { winnerVariantId, significance } = req.body;

    if (!winnerVariantId || !significance) {
      return res.status(400).json({
        success: false,
        error: 'winnerVariantId and significance are required'
      });
    }

    const experiment = await ExperimentService.declareWinner(
      parseInt(req.params.id),
      winnerVariantId,
      significance
    );

    res.json({
      success: true,
      data: experiment,
      message: `Variant ${winnerVariantId} declared winner with ${significance}% confidence`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/bandit-arms
 * Get bandit arm performance
 */
router.get('/:id/bandit-arms', async (req, res) => {
  try {
    const { armType } = req.query;

    const arms = await MultiArmedBanditService.getArmPerformance(
      parseInt(req.params.id),
      armType
    );

    res.json({
      success: true,
      data: {
        arms,
        count: arms.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/top-items
 * Get top performing items
 */
router.get('/:id/top-items', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const items = await AnalyticsService.getTopItems(
      parseInt(req.params.id),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        items,
        count: items.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/experiments/:id/top-brands
 * Get top performing brands
 */
router.get('/:id/top-brands', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const brands = await AnalyticsService.getTopBrands(
      parseInt(req.params.id),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        brands,
        count: brands.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
