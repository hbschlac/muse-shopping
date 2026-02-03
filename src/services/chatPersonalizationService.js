const pool = require('../db/pool');

class ChatPersonalizationService {
  static async getUserProfile(userId) {
    if (!userId) return null;
    const result = await pool.query(
      'SELECT user_id, embedding, embedding_model, summary, traits, updated_at FROM user_chat_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  static async upsertUserProfile({ userId, embedding = null, embeddingModel = null, summary = null, traits = null }) {
    if (!userId) return null;
    const result = await pool.query(
      `INSERT INTO user_chat_profiles (user_id, embedding, embedding_model, summary, traits, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE
         SET embedding = COALESCE(EXCLUDED.embedding, user_chat_profiles.embedding),
             embedding_model = COALESCE(EXCLUDED.embedding_model, user_chat_profiles.embedding_model),
             summary = COALESCE(EXCLUDED.summary, user_chat_profiles.summary),
             traits = COALESCE(EXCLUDED.traits, user_chat_profiles.traits),
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, embedding, embeddingModel, summary, traits]
    );
    return result.rows[0];
  }

  static async getSessionMemory(sessionId) {
    if (!sessionId) return null;
    const result = await pool.query(
      'SELECT session_id, summary, entities, preferences, updated_at FROM chat_session_memory WHERE session_id = $1',
      [sessionId]
    );
    return result.rows[0] || null;
  }

  static async upsertSessionMemory({ sessionId, summary = null, entities = null, preferences = null }) {
    if (!sessionId) return null;
    const result = await pool.query(
      `INSERT INTO chat_session_memory (session_id, summary, entities, preferences, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) DO UPDATE
         SET summary = COALESCE(EXCLUDED.summary, chat_session_memory.summary),
             entities = COALESCE(EXCLUDED.entities, chat_session_memory.entities),
             preferences = COALESCE(EXCLUDED.preferences, chat_session_memory.preferences),
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sessionId, summary, entities, preferences]
    );
    return result.rows[0];
  }

  static async upsertSessionEmbedding({ sessionId, embedding = null, embeddingModel = null }) {
    if (!sessionId) return null;
    const result = await pool.query(
      `INSERT INTO chat_session_embeddings (session_id, embedding, embedding_model, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) DO UPDATE
         SET embedding = COALESCE(EXCLUDED.embedding, chat_session_embeddings.embedding),
             embedding_model = COALESCE(EXCLUDED.embedding_model, chat_session_embeddings.embedding_model),
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sessionId, embedding, embeddingModel]
    );
    return result.rows[0];
  }
}

module.exports = ChatPersonalizationService;
