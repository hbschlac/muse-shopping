/**
 * Waitlist & Referral System - Automated Test Suite
 * Run with: npm test tests/waitlist.test.js
 */

const request = require('supertest');

// Use express app directly for supertest
const app = require('../src/app');

describe('Waitlist & Referral System', () => {
  jest.setTimeout(10000);

  let alice_email = `alice-${Date.now()}@test.com`;
  let bob_email = `bob-${Date.now()}@test.com`;
  let alice_referral_code;

  describe('POST /api/v1/waitlist/signup', () => {
    it('should allow a new user to join the waitlist', async () => {
      const res = await request(app)
        .post('/api/v1/waitlist/signup')
        .send({
          email: alice_email,
          first_name: 'Alice',
          last_name: 'Smith',
          favorite_brands: ['Nike', 'Zara', 'Reformation'],
          referral_source: 'instagram'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', alice_email);
      expect(res.body.data.position).toBeGreaterThanOrEqual(1);
      expect(res.body.data).toHaveProperty('my_referral_code');

      alice_referral_code = res.body.data.my_referral_code;
      expect(typeof alice_referral_code).toBe('string');
      expect(alice_referral_code.length).toBeGreaterThan(5);
    });

    it('should prevent duplicate email signups', async () => {
      const res = await request(app)
        .post('/api/v1/waitlist/signup')
        .send({
          email: alice_email,
          first_name: 'Alice',
          last_name: 'Duplicate'
        })
        .expect(409); // Conflict

      expect(res.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/v1/waitlist/signup')
        .send({
          email: 'invalid-email',
          first_name: 'Test'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/waitlist/status', () => {
    it('should return waitlist status for existing email', async () => {
      const res = await request(app)
        .get(`/api/v1/waitlist/status?email=${encodeURIComponent(alice_email)}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status', 'pending');
      expect(res.body.data).toHaveProperty('position');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('my_referral_code', alice_referral_code);
    });

    it('should return 404 for non-existent email', async () => {
      const res = await request(app)
        .get('/api/v1/waitlist/status?email=nonexistent@test.com')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/waitlist/track-share', () => {
    it('should track when a user shares their referral link', async () => {
      const res = await request(app)
        .post('/api/v1/waitlist/track-share')
        .send({
          email: alice_email,
          share_method: 'native_share',
          share_platform: 'imessage'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('referrer_email', alice_email);
      expect(res.body.data).toHaveProperty('share_method', 'native_share');
    });
  });

  describe('POST /api/v1/waitlist/track-click', () => {
    it('should track when someone clicks a referral link', async () => {
      const res = await request(app)
        .post('/api/v1/waitlist/track-click')
        .send({
          referral_code: alice_referral_code,
          utm_source: 'referral',
          utm_medium: 'link'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('referral_code', alice_referral_code);
    });
  });

  describe('Referral Conversion Flow', () => {
    it('should track conversion when referred user signs up', async () => {
      const res = await request(app)
        .post('/api/v1/waitlist/signup')
        .send({
          email: bob_email,
          first_name: 'Bob',
          last_name: 'Jones',
          favorite_brands: ['Adidas'],
          referral_code: alice_referral_code
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', bob_email);
      expect(res.body.data.position).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/waitlist/referral-analytics', () => {
    it('should return detailed analytics for a user', async () => {
      // Wait a bit for database to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const res = await request(app)
        .get(`/api/v1/waitlist/referral-analytics?email=${encodeURIComponent(alice_email)}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('analytics');
      expect(res.body.data).toHaveProperty('shares');
      expect(res.body.data).toHaveProperty('clicks');

      const analytics = res.body.data.analytics;
      expect(analytics).toHaveProperty('total_shares');
      expect(analytics).toHaveProperty('total_clicks');
      expect(analytics).toHaveProperty('total_conversions');
      expect(analytics).toHaveProperty('conversion_rate_percent');

      // Verify at least 1 share
      expect(Number(analytics.total_shares)).toBeGreaterThanOrEqual(1);

      // Verify at least 1 click
      expect(Number(analytics.total_clicks)).toBeGreaterThanOrEqual(1);

      // Verify at least 1 conversion
      expect(Number(analytics.total_conversions)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/waitlist/referral-link', () => {
    it('should return referral link for a user', async () => {
      const res = await request(app)
        .get(`/api/v1/waitlist/referral-link?email=${encodeURIComponent(alice_email)}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('referral_link');
      expect(res.body.data).toHaveProperty('referral_code', alice_referral_code);
      expect(res.body.data).toHaveProperty('referral_count');

      expect(res.body.data.referral_link).toContain(alice_referral_code);
    });
  });
});
