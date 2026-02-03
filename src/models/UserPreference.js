const pool = require('../db/pool');

class UserPreference {
  static async find(userId) {
    const result = await pool.query(
      'SELECT * FROM user_fashion_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async create(userId) {
    const result = await pool.query(
      'INSERT INTO user_fashion_preferences (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  static async update(userId, preferences) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = [
      'preferred_colors',
      'preferred_styles',
      'preferred_categories',
      'avoided_materials',
      'fit_preferences',
      'occasions',
    ];

    fields.forEach(field => {
      if (preferences[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(JSON.stringify(preferences[field]));
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return this.find(userId);
    }

    values.push(userId);
    const query = `
      UPDATE user_fashion_preferences
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async upsert(userId, preferences) {
    const existing = await this.find(userId);

    if (existing) {
      return this.update(userId, preferences);
    } else {
      await this.create(userId);
      return this.update(userId, preferences);
    }
  }
}

module.exports = UserPreference;
