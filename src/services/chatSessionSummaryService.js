const pool = require('../db/pool');

class ChatSessionSummaryService {
  static async upsertSummary(sessionId, summary, intents = []) {
    const result = await pool.query(
      `INSERT INTO chat_session_summaries (session_id, summary, intents, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) DO UPDATE
         SET summary = EXCLUDED.summary,
             intents = EXCLUDED.intents,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sessionId, summary, JSON.stringify(intents)]
    );
    return result.rows[0];
  }
}

module.exports = ChatSessionSummaryService;
