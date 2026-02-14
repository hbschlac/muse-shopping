/**
 * OAuth Integration Tests
 * Tests for Gmail and Instagram OAuth flows
 */

describe('OAuth Integration', () => {
  describe('Gmail OAuth', () => {
    it('should generate valid Gmail OAuth URL', () => {
      // This test will run automatically when files change
      const googleAuth = require('../src/config/googleAuth');

      const authUrl = googleAuth.getAuthUrl(123);

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2');
      expect(authUrl).toContain('gmail.readonly');
      expect(authUrl).toContain('state=123');
    });

    it('should have required environment variables configured', () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined();
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined();
      expect(process.env.GOOGLE_REDIRECT_URI).toBeDefined();
    });
  });

  describe('User Registration', () => {
    it('should require email, password, and full_name', () => {
      const Joi = require('joi');
      const { registerSchema } = require('../src/middleware/validation');

      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        full_name: 'Test User',
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject weak passwords', () => {
      const Joi = require('joi');
      const { registerSchema } = require('../src/middleware/validation');

      const invalidData = {
        email: 'test@example.com',
        password: 'weak', // Too short, no uppercase or number
        full_name: 'Test User',
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});
