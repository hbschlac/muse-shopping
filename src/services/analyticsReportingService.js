/**
 * Analytics Reporting Service
 * Provides aggregated analytics and metrics for dashboards
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class AnalyticsReportingService {
  /**
   * Get session statistics for a date range
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Session stats
   */
  static async getSessionStats(options = {}) {
    const {
      startDate = null,
      endDate = null,
      groupBy = 'day' // 'day', 'week', 'month'
    } = options;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE session_start BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE session_start >= $1';
      params.push(startDate);
    }

    const dateGroup = groupBy === 'week' ? 'week' : groupBy === 'month' ? 'month' : 'day';

    const query = `
      SELECT
        DATE_TRUNC('${dateGroup}', session_start) as period,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(AVG(session_duration_seconds)) as avg_duration_seconds,
        ROUND(AVG(pages_viewed)) as avg_pages_per_session,
        ROUND(AVG(interactions_count)) as avg_interactions,
        ROUND(SUM(CASE WHEN bounce = true THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 4) as bounce_rate,
        SUM(cart_adds) as total_cart_adds,
        SUM(purchases) as total_purchases,
        SUM(total_revenue_cents) as total_revenue_cents,
        ROUND(SUM(purchases)::NUMERIC / NULLIF(COUNT(*), 0), 4) as conversion_rate
      FROM user_sessions
      ${dateFilter}
      GROUP BY DATE_TRUNC('${dateGroup}', session_start)
      ORDER BY period DESC
    `;

    const result = await pool.query(query, params);

    return {
      stats: result.rows,
      summary: this._calculateSummary(result.rows)
    };
  }

  /**
   * Get page view statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Page view stats
   */
  static async getPageViewStats(options = {}) {
    const {
      startDate = null,
      endDate = null,
      pageType = null
    } = options;

    let filters = ['view_ended_at IS NOT NULL'];
    const params = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      filters.push(`view_started_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      filters.push(`view_started_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (pageType) {
      filters.push(`page_type = $${paramIndex}`);
      params.push(pageType);
      paramIndex++;
    }

    const query = `
      SELECT
        page_type,
        COUNT(*) as total_views,
        ROUND(AVG(time_on_page_seconds)) as avg_time_seconds,
        ROUND(AVG(scroll_depth_percent)) as avg_scroll_depth,
        ROUND(AVG(interactions_on_page)) as avg_interactions,
        ROUND(SUM(CASE WHEN is_exit_page = true THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 4) as exit_rate
      FROM page_views
      WHERE ${filters.join(' AND ')}
      GROUP BY page_type
      ORDER BY total_views DESC
    `;

    const result = await pool.query(query, params);

    return {
      by_page_type: result.rows,
      total_page_views: result.rows.reduce((sum, row) => sum + parseInt(row.total_views), 0)
    };
  }

  /**
   * Get top pages by views
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top pages
   */
  static async getTopPages(options = {}) {
    const {
      limit = 20,
      startDate = null,
      endDate = null
    } = options;

    let dateFilter = '';
    const params = [limit];

    if (startDate && endDate) {
      dateFilter = 'WHERE view_started_at BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE view_started_at >= $2';
      params.push(startDate);
    }

    const query = `
      SELECT
        page_url,
        page_type,
        page_title,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_sessions,
        ROUND(AVG(time_on_page_seconds)) as avg_time_seconds,
        ROUND(AVG(scroll_depth_percent)) as avg_scroll_depth
      FROM page_views
      ${dateFilter}
      GROUP BY page_url, page_type, page_title
      ORDER BY views DESC
      LIMIT $1
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get conversion funnel analysis
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Funnel analysis
   */
  static async getFunnelAnalysis(options = {}) {
    const {
      startDate = null,
      endDate = null
    } = options;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE reached_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE reached_at >= $1';
      params.push(startDate);
    }

    const query = `
      SELECT
        funnel_stage,
        COUNT(DISTINCT session_id) as sessions_reached,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(AVG(time_since_session_start_seconds)) as avg_time_to_reach_seconds
      FROM conversion_funnels
      ${dateFilter}
      GROUP BY funnel_stage
      ORDER BY
        CASE funnel_stage
          WHEN 'browse' THEN 1
          WHEN 'view_product' THEN 2
          WHEN 'add_to_cart' THEN 3
          WHEN 'view_cart' THEN 4
          WHEN 'checkout' THEN 5
          WHEN 'purchase' THEN 6
        END
    `;

    const result = await pool.query(query, params);

    // Calculate drop-off rates
    const stages = result.rows;
    const funnelWithDropoff = stages.map((stage, index) => {
      if (index === 0) {
        return {
          ...stage,
          drop_off_rate: null,
          conversion_from_start: 1.0
        };
      }

      const previousStage = stages[index - 1];
      const startStage = stages[0];

      return {
        ...stage,
        drop_off_rate: parseFloat((
          (previousStage.sessions_reached - stage.sessions_reached) /
          previousStage.sessions_reached
        ).toFixed(4)),
        conversion_from_start: parseFloat((
          stage.sessions_reached / startStage.sessions_reached
        ).toFixed(4))
      };
    });

    return {
      funnel_stages: funnelWithDropoff,
      overall_conversion_rate: stages.length > 0 && stages[0].sessions_reached > 0
        ? parseFloat((stages[stages.length - 1].sessions_reached / stages[0].sessions_reached).toFixed(4))
        : 0
    };
  }

  /**
   * Get cart analytics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Cart analytics
   */
  static async getCartAnalytics(options = {}) {
    const {
      startDate = null,
      endDate = null
    } = options;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE occurred_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE occurred_at >= $1';
      params.push(startDate);
    }

    const query = `
      SELECT
        COUNT(DISTINCT CASE WHEN event_type = 'item_added' THEN user_id END) as users_added_to_cart,
        COUNT(DISTINCT CASE WHEN event_type = 'converted' THEN user_id END) as users_converted,
        SUM(CASE WHEN event_type = 'item_added' THEN 1 ELSE 0 END) as total_items_added,
        SUM(CASE WHEN event_type = 'item_removed' THEN 1 ELSE 0 END) as total_items_removed,
        ROUND(AVG(CASE WHEN event_type = 'item_added' THEN value_cents END)) as avg_item_value_cents,
        SUM(CASE WHEN event_type = 'converted' THEN value_cents ELSE 0 END) as total_revenue_cents
      FROM cart_events
      ${dateFilter}
    `;

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    // Calculate cart abandonment rate
    const abandonmentRate = stats.users_added_to_cart > 0
      ? parseFloat((
        (stats.users_added_to_cart - stats.users_converted) /
        stats.users_added_to_cart
      ).toFixed(4))
      : 0;

    // Calculate average cart value
    const avgCartValue = stats.users_converted > 0
      ? Math.round(stats.total_revenue_cents / stats.users_converted)
      : 0;

    return {
      ...stats,
      abandonment_rate: abandonmentRate,
      avg_cart_value_cents: avgCartValue,
      conversion_rate: stats.users_added_to_cart > 0
        ? parseFloat((stats.users_converted / stats.users_added_to_cart).toFixed(4))
        : 0
    };
  }

  /**
   * Get top products by cart adds
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top products
   */
  static async getTopCartProducts(options = {}) {
    const {
      limit = 20,
      startDate = null,
      endDate = null
    } = options;

    let dateFilter = '';
    const params = [limit];

    if (startDate && endDate) {
      dateFilter = 'AND ce.occurred_at BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND ce.occurred_at >= $2';
      params.push(startDate);
    }

    const query = `
      SELECT
        ce.product_id,
        pc.product_name,
        pc.brand_id,
        b.name as brand_name,
        COUNT(*) as times_added_to_cart,
        SUM(CASE WHEN ce.event_type = 'converted' THEN 1 ELSE 0 END) as times_purchased,
        ROUND(AVG(ce.value_cents)) as avg_value_cents,
        ROUND(SUM(CASE WHEN ce.event_type = 'converted' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 4) as conversion_rate
      FROM cart_events ce
      LEFT JOIN product_catalog pc ON ce.product_id = pc.id
      LEFT JOIN brands b ON pc.brand_id = b.id
      WHERE ce.event_type = 'item_added'
        AND ce.product_id IS NOT NULL
        ${dateFilter}
      GROUP BY ce.product_id, pc.product_name, pc.brand_id, b.name
      ORDER BY times_added_to_cart DESC
      LIMIT $1
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get real-time metrics (last 24 hours)
   * @returns {Promise<Object>} Real-time metrics
   */
  static async getRealTimeMetrics() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sessions, pageViews, cartEvents, funnel] = await Promise.all([
      this.getSessionStats({ startDate: twentyFourHoursAgo }),
      this.getPageViewStats({ startDate: twentyFourHoursAgo }),
      this.getCartAnalytics({ startDate: twentyFourHoursAgo }),
      this.getFunnelAnalysis({ startDate: twentyFourHoursAgo })
    ]);

    return {
      period: 'last_24_hours',
      sessions: sessions.summary,
      page_views: pageViews,
      cart: cartEvents,
      funnel: funnel
    };
  }

  /**
   * Calculate summary statistics
   * @private
   */
  static _calculateSummary(rows) {
    if (rows.length === 0) {
      return {
        total_sessions: 0,
        total_users: 0,
        avg_session_duration: 0,
        avg_pages_per_session: 0,
        bounce_rate: 0,
        conversion_rate: 0,
        total_revenue_cents: 0
      };
    }

    const totals = rows.reduce((acc, row) => ({
      sessions: acc.sessions + parseInt(row.total_sessions),
      users: acc.users + parseInt(row.unique_users),
      cartAdds: acc.cartAdds + parseInt(row.total_cart_adds || 0),
      purchases: acc.purchases + parseInt(row.total_purchases || 0),
      revenue: acc.revenue + parseInt(row.total_revenue_cents || 0)
    }), { sessions: 0, users: 0, cartAdds: 0, purchases: 0, revenue: 0 });

    const avgDuration = rows.reduce((sum, r) => sum + (parseFloat(r.avg_duration_seconds) || 0), 0) / rows.length;
    const avgPages = rows.reduce((sum, r) => sum + (parseFloat(r.avg_pages_per_session) || 0), 0) / rows.length;
    const avgBounceRate = rows.reduce((sum, r) => sum + (parseFloat(r.bounce_rate) || 0), 0) / rows.length;

    return {
      total_sessions: totals.sessions,
      total_users: totals.users,
      avg_session_duration_seconds: Math.round(avgDuration),
      avg_pages_per_session: Math.round(avgPages),
      bounce_rate: parseFloat(avgBounceRate.toFixed(4)),
      total_cart_adds: totals.cartAdds,
      total_purchases: totals.purchases,
      conversion_rate: totals.sessions > 0
        ? parseFloat((totals.purchases / totals.sessions).toFixed(4))
        : 0,
      total_revenue_cents: totals.revenue
    };
  }
}

module.exports = AnalyticsReportingService;
