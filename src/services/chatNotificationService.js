const axios = require('axios');
const logger = require('../utils/logger');

class ChatNotificationService {
  static async sendReviewAlert({ reviewId, sessionId, reason }) {
    const provider = (process.env.CHAT_REVIEW_NOTIFICATION_PROVIDER || 'slack').toLowerCase();
    const webhookUrl = process.env.CHAT_REVIEW_WEBHOOK_URL;

    if (!webhookUrl) {
      return { sent: false, reviewId, sessionId, reason, error: 'missing webhook url' };
    }

    if (provider === 'slack') {
      const payload = {
        text: `Muse Chat Review: #${reviewId}`,
        attachments: [
          {
            color: '#d97706',
            fields: [
              { title: 'Session', value: String(sessionId), short: true },
              { title: 'Reason', value: reason || 'n/a', short: false },
            ],
          },
        ],
      };
      await axios.post(webhookUrl, payload);
      logger.info('Sent chat review alert', { reviewId, sessionId });
      return { sent: true, reviewId, sessionId, reason };
    }

    const payload = { reviewId, sessionId, reason };
    await axios.post(webhookUrl, payload);
    logger.info('Sent chat review alert (generic)', { reviewId, sessionId });
    return { sent: true, reviewId, sessionId, reason };
  }
}

module.exports = ChatNotificationService;
