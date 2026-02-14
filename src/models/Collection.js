const pool = require('../db/pool');

class Collection {
  /**
   * Create a new collection
   */
  static async create({ user_id, name, description, is_private = false }) {
    const result = await pool.query(
      `INSERT INTO user_collections (user_id, name, description, is_private)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, name, description, is_private]
    );
    return result.rows[0];
  }

  /**
   * Find collection by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM user_collections WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Find all collections for a user
   */
  static async findByUserId(user_id, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT c.*,
              COUNT(ci.id) as item_count
       FROM user_collections c
       LEFT JOIN collection_items ci ON c.id = ci.collection_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );
    return result.rows;
  }

  /**
   * Count collections for a user
   */
  static async countByUserId(user_id) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM user_collections WHERE user_id = $1',
      [user_id]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Update collection
   */
  static async update(id, fields) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(fields).forEach(key => {
      if (fields[key] !== undefined && key !== 'id' && key !== 'user_id') {
        updates.push(`${key} = $${paramCount}`);
        values.push(fields[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE user_collections
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete collection
   */
  static async delete(id) {
    await pool.query('DELETE FROM user_collections WHERE id = $1', [id]);
  }

  /**
   * Add item to collection
   */
  static async addItem({ collection_id, item_id, notes = null }) {
    try {
      const result = await pool.query(
        `INSERT INTO collection_items (collection_id, item_id, notes)
         VALUES ($1, $2, $3)
         ON CONFLICT (collection_id, item_id) DO UPDATE
         SET notes = EXCLUDED.notes, added_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [collection_id, item_id, notes]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove item from collection
   */
  static async removeItem(collection_id, item_id) {
    await pool.query(
      'DELETE FROM collection_items WHERE collection_id = $1 AND item_id = $2',
      [collection_id, item_id]
    );
  }

  /**
   * Get items in a collection
   */
  static async getItems(collection_id, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT ci.*,
              i.name, i.brand_id, i.price_cents, i.currency,
              i.image_url, i.retailer_name, i.category
       FROM collection_items ci
       JOIN items i ON ci.item_id = i.id
       WHERE ci.collection_id = $1
       ORDER BY ci.added_at DESC
       LIMIT $2 OFFSET $3`,
      [collection_id, limit, offset]
    );
    return result.rows;
  }

  /**
   * Check if item is in collection
   */
  static async hasItem(collection_id, item_id) {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM collection_items WHERE collection_id = $1 AND item_id = $2)',
      [collection_id, item_id]
    );
    return result.rows[0].exists;
  }

  /**
   * Verify collection ownership
   */
  static async verifyOwnership(collection_id, user_id) {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM user_collections WHERE id = $1 AND user_id = $2)',
      [collection_id, user_id]
    );
    return result.rows[0].exists;
  }
}

module.exports = Collection;
