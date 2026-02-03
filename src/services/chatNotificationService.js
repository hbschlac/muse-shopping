class ChatNotificationService {
  static async sendReviewAlert({ reviewId, sessionId, reason }) {
    // Scaffold: plug in email/slack/webhook providers here
    return { sent: false, reviewId, sessionId, reason };
  }
}

module.exports = ChatNotificationService;
