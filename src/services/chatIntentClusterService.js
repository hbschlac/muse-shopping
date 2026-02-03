const pool = require('../db/pool');

class ChatIntentClusterService {
  static async createCluster(label) {
    const result = await pool.query(
      'INSERT INTO chat_intent_clusters (label) VALUES ($1) RETURNING *',
      [label]
    );
    return result.rows[0];
  }

  static async addToCluster(clusterId, sessionId, messageId = null) {
    const result = await pool.query(
      `INSERT INTO chat_intent_cluster_members (cluster_id, session_id, message_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [clusterId, sessionId, messageId]
    );
    return result.rows[0];
  }

  static async listClusters() {
    const result = await pool.query(
      `SELECT c.id, c.label, COUNT(m.id)::int as member_count
       FROM chat_intent_clusters c
       LEFT JOIN chat_intent_cluster_members m ON m.cluster_id = c.id
       GROUP BY c.id
       ORDER BY member_count DESC`
    );
    return result.rows;
  }
}

module.exports = ChatIntentClusterService;
