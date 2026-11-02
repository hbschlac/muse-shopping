/**
 * Bridge cart: partner-store products in the Muse cart, checked out at each store.
 */

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

const pool = require('../../src/db/pool');
const AgentBridges = require('../../src/services/agentBridges');
const CartService = require('../../src/services/cartService');
const BridgeCartService = require('../../src/services/bridgeCartService');

const PARTNER = {
  key: 'allbirds', name: 'Allbirds', domain: 'www.allbirds.com',
  protocol: 'ucp-mcp', category: 'shoes', canCheckout: true,
};

const PRODUCT = {
  partnerKey: 'allbirds',
  brand: 'Allbirds',
  id: 'gid://shopify/Product/1',
  title: "Women's Wool Runner",
  description: 'Soft wool sneaker',
  url: 'https://www.allbirds.com/products/womens-wool-runners',
  imageUrl: 'https://cdn.shopify.com/p.png',
  price: { cents: 11000, currency: 'USD' },
  compareAtPrice: { cents: 12500, currency: 'USD' },
  variants: [
    { id: 'gid://shopify/ProductVariant/10', title: '5', price: { cents: 11000, currency: 'USD' }, available: false, options: { Size: '5' }, imageUrl: null },
    { id: 'gid://shopify/ProductVariant/11', title: '6 / Natural', price: { cents: 11000, currency: 'USD' }, available: true, options: { Size: '6', Color: 'Natural' }, imageUrl: 'https://cdn.shopify.com/v11.png' },
  ],
};

function mockBridge(overrides = {}) {
  const bridge = {
    getProduct: jest.fn().mockResolvedValue(PRODUCT),
    startCheckout: jest.fn(),
    ...overrides,
  };
  jest.spyOn(AgentBridges, 'getBridge').mockReturnValue(bridge);
  return bridge;
}

beforeEach(() => {
  jest.restoreAllMocks();
  pool.query.mockReset();
  jest.spyOn(AgentBridges, 'getPartner').mockReturnValue(PARTNER);
});

describe('BridgeCartService.addItem', () => {
  test('adds the chosen variant, priced live, under a bridge store row', async () => {
    mockBridge();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 42, name: 'Allbirds', slug: 'bridge-allbirds' }] });
    const addItem = jest.spyOn(CartService, 'addItem').mockResolvedValue({ id: 1 });

    await BridgeCartService.addItem(7, {
      partnerKey: 'allbirds', productId: PRODUCT.id, variantId: 'gid://shopify/ProductVariant/11', quantity: 2,
    });

    expect(pool.query.mock.calls[0][1]).toEqual(['bridge-allbirds']);
    expect(addItem).toHaveBeenCalledWith(7, expect.objectContaining({
      storeId: 42,
      productSku: 'gid://shopify/ProductVariant/11',
      priceCents: 11000,
      originalPriceCents: 12500,
      size: '6',
      color: 'Natural',
      quantity: 2,
      productImageUrl: 'https://cdn.shopify.com/v11.png',
      metadata: { bridge: expect.objectContaining({ partnerKey: 'allbirds', variantId: 'gid://shopify/ProductVariant/11' }) },
    }));
  });

  test('creates the store row the first time a partner is used', async () => {
    mockBridge();
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 43, name: 'Allbirds', slug: 'bridge-allbirds' }] });
    jest.spyOn(CartService, 'addItem').mockResolvedValue({ id: 1 });

    await BridgeCartService.addItem(7, { partnerKey: 'allbirds', productId: PRODUCT.id, variantId: 'gid://shopify/ProductVariant/11' });

    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO stores/);
    expect(sql).toMatch(/'ucp', true/);
    expect(params.slice(0, 4)).toEqual(['Allbirds', 'bridge-allbirds', 'Allbirds', 'https://www.allbirds.com']);
  });

  test('refuses sold-out variants and missing variant choice', async () => {
    mockBridge();
    await expect(BridgeCartService.addItem(7, { partnerKey: 'allbirds', productId: PRODUCT.id, variantId: 'gid://shopify/ProductVariant/10' }))
      .rejects.toThrow(/sold out/);
    await expect(BridgeCartService.addItem(7, { partnerKey: 'allbirds', productId: PRODUCT.id }))
      .rejects.toThrow(/Choose a size or color/);
  });

  test('refuses partners without agent checkout', async () => {
    AgentBridges.getPartner.mockReturnValue({ ...PARTNER, canCheckout: false });
    await expect(BridgeCartService.addItem(7, { partnerKey: 'allbirds', productId: PRODUCT.id }))
      .rejects.toThrow(/does not offer agent checkout/);
  });
});

describe('BridgeCartService.startCheckout', () => {
  const cartRows = [
    { id: 1, store_id: 42, store_name: 'Allbirds', product_name: 'Runner', product_sku: 'v11', quantity: 2, price_cents: 11000,
      metadata: { bridge: { partnerKey: 'allbirds', variantId: 'gid://shopify/ProductVariant/11' } } },
    { id: 2, store_id: 44, store_name: 'STAUD', product_name: 'Bag', product_sku: 'v99', quantity: 1, price_cents: 25000,
      metadata: { bridge: { partnerKey: 'staud', variantId: 'gid://shopify/ProductVariant/99' } } },
  ];

  test('builds one store checkout per partner, refreshes prices, never charges', async () => {
    const allbirds = { startCheckout: jest.fn().mockResolvedValue({
      id: 'co_1', status: 'incomplete', continueUrl: 'https://www.allbirds.com/checkouts/co_1',
      lineItems: [{ variantId: 'gid://shopify/ProductVariant/11', priceCents: 9900, quantity: 2 }],
    }) };
    const staud = { startCheckout: jest.fn().mockRejectedValue(new Error('rate limited')) };
    jest.spyOn(AgentBridges, 'getBridge').mockImplementation(key => (key === 'allbirds' ? allbirds : staud));

    pool.query
      .mockResolvedValueOnce({ rows: cartRows })                    // bridge lines
      .mockResolvedValueOnce({ rows: [{ email: 'a@example.com' }] }) // account email
      .mockResolvedValue({ rows: [] });                              // cart updates

    const result = await BridgeCartService.startCheckout(7);

    expect(allbirds.startCheckout).toHaveBeenCalledWith(
      [{ variantId: 'gid://shopify/ProductVariant/11', quantity: 2 }],
      { buyer: { email: 'a@example.com' } }
    );
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0]).toMatchObject({ partnerKey: 'allbirds', storeName: 'Allbirds', itemCount: 2 });
    expect(result.stores[0].checkout.continueUrl).toBe('https://www.allbirds.com/checkouts/co_1');
    expect(result.errors).toEqual([{ partnerKey: 'staud', storeName: 'STAUD', message: 'rate limited' }]);

    const update = pool.query.mock.calls.find(([sql]) => /UPDATE cart_items/.test(sql));
    expect(update[1][0]).toBe(9900);
    expect(update[1][2]).toBe(1);
    // No Stripe or payment SQL anywhere in the flow.
    expect(pool.query.mock.calls.some(([sql]) => /payment_transactions/.test(sql))).toBe(false);
  });

  test('errors when the cart has no partner-store items', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(BridgeCartService.startCheckout(7)).rejects.toThrow(/no partner-store items/);
  });
});
