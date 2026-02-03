const pool = require('../db/pool');

class User {
  static async create({ email, password_hash, username, full_name }) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, username, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, full_name, is_verified, is_active, created_at`,
      [email, password_hash, username, full_name]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, username, full_name, profile_image_url, is_verified, is_active, created_at, updated_at, last_login_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async update(id, fields) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(fields).forEach(key => {
      if (fields[key] !== undefined && key !== 'id' && key !== 'password_hash') {
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
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, full_name, profile_image_url, is_verified, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    const result = await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_login_at',
      [id]
    );
    return result.rows[0];
  }

  static async updatePassword(id, password_hash) {
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [password_hash, id]
    );
  }

  static async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  static async createProfile(user_id, profileData = {}) {
    // Build dynamic query for profile creation with optional fields
    const fields = ['user_id'];
    const values = [user_id];
    const placeholders = ['$1'];
    let paramCount = 2;

    // Add optional fields if provided
    const optionalFields = ['age', 'location_city', 'location_state', 'location_country'];
    optionalFields.forEach(field => {
      if (profileData[field] !== undefined) {
        fields.push(field);
        values.push(profileData[field]);
        placeholders.push(`$${paramCount}`);
        paramCount++;
      }
    });

    const query = `
      INSERT INTO user_profiles (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getProfile(user_id) {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user_id]
    );
    return result.rows[0];
  }

  static async updateProfile(user_id, fields) {
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
      return this.getProfile(user_id);
    }

    values.push(user_id);
    const query = `
      UPDATE user_profiles
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = User;
