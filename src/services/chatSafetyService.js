const pool = require('../db/pool');

class ChatSafetyService {
  static async evaluate({ sessionId, userId, input, output }) {
    const decision = 'allow';
    const categories = [];

    const flaggedTerms = ['credit card', 'ssn', 'social security', 'password'];
    const hasSensitive = flaggedTerms.some((term) => (output || '').toLowerCase().includes(term));
    if (hasSensitive) {
      categories.push('sensitive_data');
    }

    await this._logAudit({
      sessionId,
      userId,
      input,
      output,
      decision: decision,
      categories,
    });

    if (hasSensitive) {
      return {
        decision: 'allow_with_notice',
        safeResponse: 'I can help with shopping and styling, but I can’t assist with sensitive personal data.',
        categories,
      };
    }

    return { decision, categories };
  }

  static async _logAudit({ sessionId, userId, input, output, decision, categories }) {
    const inputExcerpt = (input || '').slice(0, 500);
    const outputExcerpt = (output || '').slice(0, 500);

    await pool.query(
      `INSERT INTO chat_safety_audits (session_id, user_id, input_excerpt, output_excerpt, decision, categories)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId || null, userId || null, inputExcerpt, outputExcerpt, decision, JSON.stringify(categories || [])]
    );
  }
}

module.exports = ChatSafetyService;
