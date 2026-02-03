const ChatJobRunService = require('../services/chatJobRunService');
const pool = require('../db/pool');
const ChatSessionSummaryService = require('../services/chatSessionSummaryService');

class ChatSessionSummaryJob {
  async run() {
    const sessions = await pool.query(
      `SELECT DISTINCT session_id
       FROM chat_messages
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );

    for (const row of sessions.rows) {
      const intentsRes = await pool.query(
        `SELECT intent->>'intent' as intent
         FROM chat_messages
         WHERE session_id = $1 AND intent IS NOT NULL`,
        [row.session_id]
      );
      const intents = intentsRes.rows.map((r) => r.intent).filter(Boolean);
      await ChatSessionSummaryService.upsertSummary(row.session_id, null, intents);
    }
  }
}

if (require.main === module) {
  (async () => {
    try {
      await new ChatSessionSummaryJob().run();
      console.log('Chat session summary job complete');
      await ChatJobRunService.logRun('session_summary', 'completed');
      process.exit(0);
    } catch (err) {
      console.error('Chat session summary job failed', err);
      await ChatJobRunService.logRun('session_summary', 'failed', { error: err.message });
      process.exit(1);
    }
  })();
}

module.exports = ChatSessionSummaryJob;
