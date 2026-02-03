/**
 * Experiment Service
 * Handles A/B testing, multivariate testing, and experiment management
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ExperimentService {
  /**
   * Create a new experiment
   * @param {Object} experimentData - Experiment configuration
   * @returns {Promise<Object>} Created experiment
   */
  static async createExperiment(experimentData) {
    const {
      name,
      description,
      experimentType,
      target,
      trafficAllocation = 100,
      primaryMetric,
      secondaryMetrics = [],
      config = {},
      createdBy
    } = experimentData;

    const query = `
      INSERT INTO experiments (
        name, description, experiment_type, target,
        traffic_allocation, primary_metric, secondary_metrics,
        config, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      description,
      experimentType,
      target,
      trafficAllocation,
      primaryMetric,
      secondaryMetrics,
      JSON.stringify(config),
      createdBy
    ]);

    logger.info(`Experiment created: ${name} (${experimentType})`);
    return result.rows[0];
  }

  /**
   * Create experiment variant
   * @param {Object} variantData - Variant configuration
   * @returns {Promise<Object>} Created variant
   */
  static async createVariant(variantData) {
    const {
      experimentId,
      name,
      description,
      trafficWeight = 1,
      config,
      isControl = false
    } = variantData;

    const query = `
      INSERT INTO experiment_variants (
        experiment_id, name, description,
        traffic_weight, config, is_control
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      experimentId,
      name,
      description,
      trafficWeight,
      JSON.stringify(config),
      isControl
    ]);

    logger.info(`Variant created: ${name} for experiment ${experimentId}`);
    return result.rows[0];
  }

  /**
   * Start an experiment
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Object>} Updated experiment
   */
  static async startExperiment(experimentId) {
    const query = `
      UPDATE experiments
      SET status = 'running',
          start_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [experimentId]);

    if (result.rows.length === 0) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    logger.info(`Experiment ${experimentId} started`);
    return result.rows[0];
  }

  /**
   * Stop an experiment
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Object>} Updated experiment
   */
  static async stopExperiment(experimentId) {
    const query = `
      UPDATE experiments
      SET status = 'completed',
          end_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [experimentId]);

    if (result.rows.length === 0) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    logger.info(`Experiment ${experimentId} stopped`);
    return result.rows[0];
  }

  /**
   * Assign user to experiment variant
   * Uses deterministic hashing to ensure consistent assignments
   * @param {number} userId - User ID
   * @param {number} experimentId - Experiment ID
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<Object>} Assigned variant
   */
  static async assignUserToVariant(userId, experimentId, sessionId = null) {
    // Check if user already assigned
    const existing = await pool.query(
      `SELECT v.* FROM user_experiment_assignments uea
       JOIN experiment_variants v ON uea.variant_id = v.id
       WHERE uea.user_id = $1 AND uea.experiment_id = $2`,
      [userId, experimentId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Get experiment and variants
    const expResult = await pool.query(
      `SELECT * FROM experiments WHERE id = $1 AND status = 'running'`,
      [experimentId]
    );

    if (expResult.rows.length === 0) {
      throw new Error(`Experiment ${experimentId} not found or not running`);
    }

    const experiment = expResult.rows[0];

    // Check traffic allocation
    const randomValue = Math.random() * 100;
    if (randomValue > experiment.traffic_allocation) {
      // User not in experiment, return control
      return null;
    }

    // Get variants
    const variantsResult = await pool.query(
      `SELECT * FROM experiment_variants WHERE experiment_id = $1 ORDER BY id`,
      [experimentId]
    );

    const variants = variantsResult.rows;

    if (variants.length === 0) {
      throw new Error(`No variants found for experiment ${experimentId}`);
    }

    // Deterministic variant selection using hash
    const variant = this.selectVariantDeterministic(userId, variants);

    // Assign user to variant
    await pool.query(
      `INSERT INTO user_experiment_assignments (user_id, experiment_id, variant_id, session_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, experiment_id) DO NOTHING`,
      [userId, experimentId, variant.id, sessionId]
    );

    logger.info(`User ${userId} assigned to variant ${variant.name} in experiment ${experimentId}`);
    return variant;
  }

  /**
   * Select variant deterministically using user ID hash
   * @param {number} userId - User ID
   * @param {Array} variants - Array of variants
   * @returns {Object} Selected variant
   */
  static selectVariantDeterministic(userId, variants) {
    // Calculate total weight
    const totalWeight = variants.reduce((sum, v) => sum + v.traffic_weight, 0);

    // Create deterministic hash from user ID
    const hash = crypto.createHash('md5').update(String(userId)).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const normalized = (hashValue % 10000) / 10000; // 0-1

    // Select variant based on weight
    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.traffic_weight / totalWeight;
      if (normalized <= cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  /**
   * Get user's assigned variant for an experiment
   * @param {number} userId - User ID
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Object|null>} Variant or null
   */
  static async getUserVariant(userId, experimentId) {
    const result = await pool.query(
      `SELECT v.* FROM user_experiment_assignments uea
       JOIN experiment_variants v ON uea.variant_id = v.id
       WHERE uea.user_id = $1 AND uea.experiment_id = $2`,
      [userId, experimentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Track experiment event
   * @param {Object} eventData - Event data
   * @returns {Promise<void>}
   */
  static async trackEvent(eventData) {
    const {
      userId,
      experimentId,
      variantId,
      eventType,
      eventName,
      itemId = null,
      brandId = null,
      position = null,
      moduleId = null,
      eventData: data = {},
      value = 0,
      sessionId = null
    } = eventData;

    const query = `
      INSERT INTO experiment_events (
        user_id, experiment_id, variant_id, event_type, event_name,
        item_id, brand_id, position, module_id, event_data, value, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await pool.query(query, [
      userId,
      experimentId,
      variantId,
      eventType,
      eventName,
      itemId,
      brandId,
      position,
      moduleId,
      JSON.stringify(data),
      value,
      sessionId
    ]);
  }

  /**
   * Get experiment performance
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Array>} Performance by variant
   */
  static async getExperimentPerformance(experimentId) {
    const result = await pool.query(
      'SELECT * FROM get_experiment_performance($1)',
      [experimentId]
    );

    return result.rows;
  }

  /**
   * Get all running experiments
   * @returns {Promise<Array>} Running experiments
   */
  static async getRunningExperiments() {
    const result = await pool.query(
      `SELECT * FROM experiments WHERE status = 'running' ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Get experiment by name
   * @param {string} name - Experiment name
   * @returns {Promise<Object|null>} Experiment or null
   */
  static async getExperimentByName(name) {
    const result = await pool.query(
      `SELECT * FROM experiments WHERE name = $1`,
      [name]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get experiment by ID
   * @param {number} id - Experiment ID
   * @returns {Promise<Object|null>} Experiment or null
   */
  static async getExperimentById(id) {
    const result = await pool.query(
      `SELECT * FROM experiments WHERE id = $1`,
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get experiment variants
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Array>} Variants
   */
  static async getExperimentVariants(experimentId) {
    const result = await pool.query(
      `SELECT * FROM experiment_variants WHERE experiment_id = $1 ORDER BY is_control DESC, id`,
      [experimentId]
    );

    return result.rows;
  }

  /**
   * Update position performance tracking
   * @param {number} experimentId - Experiment ID
   * @param {number} position - Position in list
   * @param {Object} metrics - Performance metrics
   * @returns {Promise<void>}
   */
  static async updatePositionPerformance(experimentId, position, metrics) {
    const {
      impressions = 0,
      clicks = 0,
      conversions = 0,
      value = 0
    } = metrics;

    const query = `
      INSERT INTO position_performance (
        experiment_id, position, impressions, clicks, conversions, total_value, date
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      ON CONFLICT (experiment_id, position, date)
      DO UPDATE SET
        impressions = position_performance.impressions + EXCLUDED.impressions,
        clicks = position_performance.clicks + EXCLUDED.clicks,
        conversions = position_performance.conversions + EXCLUDED.conversions,
        total_value = position_performance.total_value + EXCLUDED.total_value,
        click_through_rate = CASE
          WHEN position_performance.impressions + EXCLUDED.impressions > 0
          THEN ROUND(
            (position_performance.clicks + EXCLUDED.clicks)::DECIMAL /
            (position_performance.impressions + EXCLUDED.impressions) * 100,
            4
          )
          ELSE 0
        END,
        conversion_rate = CASE
          WHEN position_performance.clicks + EXCLUDED.clicks > 0
          THEN ROUND(
            (position_performance.conversions + EXCLUDED.conversions)::DECIMAL /
            (position_performance.clicks + EXCLUDED.clicks) * 100,
            4
          )
          ELSE 0
        END,
        average_value = CASE
          WHEN position_performance.impressions + EXCLUDED.impressions > 0
          THEN ROUND(
            (position_performance.total_value + EXCLUDED.total_value) /
            (position_performance.impressions + EXCLUDED.impressions),
            2
          )
          ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(query, [experimentId, position, impressions, clicks, conversions, value]);
  }

  /**
   * Get position performance data
   * @param {number} experimentId - Experiment ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Position performance data
   */
  static async getPositionPerformance(experimentId, days = 7) {
    const query = `
      SELECT
        position,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(conversions) as total_conversions,
        ROUND(
          SUM(clicks)::DECIMAL / NULLIF(SUM(impressions), 0) * 100,
          2
        ) as click_through_rate,
        ROUND(
          SUM(conversions)::DECIMAL / NULLIF(SUM(clicks), 0) * 100,
          2
        ) as conversion_rate,
        ROUND(
          SUM(total_value) / NULLIF(SUM(impressions), 0),
          2
        ) as avg_value_per_impression
      FROM position_performance
      WHERE experiment_id = $1
        AND date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY position
      ORDER BY position
    `;

    const result = await pool.query(query, [experimentId]);
    return result.rows;
  }

  /**
   * Declare experiment winner
   * @param {number} experimentId - Experiment ID
   * @param {number} winnerVariantId - Winning variant ID
   * @param {number} significance - Statistical significance
   * @returns {Promise<Object>} Updated experiment
   */
  static async declareWinner(experimentId, winnerVariantId, significance) {
    const query = `
      UPDATE experiments
      SET winner_variant_id = $1,
          statistical_significance = $2,
          status = 'completed',
          end_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [winnerVariantId, significance, experimentId]);

    logger.info(`Experiment ${experimentId} winner declared: variant ${winnerVariantId} (${significance}% confidence)`);
    return result.rows[0];
  }
}

module.exports = ExperimentService;
