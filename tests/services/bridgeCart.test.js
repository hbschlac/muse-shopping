/**
 * Bridge cart: partner-store products in the Muse cart, checked out at each store.
 */

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));
jest.mock('../../src/services/agentAudit', () => ({ recordAgentEvent: jest.fn().mockResolvedValue({ id: 1 }) }));
const { recordAgentEvent } = require('../../src/services/agentAudit');

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

const actions = () => recordAgentEvent.mock.calls.map(([e]) => e.action);

beforeEach(() => {
  jest.restoreAllMocks();
  pool.query.mockReset();
  recordAgentEvent.mockClear();
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
    expect(actions()).toEqual(['product.checked', 'cart.item_added']);
    expect(recordAgentEvent.mock.calls[1][0]).toMatchObject({ actor: 'muse-agent', decision: 'allowed', userId: 7, partnerKey: 'allbirds', amountCents: 22000 });
    // The log names the exact item: ids, size, color, unit price, and who sells it.
    expect(recordAgentEvent.mock.calls[1][0].details).toMatchObject({
      productId: PRODUCT.id, variantId: 'gid://shopify/ProductVariant/11', quantity: 2,
      title: "Women's Wool Runner", variantTitle: '6 / Natural', size: '6', color: 'Natural',
      unitPriceCents: 11000, marketplace: null, sellerName: 'Allbirds',
    });
  });

  test('on a marketplace, the log records the marketplace, the seller, who ships it and the listing', async () => {
    AgentBridges.getPartner.mockReturnValue({ ...PARTNER, key: 'walmart', name: 'Walmart', marketplace: true });
    const product = {
      ...PRODUCT,
      seller: { id: 'S-123', name: 'Acme Outfitters' },
      variants: [{ ...PRODUCT.variants[1], offerId: 'OFFER-9', gtin: '00012345678905', fulfilledBy: 'Walmart' }],
    };
    mockBridge({ getProduct: jest.fn().mockResolvedValue(product) });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 50, name: 'Walmart', slug: 'bridge-walmart' }] });
    const addItem = jest.spyOn(CartService, 'addItem').mockResolvedValue({ id: 3 });
    await BridgeCartService.addItem(7, { partnerKey: 'walmart', productId: product.id, variantId: 'gid://shopify/ProductVariant/11' });
    const seller = { marketplace: 'Walmart', sellerId: 'S-123', sellerName: 'Acme Outfitters', fulfilledBy: 'Walmart', offerId: 'OFFER-9', gtin: '00012345678905' };
    expect(recordAgentEvent.mock.calls.at(-1)[0].details).toMatchObject(seller);
    expect(addItem.mock.calls[0][1].metadata.bridge).toMatchObject(seller);
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
    expect(actions()).toEqual(['product.checked', 'cart.item_rejected']);
    expect(recordAgentEvent.mock.calls[1][0]).toMatchObject({ decision: 'blocked', reason: 'Sold out at the store' });
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
      .mockResolvedValueOnce({ rows: [{                              // saved default address
        name: 'Jane Smith', address1: '350 5th Ave', address2: null, city: 'New York',
        state: 'NY', zip: '10118', country: 'US', phone: '+12125550100',
      }] })
      .mockResolvedValue({ rows: [] });                              // cart updates

    const result = await BridgeCartService.startCheckout(7);

    expect(allbirds.startCheckout).toHaveBeenCalledWith(
      [{ variantId: 'gid://shopify/ProductVariant/11', quantity: 2 }],
      {
        buyer: { email: 'a@example.com' },
        shippingAddress: expect.objectContaining({ name: 'Jane Smith', address1: '350 5th Ave', zip: '10118', phone: '+12125550100' }),
      }
    );
    expect(result.shipTo).toMatchObject({ name: 'Jane Smith', city: 'New York' });
    expect(result.shipTo.phone).toBeUndefined();
    expect(result.stores[0].prefilled).toBe(true);
    // Each store's checkout lists its exact items, with the cart price and the store's price.
    expect(result.stores[0].items).toEqual([expect.objectContaining({
      cartItemId: 1, variantId: 'gid://shopify/ProductVariant/11', quantity: 2, cartPriceCents: 11000, storePriceCents: 9900,
    })]);
    const created = recordAgentEvent.mock.calls.map(([e]) => e).find((e) => e.action === 'checkout.created' && e.decision === 'info');
    expect(created.details.items[0]).toMatchObject({ variantId: 'gid://shopify/ProductVariant/11', storePriceCents: 9900 });

    // Activity log: one cart session id for the whole run; the failed store is logged too.
    expect(actions().sort()).toEqual(['cart.prices_refreshed', 'checkout.created', 'checkout.created', 'checkout.prefilled'].sort());
    const ids = new Set(recordAgentEvent.mock.calls.map(([e]) => e.cartSessionId));
    expect(ids.size).toBe(1);
    expect(result.cartSessionId).toMatch(/^bcs_/);
    expect(ids.has(result.cartSessionId)).toBe(true);
    const failed = recordAgentEvent.mock.calls.find(([e]) => e.partnerKey === 'staud')[0];
    expect(failed).toMatchObject({ action: 'checkout.created', decision: 'error', reason: 'rate limited' });
    const refreshed = recordAgentEvent.mock.calls.find(([e]) => e.action === 'cart.prices_refreshed')[0];
    expect(refreshed.details.changes).toEqual([{ cartItemId: 1, variantId: 'gid://shopify/ProductVariant/11', fromCents: 11000, toCents: 9900 }]);
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

  test('a log write failure does not block the store checkout', async () => {
    recordAgentEvent.mockRejectedValue(new Error('db down'));
    const store = { startCheckout: jest.fn().mockResolvedValue({ id: 'co', continueUrl: 'https://s/c', lineItems: [] }) };
    jest.spyOn(AgentBridges, 'getBridge').mockReturnValue(store);
    pool.query
      .mockResolvedValueOnce({ rows: [cartRows[0]] })
      .mockResolvedValueOnce({ rows: [{ email: 'a@example.com' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });
    const result = await BridgeCartService.startCheckout(7);
    expect(result.stores[0].checkout.continueUrl).toBe('https://s/c');
    recordAgentEvent.mockResolvedValue({ id: 1 });
  });

  test('errors when the cart has no partner-store items', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(BridgeCartService.startCheckout(7)).rejects.toThrow(/no partner-store items/);
  });
});

describe('UcpBridge.startCheckout prefill', () => {
  const { UcpBridge, toDestination } = require('../../src/services/agentBridges/ucpBridge');
  const ADDRESS = { name: 'Jane Smith', address1: '350 5th Ave', city: 'New York', state: 'NY', zip: '10118', country: 'us', phone: '+12125550100' };

  test('maps a Muse address to a UCP destination with a phone', () => {
    expect(toDestination(ADDRESS, null)).toEqual({
      first_name: 'Jane', last_name: 'Smith', street_address: '350 5th Ave',
      address_locality: 'New York', address_region: 'NY', postal_code: '10118',
      address_country: 'US', phone_number: '+12125550100',
    });
    expect(toDestination({ name: 'X', address1: '1 A St' }, null)).toBeNull();
  });

  test('creates the checkout, then fills in buyer and shipping with the line ids', async () => {
    const callTool = jest.fn()
      .mockResolvedValueOnce({ checkout: { id: 'co_1', status: 'requires_escalation',
        line_items: [{ id: 'line_1', item: { id: 'v11' }, quantity: 1 }], continue_url: 'https://s/1' } })
      .mockResolvedValueOnce({ checkout: { id: 'co_1', status: 'requires_escalation',
        line_items: [{ id: 'line_1', item: { id: 'v11', price: 1800 }, quantity: 1 }],
        totals: [{ type: 'fulfillment', amount: 500 }, { type: 'total', amount: 2300 }], continue_url: 'https://s/1' } });
    const bridge = new UcpBridge({ ...PARTNER, endpoint: 'https://allbirds/api/ucp/mcp' }, { callTool });

    const summary = await bridge.startCheckout([{ variantId: 'v11', quantity: 1 }], { buyer: { email: 'a@example.com' }, shippingAddress: ADDRESS });

    expect(callTool.mock.calls[0][1]).toBe('create_checkout');
    const [, tool, args] = callTool.mock.calls[1];
    expect(tool).toBe('update_checkout');
    expect(args.id).toBe('co_1');
    expect(args.checkout.line_items).toEqual([{ id: 'line_1', item: { id: 'v11' }, quantity: 1 }]);
    expect(args.checkout.buyer).toEqual({ email: 'a@example.com', first_name: 'Jane', last_name: 'Smith', phone_number: '+12125550100' });
    expect(args.checkout.fulfillment.methods[0]).toMatchObject({ type: 'shipping', line_item_ids: ['line_1'] });
    expect(args.checkout.fulfillment.methods[0].destinations[0].postal_code).toBe('10118');
    expect(summary.totals.fulfillment.cents).toBe(500);
    expect(summary.continueUrl).toBe('https://s/1');
  });

  test('keeps the created checkout if the store rejects the prefill', async () => {
    const callTool = jest.fn()
      .mockResolvedValueOnce({ checkout: { id: 'co_2', line_items: [{ id: 'l', item: { id: 'v' }, quantity: 1 }], continue_url: 'https://s/2' } })
      .mockRejectedValueOnce(new Error('invalid_address'));
    const bridge = new UcpBridge({ ...PARTNER, endpoint: 'https://x' }, { callTool });
    const summary = await bridge.startCheckout([{ variantId: 'v', quantity: 1 }], { shippingAddress: ADDRESS });
    expect(summary.continueUrl).toBe('https://s/2');
    expect(summary.prefillError).toBe('invalid_address');
  });

  test('without an address it only creates the checkout', async () => {
    const callTool = jest.fn().mockResolvedValueOnce({ checkout: { id: 'co_3', line_items: [], continue_url: 'https://s/3' } });
    const bridge = new UcpBridge({ ...PARTNER, endpoint: 'https://x' }, { callTool });
    await bridge.startCheckout([{ variantId: 'v', quantity: 1 }], { buyer: { email: 'a@example.com' } });
    expect(callTool).toHaveBeenCalledTimes(1);
    expect(callTool.mock.calls[0][2].checkout.buyer).toEqual({ email: 'a@example.com' });
  });
});
