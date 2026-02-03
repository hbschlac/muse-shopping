const ChatJobRunService = require('../services/chatJobRunService');
const pool = require('../db/pool');

class ChatPreferenceDecayJob {
  async run() {
    // Scaffold: apply a simple decay factor to older events
    await pool.query(
      `UPDATE chat_preference_events
       SET weight = weight * 0.98
       WHERE created_at < NOW() - INTERVAL '7 days'`
    );
  }
}

if (require.main === module) {
  (async () => {
    try {
      await new ChatPreferenceDecayJob().run();
      console.log('Chat preference decay complete');
      await ChatJobRunService.logRun('preference_decay', 'completed');
      process.exit(0);
    } catch (err) {
      console.error('Chat preference decay failed', err);
      await ChatJobRunService.logRun('preference_decay', 'failed', { error: err.message });
      process.exit(1);
    }
  })();
}

module.exports = ChatPreferenceDecayJob;
