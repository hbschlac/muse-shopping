const axios = require('axios');
const pool = require('../db/pool');
const { AppError } = require('../utils/errors');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

/**
 * Image Content Moderation Service
 * Uses OpenAI's vision model to detect inappropriate content in images
 */
class ImageContentModerationService {
  /**
   * Moderate image content for safety
   * @param {string} imageData - Base64 encoded image data
   * @param {object} options - Optional metadata (userId, sessionId, messageId)
   * @returns {Promise<{safe: boolean, reason?: string, categories?: object}>}
   */
  static async moderateImage(imageData, options = {}) {
    const { userId = null, sessionId = null, messageId = null } = options;
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, skipping image moderation');
      return { safe: true };
    }

    try {
      const prompt = [
        'Analyze this image for content moderation.',
        'This is a fashion shopping app where users share images to get styling advice.',
        'Determine if the image is safe and appropriate.',
        'Flag if it contains: nudity, sexually explicit content, violence, illegal content, hate symbols, or anything inappropriate for a fashion retail platform.',
        'Also flag if the image is completely unrelated to fashion/clothing (e.g., memes, screenshots, random objects).',
        'Return a JSON object with: safe (boolean), reason (string if unsafe), categories (object with flags).',
      ].join(' ');

      const response = await axios.post(
        `${OPENAI_API_BASE}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                    detail: 'low', // Use low detail for faster/cheaper moderation
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response from moderation API');
      }

      const result = JSON.parse(content);

      // Log moderation results for monitoring
      if (!result.safe) {
        console.warn('Image flagged by moderation:', {
          reason: result.reason,
          categories: result.categories,
        });
      }

      const moderationResult = {
        safe: result.safe === true,
        reason: result.reason || null,
        categories: result.categories || {},
      };

      // Log to database for analytics
      await this._logModeration({
        userId,
        sessionId,
        messageId,
        isSafe: moderationResult.safe,
        reason: moderationResult.reason,
        categories: moderationResult.categories,
        imageData,
      }).catch((err) => {
        console.error('Failed to log moderation event:', err.message);
      });

      return moderationResult;
    } catch (error) {
      console.error('Image moderation failed:', error.message);

      // Fail-safe: If moderation service fails, reject the image to be safe
      return {
        safe: false,
        reason: 'Unable to verify image content safety',
        categories: { error: true },
      };
    }
  }

  /**
   * Check if image file size and format are acceptable
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  static async validateImageData(imageData) {
    if (!imageData || typeof imageData !== 'string') {
      return { valid: false, error: 'Invalid image data' };
    }

    // Check if it's a valid data URL
    if (!imageData.startsWith('data:image/')) {
      return { valid: false, error: 'Image must be in data URL format' };
    }

    // Extract MIME type
    const mimeMatch = imageData.match(/^data:(image\/[a-z]+);/);
    if (!mimeMatch) {
      return { valid: false, error: 'Invalid image format' };
    }

    const mimeType = mimeMatch[1];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(mimeType)) {
      return { valid: false, error: 'Image format not supported. Please use JPG, PNG, WebP, or GIF' };
    }

    // Estimate file size (base64 is ~33% larger than actual size)
    const base64Data = imageData.split(',')[1] || '';
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (sizeInBytes > maxSize) {
      return { valid: false, error: 'Image is too large. Maximum size is 10MB' };
    }

    return { valid: true };
  }

  /**
   * Log moderation event to database
   * @private
   */
  static async _logModeration({ userId, sessionId, messageId, isSafe, reason, categories, imageData }) {
    try {
      // Extract image metadata
      const mimeMatch = imageData.match(/^data:(image\/[a-z]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : null;
      const format = mimeType ? mimeType.replace('image/', '') : null;

      const base64Data = imageData.split(',')[1] || '';
      const sizeInBytes = Math.floor((base64Data.length * 3) / 4);

      await pool.query(
        `INSERT INTO chat_image_moderation_logs
         (user_id, session_id, message_id, is_safe, reason, categories, image_size_bytes, image_format)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          sessionId,
          messageId,
          isSafe,
          reason,
          JSON.stringify(categories),
          sizeInBytes,
          format,
        ]
      );
    } catch (error) {
      // Don't throw - logging is best-effort
      console.error('Failed to log moderation to database:', error.message);
    }
  }
}

module.exports = ImageContentModerationService;
