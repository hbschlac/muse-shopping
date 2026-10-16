/**
 * Retailer scrape / sync route auth tests
 * Every data-changing retailer inventory and integration route must require an admin.
 * Services and the DB pool are mocked, so no scrape or DB write can run.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
// Read at load time by storeConnectionService, which src/routes pulls in
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const request = require('supertest');
const jwt = require('jsonwebtoken');

// [path under /api/v1, module the handler calls, function the handler calls]
const PROTECTED_ROUTES = [
  ['/nordstrom/scrape/trigger', '../src/jobs/nordstromInventoryJob', 'runInventoryScrape'],
  ['/abercrombie/scrape/trigger', '../src/services/abercrombieInventoryService', 'scrapeInventory'],
  ['/aritzia/scrape/trigger', '../src/services/aritziaInventoryService', 'scrapeInventory'],
  ['/commense/scrape/trigger', '../src/services/commenseInventoryService', 'scrapeInventory'],
  ['/sunfere/scrape/trigger', '../src/services/sunfereInventoryService', 'scrapeInventory'],
  ['/shopcider/scrape/trigger', '../src/services/shopciderInventoryService', 'scrapeInventory'],
  ['/macys/scrape/trigger', '../src/services/macysInventoryService', 'scrapeInventory'],
  ['/target/scrape/trigger', '../src/services/targetInventoryService', 'scrapeInventory'],
  ['/zara/scrape/trigger', '../src/services/zaraInventoryService', 'scrapeInventory'],
  ['/hm/scrape/trigger', '../src/services/hmInventoryService', 'scrapeInventory'],
  ['/urbanoutfitters/scrape/trigger', '../src/services/urbanoutfittersInventoryService', 'scrapeInventory'],
  ['/freepeople/scrape/trigger', '../src/services/freepeopleInventoryService', 'scrapeInventory'],
  ['/dynamite/scrape/trigger', '../src/services/dynamiteInventoryService', 'scrapeInventory'],
  ['/nordstrom-integration/sync', '../src/services/nordstromIntegrationService', 'syncNordstromToItems'],
  ['/nordstrom-integration/update-prices', '../src/services/nordstromIntegrationService', 'updatePricesFromNordstrom'],
  ['/bloomingdales-integration/sync', '../src/services/bloomingdalesIntegrationService', 'syncBloomingdalesToItems'],
  ['/abercrombie-integration/sync', '../src/services/abercrombieIntegrationService', 'syncAbercrombieToItems'],
  ['/abercrombie-integration/update-prices', '../src/services/abercrombieIntegrationService', 'updatePricesFromLatestScrape'],
  ['/aritzia-integration/sync', '../src/services/aritziaIntegrationService', 'syncAritziaToItems'],
  ['/aritzia-integration/update-prices', '../src/services/aritziaIntegrationService', 'updatePricesFromLatestScrape'],
  ['/commense-integration/sync', '../src/services/commenseIntegrationService', 'syncCommenseToItems'],
  ['/commense-integration/update-prices', '../src/services/commenseIntegrationService', 'updatePricesFromCommense'],
  ['/sunfere-integration/sync', '../src/services/sunfereIntegrationService', 'syncSunfereToItems'],
  ['/sunfere-integration/update-prices', '../src/services/sunfereIntegrationService', 'updatePricesFromSunfere'],
  ['/shopcider-integration/sync', '../src/services/shopciderIntegrationService', 'syncShopciderToItems'],
  ['/shopcider-integration/update-prices', '../src/services/shopciderIntegrationService', 'updatePricesFromShopcider'],
  ['/macys-integration/sync', '../src/services/macysIntegrationService', 'syncMacysToItems'],
  ['/macys-integration/update-prices', '../src/services/macysIntegrationService', 'updatePricesFromLatestScrape'],
  ['/target-integration/sync', '../src/services/targetIntegrationService', 'syncTargetToItems'],
  ['/target-integration/update-prices', '../src/services/targetIntegrationService', 'updatePricesFromLatestScrape'],
  ['/zara-integration/sync', '../src/services/zaraIntegrationService', 'syncZaraToItems'],
  ['/zara-integration/update-prices', '../src/services/zaraIntegrationService', 'updatePricesFromLatestScrape'],
  ['/hm-integration/sync', '../src/services/hmIntegrationService', 'syncHMToItems'],
  ['/hm-integration/update-prices', '../src/services/hmIntegrationService', 'updatePricesFromLatestScrape'],
  ['/urbanoutfitters-integration/sync', '../src/services/urbanoutfittersIntegrationService', 'syncUrbanOutfittersToItems'],
  ['/urbanoutfitters-integration/update-prices', '../src/services/urbanoutfittersIntegrationService', 'updatePricesFromLatestScrape'],
  ['/freepeople-integration/sync', '../src/services/freepeopleIntegrationService', 'syncFreepeopleToItems'],
  ['/freepeople-integration/update-prices', '../src/services/freepeopleIntegrationService', 'updatePricesFromLatestScrape'],
  ['/dynamite-integration/sync', '../src/services/dynamiteIntegrationService', 'syncDynamiteToItems'],
  ['/dynamite-integration/update-prices', '../src/services/dynamiteIntegrationService', 'updatePricesFromLatestScrape'],
];

jest.mock('../src/db/pool', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

// Replace each called module with stubs of only the functions the handlers use
const mockFunctionsByModule = {};
PROTECTED_ROUTES.forEach(([, modulePath, fnName]) => {
  mockFunctionsByModule[modulePath] = mockFunctionsByModule[modulePath] || [];
  mockFunctionsByModule[modulePath].push(fnName);
});
Object.entries(mockFunctionsByModule).forEach(([mockModulePath, mockFnNames]) => {
  jest.mock(mockModulePath, () => Object.fromEntries(
    mockFnNames.map(name => [name, jest.fn().mockResolvedValue({ success: true })])
  ));
});

const pool = require('../src/db/pool');
// Production entry point (vercel.json routes /api/v1/* here)
const app = require('../api/index');

const mockUserRow = (overrides) => ({
  rows: [{ id: 42, email: 'person@example.com', role: 'user', is_admin: false, account_locked: false, ...overrides }],
});

describe('Retailer scrape and sync routes require an admin', () => {
  const token = jwt.sign({ userId: 42 }, process.env.JWT_SECRET);

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  describe.each(PROTECTED_ROUTES)('POST /api/v1%s', (path, modulePath, fnName) => {
    const handlerFn = () => require(modulePath)[fnName];

    test('rejects a request with no token', async () => {
      const res = await request(app).post(`/api/v1${path}`).expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(handlerFn()).not.toHaveBeenCalled();
    });

    test('rejects an invalid token', async () => {
      await request(app)
        .post(`/api/v1${path}`)
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);

      expect(handlerFn()).not.toHaveBeenCalled();
    });

    test('rejects a signed-in non-admin user', async () => {
      pool.query.mockResolvedValueOnce(mockUserRow({ role: 'user', is_admin: false }));

      await request(app)
        .post(`/api/v1${path}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(handlerFn()).not.toHaveBeenCalled();
    });

    test('allows an admin user through to the handler', async () => {
      pool.query.mockResolvedValueOnce(mockUserRow({ role: 'admin' }));

      await request(app)
        .post(`/api/v1${path}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(handlerFn()).toHaveBeenCalledTimes(1);
    });
  });
});
