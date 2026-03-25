/**
 * Apple OAuth Authentication Tests
 */

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const jwt = require('jsonwebtoken');

describe('Apple OAuth Authentication', () => {
  let testUserId;

  // Clean up test data after all tests
  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await pool.end();
  });

  describe('GET /api/v1/auth/apple', () => {
    it('should return Apple authorization URL with state', async () => {
      const response = await request(app)
        .get('/api/v1/auth/apple')
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('state');
      expect(response.body.authUrl).toContain('appleid.apple.com');
      expect(response.body.authUrl).toContain('client_id=');
      expect(response.body.authUrl).toContain('redirect_uri=');
      expect(response.body.authUrl).toContain('response_type=code');
      expect(response.body.authUrl).toContain('scope=name%20email');
    });

    it('should include state parameter in URL', async () => {
      const response = await request(app)
        .get('/api/v1/auth/apple')
        .expect(200);

      const { authUrl, state } = response.body;
      expect(authUrl).toContain(`state=${state}`);
      expect(state).toHaveLength(64); // 32 bytes hex = 64 characters
    });
  });

  describe('POST /api/v1/auth/apple/callback', () => {
    it('should reject request with invalid state', async () => {
      const response = await request(app)
        .post('/api/v1/auth/apple/callback')
        .send({
          code: 'test_code',
          id_token: createMockAppleToken(),
          state: 'invalid_state',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('state');
    });

    it('should reject request with missing parameters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/apple/callback')
        .send({
          code: 'test_code',
          // Missing id_token and state
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should create new user with Apple ID on first sign-in', async () => {
      // First, get a valid state
      const initResponse = await request(app).get('/api/v1/auth/apple');
      const { state } = initResponse.body;

      const appleUserId = `apple_test_${Date.now()}`;
      const email = `apple_${Date.now()}@test.com`;

      const idToken = createMockAppleToken({
        sub: appleUserId,
        email,
        email_verified: 'true',
      });

      const response = await request(app)
        .post('/api/v1/auth/apple/callback')
        .set('Cookie', [`connect.sid=${initResponse.headers['set-cookie']}`])
        .send({
          code: 'test_code',
          id_token: idToken,
          state,
          user: JSON.stringify({
            name: {
              firstName: 'Apple',
              lastName: 'User',
            },
          }),
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('access_token');
      expect(response.body.data.tokens).toHaveProperty('refresh_token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(email);

      // Store user ID for cleanup
      testUserId = response.body.data.user.id;

      // Verify JWT token
      const decoded = jwt.verify(
        response.body.data.tokens.access_token,
        process.env.JWT_SECRET || 'your-secret-key'
      );
      expect(decoded.userId).toBe(testUserId);
    });

    it('should link Apple account to existing user with same email', async () => {
      // Create a user with email auth first
      const email = `existing_${Date.now()}@test.com`;
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPassword123!',
          firstName: 'Existing',
          lastName: 'User',
        });

      const existingUserId = registerResponse.body.user.id;

      // Now try to sign in with Apple using the same email
      const initResponse = await request(app).get('/api/v1/auth/apple');
      const { state } = initResponse.body;

      const appleUserId = `apple_link_${Date.now()}`;
      const idToken = createMockAppleToken({
        sub: appleUserId,
        email,
        email_verified: 'true',
      });

      const response = await request(app)
        .post('/api/v1/auth/apple/callback')
        .set('Cookie', [`connect.sid=${initResponse.headers['set-cookie']}`])
        .send({
          code: 'test_code',
          id_token: idToken,
          state,
        })
        .expect(200);

      expect(response.body.data.user.id).toBe(existingUserId);
      expect(response.body.data.user.email).toBe(email);

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [existingUserId]);
    });

    it('should return existing user on subsequent sign-ins', async () => {
      const appleUserId = `apple_repeat_${Date.now()}`;
      const email = `repeat_${Date.now()}@test.com`;

      // First sign-in
      const initResponse1 = await request(app).get('/api/v1/auth/apple');
      const { state: state1 } = initResponse1.body;

      const idToken1 = createMockAppleToken({
        sub: appleUserId,
        email,
        email_verified: 'true',
      });

      const response1 = await request(app)
        .post('/api/v1/auth/apple/callback')
        .set('Cookie', [`connect.sid=${initResponse1.headers['set-cookie']}`])
        .send({
          code: 'test_code',
          id_token: idToken1,
          state: state1,
        })
        .expect(200);

      const userId = response1.body.data.user.id;

      // Second sign-in with same Apple ID
      const initResponse2 = await request(app).get('/api/v1/auth/apple');
      const { state: state2 } = initResponse2.body;

      const idToken2 = createMockAppleToken({
        sub: appleUserId,
        email,
        email_verified: 'true',
      });

      const response2 = await request(app)
        .post('/api/v1/auth/apple/callback')
        .set('Cookie', [`connect.sid=${initResponse2.headers['set-cookie']}`])
        .send({
          code: 'test_code',
          id_token: idToken2,
          state: state2,
        })
        .expect(200);

      expect(response2.body.data.user.id).toBe(userId);

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    });
  });
});

/**
 * Helper function to create mock Apple ID token
 */
function createMockAppleToken(payload = {}) {
  const defaultPayload = {
    iss: 'https://appleid.apple.com',
    aud: process.env.APPLE_CLIENT_ID || 'com.muse.shopping',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub: 'apple_test_user',
    email: 'test@apple.com',
    email_verified: 'true',
    ...payload,
  };

  // Create a simple token (not properly signed for testing)
  return jwt.sign(defaultPayload, 'test-secret');
}
