/**
 * Analytics Service
 * Tracks impressions, clicks, conversions, and calculates experiment metrics
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class AnalyticsService {
  /**
   * Track impression event
   * @param {Object} data - Impression data
   * @returns {Promise<void>}
   */
  static async trackImpression(data) {
    const {
      userId,
      sessionId,
      experimentId,
      variantId,
      itemId,
      brandId,
      position,
      placement = 'newsfeed',
      pageType = 'feed',
      metadata = {}
    } = data;

    await pool.query(
      `INSERT INTO experiment_events (
        user_id, experiment_id, variant_id, event_type, event_name,
        item_id, brand_id, position, session_id, event_data
      ) VALUES ($1, $2, $3, 'impression', $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        experimentId,
        variantId,
        `${placement}_impression`,
        itemId,
        brandId,
        position,
        sessionId,
        JSON.stringify({ ...metadata, placement, pageType })
      ]
    );
  }

  /**
   * Track click event
   * @param {Object} data - Click data
   * @returns {Promise<void>}
   */
  static async trackClick(data) {
    const {
      userId,
      sessionId,
      experimentId,
      variantId,
      itemId,
      brandId,
      position,
      placement = 'newsfeed',
      pageType = 'feed',
      metadata = {}
    } = data;

    await pool.query(
      `INSERT INTO experiment_events (
        user_id, experiment_id, variant_id, event_type, event_name,
        item_id, brand_id, position, session_id, event_data
      ) VALUES ($1, $2, $3, 'click', $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        experimentId,
        variantId,
        `${placement}_click`,
        itemId,
        brandId,
        position,
        sessionId,
        JSON.stringify({ ...metadata, placement, pageType })
      ]
    );
  }

  /**
   * Track add-to-cart event (primary metric)
   * @param {Object} data - Add to cart data
   * @returns {Promise<void>}
   */
  static async trackAddToCart(data) {
    const {
      userId,
      sessionId,
      experimentId,
      variantId,
      itemId,
      brandId,
      position,
      value, // price of item
      placement = 'newsfeed',
      metadata = {}
    } = data;

    await pool.query(
      `INSERT INTO experiment_events (
        user_id, experiment_id, variant_id, event_type, event_name,
        item_id, brand_id, position, value, session_id, event_data
      ) VALUES ($1, $2, $3, 'conversion', 'add_to_cart', $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        experimentId,
        variantId,
        itemId,
        brandId,
        position,
        value,
        sessionId,
        JSON.stringify({ ...metadata, placement })
      ]
    );
  }

  /**
   * Track purchase event
   * @param {Object} data - Purchase data
   * @returns {Promise<void>}
   */
  static async trackPurchase(data) {
    const {
      userId,
      sessionId,
      experimentId,
      variantId,
      itemId,
      brandId,
      value, // purchase amount
      metadata = {}
    } = data;

    await pool.query(
      `INSERT INTO experiment_events (
        user_id, experiment_id, variant_id, event_type, event_name,
        item_id, brand_id, value, session_id, event_data
      ) VALUES ($1, $2, $3, 'conversion', 'purchase', $4, $5, $6, $7, $8)`,
      [
        userId,
        experimentId,
        variantId,
        itemId,
        brandId,
        value,
        sessionId,
        JSON.stringify(metadata)
      ]
    );
  }

  /**
   * Calculate experiment metrics
   * @param {number} experimentId - Experiment ID
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Object>} Experiment metrics
   */
  static async calculateMetrics(experimentId, startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [experimentId];

    if (startDate && endDate) {
      dateFilter = 'AND created_at BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    // Get metrics by variant
    const query = `
      WITH variant_metrics AS (
        SELECT
          ev.variant_id,
          ev.name as variant_name,
          ev.is_control,

          -- Impressions
          COUNT(*) FILTER (WHERE ee.event_type = 'impression') as impressions,

          -- Clicks
          COUNT(*) FILTER (WHERE ee.event_type = 'click') as clicks,

          -- Add to Cart (primary metric)
          COUNT(*) FILTER (WHERE ee.event_name = 'add_to_cart') as add_to_carts,

          -- Purchases
          COUNT(*) FILTER (WHERE ee.event_name = 'purchase') as purchases,

          -- Revenue
          COALESCE(SUM(ee.value) FILTER (WHERE ee.event_name = 'purchase'), 0) as total_revenue,

          -- Unique users
          COUNT(DISTINCT ee.user_id) as unique_users,

          -- Unique sessions
          COUNT(DISTINCT ee.session_id) as unique_sessions

        FROM experiment_variants ev
        LEFT JOIN experiment_events ee ON ev.id = ee.variant_id
        WHERE ev.experiment_id = $1
          ${dateFilter}
        GROUP BY ev.variant_id, ev.name, ev.is_control
      )
      SELECT
        variant_id,
        variant_name,
        is_control,
        impressions,
        clicks,
        add_to_carts,
        purchases,
        total_revenue,
        unique_users,
        unique_sessions,

        -- Calculate rates
        ROUND(
          CASE WHEN impressions > 0
          THEN (clicks::DECIMAL / impressions) * 100
          ELSE 0 END,
          2
        ) as click_through_rate,

        ROUND(
          CASE WHEN clicks > 0
          THEN (add_to_carts::DECIMAL / clicks) * 100
          ELSE 0 END,
          2
        ) as add_to_cart_rate,

        ROUND(
          CASE WHEN impressions > 0
          THEN (add_to_carts::DECIMAL / impressions) * 100
          ELSE 0 END,
          2
        ) as impression_to_cart_rate,

        ROUND(
          CASE WHEN add_to_carts > 0
          THEN (purchases::DECIMAL / add_to_carts) * 100
          ELSE 0 END,
          2
        ) as cart_to_purchase_rate,

        ROUND(
          CASE WHEN unique_users > 0
          THEN total_revenue / unique_users
          ELSE 0 END,
          2
        ) as revenue_per_user,

        ROUND(
          CASE WHEN unique_sessions > 0
          THEN total_revenue / unique_sessions
          ELSE 0 END,
          2
        ) as revenue_per_session

      FROM variant_metrics
      ORDER BY is_control DESC, variant_name
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Calculate lift vs control
   * @param {number} experimentId - Experiment ID
   * @param {string} metric - Metric to calculate lift for
   * @returns {Promise<Array>} Lift calculations
   */
  static async calculateLift(experimentId, metric = 'add_to_cart_rate') {
    const metrics = await this.calculateMetrics(experimentId);

    const control = metrics.find(m => m.is_control);
    if (!control) {
      throw new Error('No control variant found');
    }

    const controlValue = parseFloat(control[metric] || 0);

    return metrics.map(variant => {
      const variantValue = parseFloat(variant[metric] || 0);
      const absoluteLift = variantValue - controlValue;
      const relativeLift = controlValue > 0
        ? ((variantValue - controlValue) / controlValue) * 100
        : 0;

      return {
        variant_id: variant.variant_id,
        variant_name: variant.variant_name,
        is_control: variant.is_control,
        metric,
        control_value: controlValue,
        variant_value: variantValue,
        absolute_lift: parseFloat(absoluteLift.toFixed(2)),
        relative_lift_percent: parseFloat(relativeLift.toFixed(2))
      };
    });
  }

  /**
   * Get position performance analysis
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Array>} Position performance
   */
  static async getPositionAnalysis(experimentId) {
    const query = `
      SELECT
        position,
        COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
        COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
        COUNT(*) FILTER (WHERE event_name = 'add_to_cart') as add_to_carts,
        ROUND(
          CASE WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0
          THEN (COUNT(*) FILTER (WHERE event_type = 'click')::DECIMAL /
                COUNT(*) FILTER (WHERE event_type = 'impression')) * 100
          ELSE 0 END,
          2
        ) as ctr,
        ROUND(
          CASE WHEN COUNT(*) FILTER (WHERE event_type = 'click') > 0
          THEN (COUNT(*) FILTER (WHERE event_name = 'add_to_cart')::DECIMAL /
                COUNT(*) FILTER (WHERE event_type = 'click')) * 100
          ELSE 0 END,
          2
        ) as add_to_cart_rate
      FROM experiment_events
      WHERE experiment_id = $1
        AND position IS NOT NULL
      GROUP BY position
      ORDER BY position
    `;

    const result = await pool.query(query, [experimentId]);
    return result.rows;
  }

  /**
   * Get time series data for experiment
   * @param {number} experimentId - Experiment ID
   * @param {string} groupBy - 'hour', 'day', or 'week'
   * @returns {Promise<Array>} Time series data
   */
  static async getTimeSeries(experimentId, groupBy = 'day') {
    const truncFunction = {
      'hour': 'hour',
      'day': 'day',
      'week': 'week'
    }[groupBy] || 'day';

    const query = `
      SELECT
        DATE_TRUNC('${truncFunction}', created_at) as time_bucket,
        variant_id,
        COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
        COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
        COUNT(*) FILTER (WHERE event_name = 'add_to_cart') as add_to_carts,
        COUNT(*) FILTER (WHERE event_name = 'purchase') as purchases,
        SUM(value) FILTER (WHERE event_name = 'purchase') as revenue
      FROM experiment_events
      WHERE experiment_id = $1
      GROUP BY time_bucket, variant_id
      ORDER BY time_bucket, variant_id
    `;

    const result = await pool.query(query, [experimentId]);
    return result.rows;
  }

  /**
   * Get item performance in experiment
   * @param {number} experimentId - Experiment ID
   * @param {number} limit - Number of top items
   * @returns {Promise<Array>} Top performing items
   */
  static async getTopItems(experimentId, limit = 20) {
    const query = `
      SELECT
        i.id,
        i.name,
        b.name as brand_name,
        COUNT(*) FILTER (WHERE ee.event_type = 'impression') as impressions,
        COUNT(*) FILTER (WHERE ee.event_type = 'click') as clicks,
        COUNT(*) FILTER (WHERE ee.event_name = 'add_to_cart') as add_to_carts,
        ROUND(
          CASE WHEN COUNT(*) FILTER (WHERE ee.event_type = 'impression') > 0
          THEN (COUNT(*) FILTER (WHERE event_name = 'add_to_cart')::DECIMAL /
                COUNT(*) FILTER (WHERE event_type = 'impression')) * 100
          ELSE 0 END,
          2
        ) as conversion_rate
      FROM experiment_events ee
      JOIN items i ON ee.item_id = i.id
      LEFT JOIN brands b ON i.brand_id = b.id
      WHERE ee.experiment_id = $1
        AND ee.item_id IS NOT NULL
      GROUP BY i.id, i.name, b.name
      ORDER BY add_to_carts DESC, clicks DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [experimentId, limit]);
    return result.rows;
  }

  /**
   * Get brand performance in experiment
   * @param {number} experimentId - Experiment ID
   * @param {number} limit - Number of top brands
   * @returns {Promise<Array>} Top performing brands
   */
  static async getTopBrands(experimentId, limit = 20) {
    const query = `
      SELECT
        b.id,
        b.name,
        COUNT(*) FILTER (WHERE ee.event_type = 'impression') as impressions,
        COUNT(*) FILTER (WHERE ee.event_type = 'click') as clicks,
        COUNT(*) FILTER (WHERE ee.event_name = 'add_to_cart') as add_to_carts,
        ROUND(
          CASE WHEN COUNT(*) FILTER (WHERE ee.event_type = 'impression') > 0
          THEN (COUNT(*) FILTER (WHERE event_name = 'add_to_cart')::DECIMAL /
                COUNT(*) FILTER (WHERE event_type = 'impression')) * 100
          ELSE 0 END,
          2
        ) as conversion_rate
      FROM experiment_events ee
      JOIN brands b ON ee.brand_id = b.id
      WHERE ee.experiment_id = $1
        AND ee.brand_id IS NOT NULL
      GROUP BY b.id, b.name
      ORDER BY add_to_carts DESC, clicks DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [experimentId, limit]);
    return result.rows;
  }

  /**
   * Calculate statistical significance (simplified Chi-square test)
   * @param {Object} control - Control variant metrics
   * @param {Object} treatment - Treatment variant metrics
   * @returns {Object} Significance test results
   */
  static calculateSignificance(control, treatment) {
    // Simple proportion z-test for conversion rates
    const p1 = control.add_to_carts / control.impressions;
    const p2 = treatment.add_to_carts / treatment.impressions;

    const n1 = control.impressions;
    const n2 = treatment.impressions;

    const p = (control.add_to_carts + treatment.add_to_carts) / (n1 + n2);

    const se = Math.sqrt(p * (1 - p) * (1/n1 + 1/n2));

    const z = (p2 - p1) / se;

    // Calculate p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    // Confidence level
    const confidence = (1 - pValue) * 100;

    return {
      z_score: parseFloat(z.toFixed(4)),
      p_value: parseFloat(pValue.toFixed(4)),
      confidence_percent: parseFloat(confidence.toFixed(2)),
      is_significant: pValue < 0.05, // 95% confidence
      treatment_better: p2 > p1
    };
  }

  /**
   * Normal CDF approximation
   * @param {number} x - Value
   * @returns {number} CDF value
   */
  static normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Get experiment summary report
   * @param {number} experimentId - Experiment ID
   * @returns {Promise<Object>} Complete experiment report
   */
  static async getExperimentReport(experimentId) {
    const metrics = await this.calculateMetrics(experimentId);
    const lift = await this.calculateLift(experimentId, 'add_to_cart_rate');
    const positionAnalysis = await this.getPositionAnalysis(experimentId);
    const topItems = await this.getTopItems(experimentId, 10);
    const topBrands = await this.getTopBrands(experimentId, 10);

    // Calculate significance
    const control = metrics.find(m => m.is_control);
    const treatments = metrics.filter(m => !m.is_control);

    const significanceTests = treatments.map(treatment => ({
      variant_name: treatment.variant_name,
      ...this.calculateSignificance(control, treatment)
    }));

    return {
      experiment_id: experimentId,
      metrics,
      lift,
      significance_tests: significanceTests,
      position_analysis: positionAnalysis,
      top_items: topItems,
      top_brands: topBrands
    };
  }
}

module.exports = AnalyticsService;
