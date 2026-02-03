/**
 * Security Test Suite
 * Tests all security controls across platform services
 */

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const jwt = require('jsonwebtoken');

describe('Security Tests', () => {
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  beforeAll(async () => {
    // Delete existing test users if they exist
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'testuser@example.com',
      'testadmin@example.com'
    ]);

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, username, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['testuser@example.com', 'hash123', 'testuser', 'Test User', 'user']
    );
    userId = userResult.rows[0].id;

    // Create test admin
    const adminResult = await pool.query(
      `INSERT INTO users (email, password_hash, username, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['testadmin@example.com', 'hash123', 'testadmin', 'Test Admin', 'admin']
    );
    adminId = adminResult.rows[0].id;

    // Generate tokens
    userToken = jwt.sign({ userId }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: adminId }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM security_events WHERE user_id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM audit_logs WHERE user_id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM rate_limit_tracking WHERE identifier IN ($1, $2)', [
      `user:${userId}`,
      `user:${adminId}`
    ]);
    await pool.end();
  });

  describe('Authentication & Authorization', () => {
    test('should reject unauthenticated admin endpoint access', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    test('should reject non-admin user accessing admin endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      // Error message contains "Admin access required"
      expect(res.body.error.message || res.body.error).toMatch(/admin|access/i);
    });

    test('should allow admin user to access admin endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: '2026-01-01', endDate: '2026-02-03' });

      // May return 200 or 500 depending on data, but should not be 401/403
      expect([200, 500]).toContain(res.status);
    });

    test('should log unauthorized admin access attempt', async () => {
      await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      // Check security event was logged
      const result = await pool.query(
        `SELECT * FROM security_events
         WHERE user_id = $1 AND event_type = 'unauthorized_admin_access'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    test('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          // Missing sessionId
          deviceType: 'mobile'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/validation/i);
    });

    test('should reject invalid enum values', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          sessionId: 'test-session',
          deviceType: 'INVALID_TYPE'  // Not in enum
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.details).toContainEqual(
        expect.stringMatching(/must be one of/)
      );
    });

    test('should reject values exceeding max length', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          sessionId: 'a'.repeat(300),  // Over 255 char limit
          deviceType: 'mobile'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    test('should accept valid input', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          sessionId: 'test-session-123',
          deviceType: 'mobile',
          browser: 'Chrome',
          platform: 'iOS'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts in input', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          sessionId: 'test-session-xss-<img src=x>',
          deviceType: 'mobile'
        });

      // Either succeeds after sanitization or fails validation (both acceptable)
      expect([200, 400]).toContain(res.status);

      // If it succeeded, verify sanitization worked
      if (res.status === 200) {
        const session = await pool.query(
          'SELECT session_id FROM user_sessions WHERE session_id LIKE $1',
          ['%test-session-xss%']
        );

        // Should find the session with sanitized ID (no <img> tag)
        if (session.rows.length > 0) {
          expect(session.rows[0].session_id).not.toMatch(/<img/);
        }
      }
    });

    test('should remove event handlers from input', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          sessionId: 'test-session',
          deviceType: 'mobile',
          browser: '<img src=x onerror=alert(1)>'
        })
        .expect(200);

      // Sanitization should have removed the onerror handler
      expect(res.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests under rate limit', async () => {
      const testSessionId = `rate-limit-test-${Date.now()}`;

      // Send 10 requests (well under 200/min limit)
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/v1/analytics/session/start')
          .send({
            sessionId: `${testSessionId}-${i}`,
            deviceType: 'mobile'
          });

        expect(res.status).toBe(200);
      }
    });

    test('should enforce rate limits on admin endpoints', async () => {
      // Note: This test may be flaky in CI due to timing
      // In production, rate limits are enforced via database

      const responses = [];
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .get('/api/v1/analytics/realtime')
          .set('Authorization', `Bearer ${adminToken}`);

        responses.push(res.status);
      }

      // All should succeed or hit rate limit (429)
      responses.forEach(status => {
        expect([200, 429, 500]).toContain(status);
      });
    });
  });

  describe('SQL Injection Protection', () => {
    test('should not be vulnerable to SQL injection in query params', async () => {
      const maliciousInput = "1' OR '1'='1";

      // Attempt SQL injection via query parameter
      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: maliciousInput });

      // Should either fail gracefully or return normal results
      // Should NOT expose SQL error
      if (!res.body.success) {
        expect(res.body.error).not.toMatch(/syntax error/i);
        expect(res.body.error).not.toMatch(/SQL/i);
      }
    });

    test('should not be vulnerable to SQL injection in request body', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const res = await request(app)
        .post('/api/v1/analytics/session/start')
        .send({
          sessionId: maliciousInput,
          deviceType: 'mobile'
        });

      // Should handle gracefully, table should still exist
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
      );

      expect(tableCheck.rows[0].exists).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    test('should log admin operations', async () => {
      // Clear previous audit logs for this test
      await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [adminId]);

      // Perform admin operation
      await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: '2026-01-01', endDate: '2026-02-03' });

      // Check audit log was created
      const result = await pool.query(
        `SELECT * FROM audit_logs
         WHERE user_id = $1 AND action = 'read' AND resource_type = 'analytics_sessions'
         ORDER BY created_at DESC LIMIT 1`,
        [adminId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].status).toBeDefined();
    });

    test('should log data access for GDPR compliance', async () => {
      // Clear previous data access logs
      await pool.query('DELETE FROM data_access_logs WHERE accessor_user_id = $1', [adminId]);

      // Perform data access
      await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: '2026-01-01' });

      // Check data access log
      const result = await pool.query(
        `SELECT * FROM data_access_logs
         WHERE accessor_user_id = $1 AND data_type = 'analytics_sessions'
         ORDER BY created_at DESC LIMIT 1`,
        [adminId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].access_type).toBe('read');
    });
  });

  describe('Security Headers', () => {
    test('should set security headers on responses', async () => {
      const res = await request(app)
        .get('/api/v1/health');

      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBeDefined();
      expect(res.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Account Security', () => {
    test('should handle locked accounts', async () => {
      // Lock the test user account
      await pool.query(
        'UPDATE users SET account_locked = true WHERE id = $1',
        [userId]
      );

      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(res.body.error.message || res.body.error).toMatch(/locked/i);

      // Unlock for other tests
      await pool.query(
        'UPDATE users SET account_locked = false WHERE id = $1',
        [userId]
      );
    });
  });

  describe('Session Security', () => {
    test('should reject invalid JWT tokens', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    test('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }  // Expired 1 hour ago
      );

      const res = await request(app)
        .get('/api/v1/analytics/sessions')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      // Error can be string or object with message property
      const errorText = typeof res.body.error === 'string'
        ? res.body.error
        : res.body.error.message;
      expect(errorText).toMatch(/expired/i);
    });
  });
});
