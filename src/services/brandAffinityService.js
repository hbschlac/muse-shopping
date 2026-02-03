const pool = require('../db/pool');

class BrandAffinityService {
  static async getBrandAffinity(userId, limit = 50) {
    if (!userId) return [];

    const result = await pool.query(
      `WITH favorites AS (
         SELECT i.brand_id, COUNT(*)::int as score
         FROM user_favorites uf
         JOIN items i ON uf.item_id = i.id
         WHERE uf.user_id = $1
         GROUP BY i.brand_id
       ),
       orders AS (
         SELECT b.id as brand_id, COUNT(*)::int as score
         FROM order_products op
         LEFT JOIN brands b ON op.brand_id = b.id
         WHERE op.user_id = $1 AND b.id IS NOT NULL
         GROUP BY b.id
       ),
       chats AS (
         SELECT i.brand_id, COUNT(*)::int as score
         FROM chat_messages m
         JOIN chat_sessions s ON m.session_id = s.id
         JOIN items i ON (m.intent->>'query') ILIKE '%' || i.canonical_name || '%'
         WHERE s.user_id = $1 AND m.intent IS NOT NULL
         GROUP BY i.brand_id
       )
       SELECT b.id as brand_id, b.name as brand_name,
         COALESCE(f.score, 0) * 3 + COALESCE(o.score, 0) * 2 + COALESCE(c.score, 0) * 1 as affinity_score
       FROM brands b
       LEFT JOIN favorites f ON b.id = f.brand_id
       LEFT JOIN orders o ON b.id = o.brand_id
       LEFT JOIN chats c ON b.id = c.brand_id
       WHERE COALESCE(f.score, 0) + COALESCE(o.score, 0) + COALESCE(c.score, 0) > 0
       ORDER BY affinity_score DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

module.exports = BrandAffinityService;
