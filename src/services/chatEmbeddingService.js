const axios = require('axios');

class ChatEmbeddingService {
  static async generateEmbedding({ text, model }) {
    if (!process.env.OPENAI_API_KEY) return null;
    if (!text) return null;

    const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const res = await axios.post(
      `${apiBase}/embeddings`,
      { model, input: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: parseInt(process.env.CHAT_MODEL_TIMEOUT_MS || '20000', 10),
      }
    );

    const data = res.data && res.data.data && res.data.data[0];
    return data ? data.embedding : null;
  }
}

module.exports = ChatEmbeddingService;
