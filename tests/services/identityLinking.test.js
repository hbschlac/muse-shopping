const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/agentAudit', () => ({ recordAgentEvent: jest.fn().mockResolvedValue({ id: 1 }) }));
const { recordAgentEvent } = require('../../src/services/agentAudit');
const shop = require('../../src/services/identityLinking/shopClient');

function app() {
  const a = express();
  a.use('/api/v1/identity', require('../../src/routes/identityRoutes'));
  return a;
}

describe('Sign in with Shop test', () => {
  beforeEach(() => recordAgentEvent.mockClear());

  test('client metadata names the URL it is served at, with no secret', async () => {
    const res = await request(app()).get('/api/v1/identity/shop/client.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.client_id).toBe('https://www.muse.shopping/api/v1/identity/shop/client.json');
    expect(res.body.redirect_uris).toEqual(['https://www.muse.shopping/api/v1/identity/shop/callback']);
    expect(res.body.token_endpoint_auth_method).toBe('none');
    expect(JSON.stringify(res.body)).not.toMatch(/secret/i);
  });

  test('callback records acceptance but never keeps the code', async () => {
    const res = await request(app()).get('/api/v1/identity/shop/callback?code=SECRETCODE123&state=s1&iss=https://accounts.shop.app');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/accepted Muse/);
    expect(res.text).not.toMatch(/SECRETCODE123/);
    const event = recordAgentEvent.mock.calls[0][0];
    expect(event.action).toBe('identity.link_probe');
    expect(event.decision).toBe('allowed');
    expect(JSON.stringify(event)).not.toMatch(/SECRETCODE123/);
    expect(event.details).toMatchObject({ accepted: true, issuer: 'https://accounts.shop.app', state_present: true });
  });

  test('callback records a refusal', async () => {
    const res = await request(app()).get('/api/v1/identity/shop/callback?error=invalid_client&error_description=nope');
    expect(res.text).toMatch(/did not accept Muse \(invalid_client\)/);
    expect(recordAgentEvent.mock.calls[0][0]).toMatchObject({ decision: 'declined', details: { accepted: false, error: 'invalid_client' } });
  });

  test('callback still answers if the log write fails', async () => {
    recordAgentEvent.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app()).get('/api/v1/identity/shop/callback?error=access_denied');
    expect(res.status).toBe(200);
  });

  test('summarizeCallback trims long values', () => {
    expect(shop.summarizeCallback({ error: 'x'.repeat(1000) }).error).toHaveLength(300);
  });
});
