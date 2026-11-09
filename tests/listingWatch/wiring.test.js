/**
 * The listing endpoints must be reachable in production. PR #30 shipped the
 * routes without mounting them (404 on www.muse.shopping), so check the wiring
 * in both entry points: api/index.js (Vercel) and src/app.js (local).
 */
const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');

describe('listing refresh wiring', () => {
  test('the router mounts /listings', () => {
    const src = read('src/routes/index.js');
    expect(src).toMatch(/require\('\.\/listingRoutes'\)/);
    expect(src).toMatch(/router\.use\('\/listings', listingRoutes\)/);
  });

  test.each(['api/index.js', 'src/app.js'])('%s raises the body limit for ingest before the default parser', file => {
    const src = read(file);
    const raised = src.indexOf("app.use('/api/v1/listings/ingest', express.json({ limit: '4mb' }))");
    expect(raised).toBeGreaterThan(-1);
    expect(raised).toBeLessThan(src.indexOf('app.use(express.json())'));
  });
});
