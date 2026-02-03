const pool = require('../db/pool');

class ChatUsageService {
  static async logUsage({ sessionId = null, messageId = null, model, usage = {}, latencyMs = null }) {
    const promptTokens = usage.prompt_tokens ?? null;
    const completionTokens = usage.completion_tokens ?? null;
    const totalTokens = usage.total_tokens ?? null;

    await pool.query(
      `INSERT INTO chat_usage_metrics
        (session_id, message_id, model, prompt_tokens, completion_tokens, total_tokens, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, messageId, model, promptTokens, completionTokens, totalTokens, latencyMs]
    );
  }
}

module.exports = ChatUsageService;
