const pool = require('../db/pool');

class ChatSegmentService {
  static async createSegment(name, description = null) {
    const result = await pool.query(
      'INSERT INTO chat_segments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    return result.rows[0];
  }

  static async addUserToSegment(segmentId, userId) {
    const result = await pool.query(
      `INSERT INTO chat_segment_members (segment_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (segment_id, user_id) DO NOTHING
       RETURNING *`,
      [segmentId, userId]
    );
    return result.rows[0] || null;
  }

  static async listSegments() {
    const result = await pool.query(
      `SELECT s.id, s.name, s.description, COUNT(m.id)::int as member_count
       FROM chat_segments s
       LEFT JOIN chat_segment_members m ON m.segment_id = s.id
       GROUP BY s.id
       ORDER BY member_count DESC`
    );
    return result.rows;
  }
}

module.exports = ChatSegmentService;
