/**
 * Metrics Service
 * Tracks user sessions, page views, conversion funnels, and cart events
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class MetricsService {
  /**
   * Track session start
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Created session
   */
  static async trackSessionStart(sessionData) {
    const {
      userId = null,
      sessionId,
      deviceType = null,
      browser = null,
      platform = null,
      userAgent = null,
      referrer = null,
      utmSource = null,
      utmMedium = null,
      utmCampaign = null,
      utmContent = null,
      utmTerm = null
    } = sessionData;

    const query = `
      INSERT INTO user_sessions (
        user_id, session_id, device_type, browser, platform, user_agent,
        referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        session_start
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id) DO UPDATE
      SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId, sessionId, deviceType, browser, platform, userAgent,
      referrer, utmSource, utmMedium, utmCampaign, utmContent, utmTerm
    ]);

    logger.info(`Session started: ${sessionId}`, { userId, sessionId });
    return result.rows[0];
  }

  /**
   * Track session end
   * @param {string} sessionId - Session ID
   * @param {string} exitPageUrl - Last page visited
   * @returns {Promise<Object>} Updated session
   */
  static async trackSessionEnd(sessionId, exitPageUrl = null) {
    const query = `
      UPDATE user_sessions
      SET
        session_end = CURRENT_TIMESTAMP,
        exit_page_url = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [sessionId, exitPageUrl]);

    if (result.rows.length > 0) {
      logger.info(`Session ended: ${sessionId}`);
      return result.rows[0];
    }

    return null;
  }

  /**
   * Update session metrics (pages viewed, interactions, cart adds)
   * @param {string} sessionId - Session ID
   * @param {Object} metrics - Metrics to update
   * @returns {Promise<Object>} Updated session
   */
  static async updateSessionMetrics(sessionId, metrics) {
    const {
      pagesViewed = null,
      interactionsCount = null,
      cartAdds = null,
      purchases = null,
      totalRevenueCents = null
    } = metrics;

    const updates = [];
    const values = [sessionId];
    let paramIndex = 2;

    if (pagesViewed !== null) {
      updates.push(`pages_viewed = pages_viewed + $${paramIndex}`);
      values.push(pagesViewed);
      paramIndex++;
    }

    if (interactionsCount !== null) {
      updates.push(`interactions_count = interactions_count + $${paramIndex}`);
      values.push(interactionsCount);
      paramIndex++;
    }

    if (cartAdds !== null) {
      updates.push(`cart_adds = cart_adds + $${paramIndex}`);
      values.push(cartAdds);
      paramIndex++;
    }

    if (purchases !== null) {
      updates.push(`purchases = purchases + $${paramIndex}`);
      values.push(purchases);
      paramIndex++;
    }

    if (totalRevenueCents !== null) {
      updates.push(`total_revenue_cents = total_revenue_cents + $${paramIndex}`);
      values.push(totalRevenueCents);
      paramIndex++;
    }

    if (updates.length === 0) {
      return null;
    }

    const query = `
      UPDATE user_sessions
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Track page view start
   * @param {Object} pageData - Page view data
   * @returns {Promise<Object>} Created page view
   */
  static async trackPageView(pageData) {
    const {
      sessionId,
      userId = null,
      pageUrl,
      pageType = null,
      pageTitle = null,
      referrerUrl = null,
      isEntryPage = false,
      productId = null,
      brandId = null
    } = pageData;

    const query = `
      INSERT INTO page_views (
        session_id, user_id, page_url, page_type, page_title,
        referrer_url, is_entry_page, product_id, brand_id,
        view_started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      sessionId, userId, pageUrl, pageType, pageTitle,
      referrerUrl, isEntryPage, productId, brandId
    ]);

    // Update session pages_viewed count
    await this.updateSessionMetrics(sessionId, { pagesViewed: 1 });

    logger.info(`Page view tracked: ${pageType || pageUrl}`, { sessionId, pageType });
    return result.rows[0];
  }

  /**
   * Track page view end (when user leaves page)
   * @param {number} pageViewId - Page view ID
   * @param {number} scrollDepthPercent - How far user scrolled (0-100)
   * @param {number} interactionsOnPage - Number of interactions
   * @param {boolean} isExitPage - Is this the last page in session
   * @returns {Promise<Object>} Updated page view
   */
  static async trackPageViewEnd(pageViewId, scrollDepthPercent = null, interactionsOnPage = 0, isExitPage = false) {
    const query = `
      UPDATE page_views
      SET
        view_ended_at = CURRENT_TIMESTAMP,
        scroll_depth_percent = $2,
        interactions_on_page = $3,
        is_exit_page = $4
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [
      pageViewId, scrollDepthPercent, interactionsOnPage, isExitPage
    ]);

    return result.rows[0] || null;
  }

  /**
   * Track funnel stage progression
   * @param {Object} funnelData - Funnel progression data
   * @returns {Promise<Object>} Created funnel entry
   */
  static async trackFunnelStage(funnelData) {
    const {
      sessionId,
      userId = null,
      funnelStage, // 'browse', 'view_product', 'add_to_cart', 'view_cart', 'checkout', 'purchase'
      productId = null,
      brandId = null,
      metadata = {}
    } = funnelData;

    // Get previous stage time (if any)
    const prevStageQuery = `
      SELECT reached_at
      FROM conversion_funnels
      WHERE session_id = $1
      ORDER BY reached_at DESC
      LIMIT 1
    `;
    const prevResult = await pool.query(prevStageQuery, [sessionId]);
    const timeSincePrevious = prevResult.rows.length > 0
      ? `EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $7::TIMESTAMP))::INTEGER`
      : 'NULL';

    // Get session start time
    const sessionQuery = `
      SELECT session_start FROM user_sessions WHERE session_id = $1
    `;
    const sessionResult = await pool.query(sessionQuery, [sessionId]);
    const timeSinceSessionStart = sessionResult.rows.length > 0
      ? `EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $8::TIMESTAMP))::INTEGER`
      : 'NULL';

    const query = `
      INSERT INTO conversion_funnels (
        session_id, user_id, funnel_stage, product_id, brand_id,
        time_since_previous_stage_seconds,
        time_since_session_start_seconds,
        metadata, reached_at
      )
      VALUES ($1, $2, $3, $4, $5, ${timeSincePrevious}, ${timeSinceSessionStart}, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      sessionId,
      userId,
      funnelStage,
      productId,
      brandId,
      JSON.stringify(metadata)
    ];

    if (prevResult.rows.length > 0) {
      values.push(prevResult.rows[0].reached_at);
    }

    if (sessionResult.rows.length > 0) {
      values.push(sessionResult.rows[0].session_start);
    }

    const result = await pool.query(query, values);

    logger.info(`Funnel stage tracked: ${funnelStage}`, { sessionId, funnelStage });
    return result.rows[0];
  }

  /**
   * Track cart event
   * @param {Object} cartData - Cart event data
   * @returns {Promise<Object>} Created cart event
   */
  static async trackCartEvent(cartData) {
    const {
      cartItemId = null,
      userId,
      sessionId = null,
      eventType, // 'created', 'item_added', 'item_removed', 'item_quantity_changed', 'abandoned', 'converted'
      productId = null,
      quantity = null,
      valueCents = null,
      metadata = {}
    } = cartData;

    const query = `
      INSERT INTO cart_events (
        cart_item_id, user_id, session_id, event_type,
        product_id, quantity, value_cents, metadata, occurred_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      cartItemId, userId, sessionId, eventType,
      productId, quantity, valueCents, JSON.stringify(metadata)
    ]);

    // Update session cart_adds count if item added
    if (eventType === 'item_added' && sessionId) {
      await this.updateSessionMetrics(sessionId, { cartAdds: 1 });
    }

    // Update session purchases and revenue if converted
    if (eventType === 'converted' && sessionId && valueCents) {
      await this.updateSessionMetrics(sessionId, {
        purchases: 1,
        totalRevenueCents: valueCents
      });
    }

    logger.info(`Cart event tracked: ${eventType}`, { userId, eventType });
    return result.rows[0];
  }

  /**
   * Get session by session ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  static async getSession(sessionId) {
    const query = `SELECT * FROM user_sessions WHERE session_id = $1`;
    const result = await pool.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  /**
   * Get all page views for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Page views
   */
  static async getSessionPageViews(sessionId) {
    const query = `
      SELECT * FROM page_views
      WHERE session_id = $1
      ORDER BY view_started_at ASC
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows;
  }

  /**
   * Get funnel progression for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Funnel stages
   */
  static async getSessionFunnel(sessionId) {
    const query = `
      SELECT * FROM conversion_funnels
      WHERE session_id = $1
      ORDER BY reached_at ASC
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows;
  }
}

module.exports = MetricsService;
