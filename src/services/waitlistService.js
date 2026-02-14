const pool = require('../db/pool');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');

class WaitlistService {
  /**
   * Generate a unique referral code for a user
   */
  static generateReferralCode(email) {
    // Create a code from first part of email + random string
    const emailPrefix = email.split('@')[0].substring(0, 4).toUpperCase();
    const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${emailPrefix}${randomString}`;
  }

  /**
   * Add a new signup to the waitlist
   */
  static async addSignup(data) {
    console.time('[PERF] Total addSignup');
    const {
      email,
      first_name,
      last_name,
      phone,
      interest_categories = [],
      favorite_brands = [],
      price_range_preference,
      referral_source,
      utm_source,
      utm_medium,
      utm_campaign,
      referral_code,
      signup_ip_address,
      user_agent,
    } = data;

    // Validate email
    console.time('[PERF] Email validation');
    if (!email || !this.isValidEmail(email)) {
      throw new ValidationError('Valid email is required');
    }
    console.timeEnd('[PERF] Email validation');

    // Check if email already exists
    console.time('[PERF] Check existing email');
    const existing = await this.findByEmail(email);
    if (existing && existing.status !== 'unsubscribed') {
      throw new ConflictError('Email already registered on waitlist');
    }
    console.timeEnd('[PERF] Check existing email');

    // Generate unique referral code for this user
    console.time('[PERF] Generate referral code');
    const myReferralCode = this.generateReferralCode(email);
    console.timeEnd('[PERF] Generate referral code');

    // Calculate priority score
    console.time('[PERF] Calculate priority');
    const priorityScore = await this.calculatePriorityScore({
      email,
      referral_code,
      interest_categories,
      favorite_brands,
    });
    console.timeEnd('[PERF] Calculate priority');

    const query = `
      INSERT INTO waitlist_signups (
        email,
        first_name,
        last_name,
        phone,
        interest_categories,
        favorite_brands,
        price_range_preference,
        referral_source,
        utm_source,
        utm_medium,
        utm_campaign,
        referral_code,
        my_referral_code,
        priority_score,
        signup_ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      email.toLowerCase().trim(),
      first_name,
      last_name,
      phone,
      JSON.stringify(interest_categories),
      JSON.stringify(favorite_brands),
      price_range_preference,
      referral_source,
      utm_source,
      utm_medium,
      utm_campaign,
      referral_code,
      myReferralCode,
      priorityScore,
      signup_ip_address,
      user_agent,
    ];

    console.time('[PERF] INSERT signup');
    const result = await pool.query(query, values);
    const signup = result.rows[0];
    console.timeEnd('[PERF] INSERT signup');

    // If they signed up with a referral code, mark the click as converted
    if (referral_code) {
      console.time('[PERF] Mark referral converted');
      await this.markReferralConverted(referral_code, email);
      console.timeEnd('[PERF] Mark referral converted');
    }

    // Get position in waitlist
    console.time('[PERF] Get position');
    const { position, total } = await this.getWaitlistPosition(signup.id);
    console.timeEnd('[PERF] Get position');

    console.timeEnd('[PERF] Total addSignup');
    return {
      ...signup,
      position,
      total,
    };
  }

  /**
   * Find waitlist signup by email
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM waitlist_signups WHERE email = $1';
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  }

  /**
   * Find waitlist signup by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM waitlist_signups WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get waitlist position for a signup
   */
  static async getWaitlistPosition(signupId) {
    const positionQuery = `
      SELECT COUNT(*) + 1 as position
      FROM waitlist_signups
      WHERE priority_score > (
        SELECT priority_score FROM waitlist_signups WHERE id = $1
      )
      AND status = 'pending'
    `;
    const positionResult = await pool.query(positionQuery, [signupId]);

    const totalQuery = `
      SELECT COUNT(*) as total
      FROM waitlist_signups
      WHERE status = 'pending'
    `;
    const totalResult = await pool.query(totalQuery);

    return {
      position: parseInt(positionResult.rows[0].position),
      total: parseInt(totalResult.rows[0].total)
    };
  }

  /**
   * Calculate priority score for a signup
   */
  static async calculatePriorityScore(data) {
    const { email, referral_code, interest_categories, favorite_brands } = data;

    const query = `
      SELECT calculate_waitlist_priority($1, $2, $3, $4) as score
    `;

    const result = await pool.query(query, [
      email,
      referral_code || null,
      JSON.stringify(interest_categories || []),
      JSON.stringify(favorite_brands || []),
    ]);

    return result.rows[0].score;
  }

  /**
   * Update waitlist signup
   */
  static async updateSignup(id, updates) {
    const allowedFields = [
      'first_name',
      'last_name',
      'phone',
      'interest_categories',
      'favorite_brands',
      'price_range_preference',
      'status',
      'notes',
      'tags',
    ];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (key === 'interest_categories' || key === 'favorite_brands' || key === 'tags') {
          setClause.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
        }
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE waitlist_signups
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundError('Waitlist signup');
    }

    return result.rows[0];
  }

  /**
   * Mark signup as invited
   */
  static async markAsInvited(id) {
    const query = `
      UPDATE waitlist_signups
      SET status = 'invited',
          invite_sent_at = CURRENT_TIMESTAMP,
          last_email_sent_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Waitlist signup');
    }

    return result.rows[0];
  }

  /**
   * Mark signup as converted (they created an account)
   */
  static async markAsConverted(email, userId) {
    const query = `
      UPDATE waitlist_signups
      SET status = 'converted',
          user_id = $2,
          converted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *
    `;

    const result = await pool.query(query, [email.toLowerCase().trim(), userId]);
    return result.rows[0] || null;
  }

  /**
   * Get waitlist statistics
   */
  static async getStatistics() {
    const query = `
      SELECT
        COUNT(*) as total_signups,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'invited' THEN 1 END) as invited_count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
        COUNT(CASE WHEN status = 'unsubscribed' THEN 1 END) as unsubscribed_count,
        ROUND(
          COUNT(CASE WHEN status = 'converted' THEN 1 END)::NUMERIC /
          NULLIF(COUNT(CASE WHEN status = 'invited' THEN 1 END), 0) * 100,
          2
        ) as conversion_rate_percent,
        COUNT(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h_signups,
        COUNT(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as last_7d_signups
      FROM waitlist_signups
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Get paginated waitlist
   */
  static async getWaitlist({ page = 1, limit = 50, status, orderBy = 'priority_score', orderDir = 'DESC' }) {
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['priority_score', 'created_at', 'email', 'status'];
    const orderColumn = allowedOrderBy.includes(orderBy) ? orderBy : 'priority_score';
    const direction = orderDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereClause = '';
    const values = [limit, offset];

    if (status) {
      whereClause = 'WHERE status = $3';
      values.push(status);
    }

    const query = `
      SELECT
        id,
        email,
        first_name,
        last_name,
        phone,
        interest_categories,
        favorite_brands,
        price_range_preference,
        status,
        priority_score,
        utm_source,
        utm_campaign,
        referral_code,
        created_at,
        invite_sent_at,
        converted_at
      FROM waitlist_signups
      ${whereClause}
      ORDER BY ${orderColumn} ${direction}
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) FROM waitlist_signups ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, status ? [status] : []),
    ]);

    return {
      signups: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Unsubscribe from waitlist
   */
  static async unsubscribe(email) {
    const query = `
      UPDATE waitlist_signups
      SET status = 'unsubscribed',
          updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *
    `;

    const result = await pool.query(query, [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Waitlist signup');
    }

    return result.rows[0];
  }

  /**
   * Get referral link for a user
   */
  static async getReferralLink(email) {
    const signup = await this.findByEmail(email);
    if (!signup) {
      throw new NotFoundError('Waitlist signup');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return `${baseUrl}/waitlist?ref=${signup.my_referral_code}`;
  }

  /**
   * Get referral stats for a user
   */
  static async getReferralStats(myReferralCode) {
    const query = `
      SELECT COUNT(*) as referral_count
      FROM waitlist_signups
      WHERE referral_code = $1
    `;
    const result = await pool.query(query, [myReferralCode]);
    return {
      referral_count: parseInt(result.rows[0].referral_count),
    };
  }

  /**
   * Track when a user shares their referral link
   */
  static async trackReferralShare(data) {
    const { email, share_method, share_platform, share_ip_address, share_user_agent } = data;

    const signup = await this.findByEmail(email);
    if (!signup) {
      throw new NotFoundError('Waitlist signup');
    }

    const query = `
      INSERT INTO referral_shares (
        referrer_email,
        referrer_signup_id,
        referrer_user_id,
        referrer_code,
        share_method,
        share_platform,
        share_ip_address,
        share_user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      email.toLowerCase().trim(),
      signup.id,
      signup.user_id,
      signup.my_referral_code,
      share_method,
      share_platform,
      share_ip_address,
      share_user_agent,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Track when someone clicks a referral link
   */
  static async trackReferralClick(data) {
    const {
      referral_code,
      click_ip_address,
      click_user_agent,
      utm_source,
      utm_medium,
      utm_campaign,
      http_referrer,
    } = data;

    const query = `
      INSERT INTO referral_clicks (
        referral_code,
        click_ip_address,
        click_user_agent,
        utm_source,
        utm_medium,
        utm_campaign,
        http_referrer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [referral_code, click_ip_address, click_user_agent, utm_source, utm_medium, utm_campaign, http_referrer];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mark a referral click as converted when user signs up
   */
  static async markReferralConverted(referral_code, new_signup_email) {
    const cleanEmail = new_signup_email.toLowerCase().trim();
    const query = `
      UPDATE referral_clicks
      SET converted = TRUE,
          converted_at = CURRENT_TIMESTAMP,
          clicked_by_email = $2::text,
          clicked_by_signup_id = (SELECT id FROM waitlist_signups WHERE email = $2::text),
          updated_at = CURRENT_TIMESTAMP
      WHERE referral_code = $1
        AND converted = FALSE
        AND clicked_by_email IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [referral_code, cleanEmail]);
    return result.rows;
  }

  /**
   * Get referral analytics for a user
   */
  static async getReferralAnalytics(email) {
    const query = `
      SELECT * FROM referral_analytics
      WHERE email = $1
    `;

    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  }

  /**
   * Get detailed referral breakdown for a user
   */
  static async getReferralDetails(email) {
    const signup = await this.findByEmail(email);
    if (!signup) {
      throw new NotFoundError('Waitlist signup');
    }

    // Get all shares
    const sharesQuery = `
      SELECT
        id,
        share_method,
        share_platform,
        shared_at
      FROM referral_shares
      WHERE referrer_code = $1
      ORDER BY shared_at DESC
    `;
    const sharesResult = await pool.query(sharesQuery, [signup.my_referral_code]);

    // Get all clicks and conversions
    const clicksQuery = `
      SELECT
        id,
        clicked_at,
        converted,
        converted_at,
        clicked_by_email,
        utm_source,
        utm_medium
      FROM referral_clicks
      WHERE referral_code = $1
      ORDER BY clicked_at DESC
    `;
    const clicksResult = await pool.query(clicksQuery, [signup.my_referral_code]);

    // Get summary analytics
    const analytics = await this.getReferralAnalytics(email);

    return {
      analytics,
      shares: sharesResult.rows,
      clicks: clicksResult.rows,
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Seed user's personalization profile with waitlist preferences
   * Called when a waitlist user signs up for a full account
   */
  static async seedUserPersonalization(userId, waitlistData) {
    const { interest_categories, favorite_brands, price_range_preference } = waitlistData;

    // This would integrate with your existing personalization service
    // to initialize their style_profile and shopper_profile with waitlist data

    // Update shopper_profile with favorite brands if provided
    if (favorite_brands && favorite_brands.length > 0) {
      await pool.query(
        `UPDATE shopper_profiles
         SET interests = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [JSON.stringify(favorite_brands.map((brand) => ({ brand, source: 'waitlist' }))), userId]
      );
    }

    // Could also seed style_profiles based on interest_categories
    // This is a placeholder for your personalization logic
    if (interest_categories && interest_categories.length > 0) {
      // Add logic to map interest_categories to style_profile dimensions
      console.log(`Seeding personalization for user ${userId} with interests:`, interest_categories);
    }

    return true;
  }
}

module.exports = WaitlistService;
