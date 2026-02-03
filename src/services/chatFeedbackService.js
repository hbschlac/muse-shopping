const pool = require('../db/pool');
const ChatPreferenceIngestionService = require('./chatPreferenceIngestionService');

class ChatFeedbackService {
  static async recordFeedback({ messageId, rating }) {
    const messageRes = await pool.query(
      `SELECT m.id, m.intent, m.session_id, s.user_id
       FROM chat_messages m
       JOIN chat_sessions s ON s.id = m.session_id
       WHERE m.id = $1`,
      [messageId]
    );

    if (messageRes.rows.length === 0) return null;
    const message = messageRes.rows[0];

    const signalRes = await pool.query(
      `INSERT INTO chat_feedback_signals (message_id, session_id, user_id, rating, intent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [message.id, message.session_id, message.user_id, rating, message.intent]
    );

    if (rating >= 4 && message.intent) {
      await ChatPreferenceIngestionService.ingestFromIntent({
        userId: message.user_id,
        sessionId: message.session_id,
        messageId: message.id,
        intent: message.intent,
      });
    }

    return signalRes.rows[0];
  }
}

module.exports = ChatFeedbackService;
