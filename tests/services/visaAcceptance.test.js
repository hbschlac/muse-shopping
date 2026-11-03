/**
 * Visa Acceptance sandbox client: HTTP Signature auth headers and config checks.
 */
const crypto = require('crypto');
const visa = require('../../src/services/visaAcceptance/client');

const config = {
  merchantId: 'muse_sandbox_test',
  keyId: 'key-123',
  secret: Buffer.from('not-a-real-secret-32-bytes-long!').toString('base64'),
};
const DATE = 'Tue, 03 Nov 2026 06:30:00 GMT';

function expectedSignature(lines) {
  return crypto.createHmac('sha256', Buffer.from(config.secret, 'base64')).update(lines.join('\n')).digest('base64');
}

describe('visaAcceptance client', () => {
  test('POST signs host, date, request-target, digest and merchant id', () => {
    const body = JSON.stringify({ a: 1 });
    const { headers } = visa.buildAuthHeaders({ method: 'post', path: '/pts/v2/payments', body, date: DATE, config });
    const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
    expect(headers.digest).toBe(digest);
    expect(headers.host).toBe('apitest.cybersource.com');
    expect(headers['v-c-merchant-id']).toBe('muse_sandbox_test');
    const sig = expectedSignature([
      'host: apitest.cybersource.com',
      `date: ${DATE}`,
      'request-target: post /pts/v2/payments',
      `digest: ${digest}`,
      'v-c-merchant-id: muse_sandbox_test',
    ]);
    expect(headers.signature).toBe(
      `keyid="key-123", algorithm="HmacSHA256", headers="host date request-target digest v-c-merchant-id", signature="${sig}"`,
    );
  });

  test('GET has no digest', () => {
    const { headers } = visa.buildAuthHeaders({ method: 'get', path: '/reporting/v3/x', date: DATE, config });
    expect(headers.digest).toBeUndefined();
    expect(headers.signature).toContain('headers="host date request-target v-c-merchant-id"');
  });

  test('reports missing env without values', () => {
    const c = visa.getConfig({ VISA_ACCEPTANCE_ORG_ID: 'x' });
    expect(c.configured).toBe(false);
    expect(c.missing).toEqual(['VISA_ACCEPTANCE_KEY_ID', 'VISA_ACCEPTANCE_SECRET']);
  });

  test('request refuses to run unconfigured', async () => {
    await expect(visa.request('get', '/x', undefined, { env: {} })).rejects.toThrow('Missing env');
  });
});
