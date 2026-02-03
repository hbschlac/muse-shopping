const pool = require('../db/pool');

class Brand {
  static async findAll(limit = 20, offset = 0, filters = {}) {
    let query = 'SELECT * FROM brands WHERE is_active = TRUE';
    const values = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }

    if (filters.price_tier) {
      query += ` AND price_tier = $${paramCount}`;
      values.push(filters.price_tier);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ` ORDER BY name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM brands WHERE is_active = TRUE';
    const values = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }

    if (filters.price_tier) {
      query += ` AND price_tier = $${paramCount}`;
      values.push(filters.price_tier);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM brands WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    return result.rows[0];
  }

  static async findBySlug(slug) {
    const result = await pool.query(
      'SELECT * FROM brands WHERE slug = $1 AND is_active = TRUE',
      [slug]
    );
    return result.rows[0];
  }

  static async followBrand(userId, brandId, notificationEnabled = true) {
    const result = await pool.query(
      `INSERT INTO user_brand_follows (user_id, brand_id, notification_enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, brand_id) DO UPDATE
       SET notification_enabled = $3
       RETURNING *`,
      [userId, brandId, notificationEnabled]
    );
    return result.rows[0];
  }

  static async unfollowBrand(userId, brandId) {
    await pool.query(
      'DELETE FROM user_brand_follows WHERE user_id = $1 AND brand_id = $2',
      [userId, brandId]
    );
  }

  static async getFollowedBrands(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT b.*, ubf.followed_at, ubf.notification_enabled
       FROM brands b
       INNER JOIN user_brand_follows ubf ON b.id = ubf.brand_id
       WHERE ubf.user_id = $1 AND b.is_active = TRUE
       ORDER BY ubf.followed_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async isFollowing(userId, brandId) {
    const result = await pool.query(
      'SELECT id FROM user_brand_follows WHERE user_id = $1 AND brand_id = $2',
      [userId, brandId]
    );
    return result.rows.length > 0;
  }

  static async getFollowerCount(brandId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM user_brand_follows WHERE brand_id = $1',
      [brandId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = Brand;
