/**
 * Agent bridges: UCP client, UCP bridge, search fan-out, agent profile, and the
 * checkout placement change (no hidden-browser placement).
 */

// checkoutService pulls in services that read these at load time.
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

const ucpClient = require('../../src/services/agentBridges/ucpMcpClient');
const { UcpBridge, normalizeProduct } = require('../../src/services/agentBridges/ucpBridge');
const AgentBridges = require('../../src/services/agentBridges');
const { buildAgentProfile, getProfileUrl } = require('../../src/services/agentBridges/agentProfile');
const CheckoutService = require('../../src/services/checkoutService');

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const PARTNER = { key: 'allbirds', name: 'Allbirds', domain: 'www.allbirds.com', protocol: 'ucp-mcp' };

const SAMPLE_PRODUCT = {
  id: 'gid://shopify/Product/1',
  title: "Women's Wool Runner",
  description: { html: '<p>Soft <b>wool</b> sneaker</p>' },
  url: 'https://www.allbirds.com/products/womens-wool-runners',
  price_range: { min: { amount: 11000, currency: 'USD' }, max: { amount: 11000, currency: 'USD' } },
  list_price_range: { min: { amount: 0, currency: 'USD' }, max: { amount: 0, currency: 'USD' } },
  variants: [
    {
      id: 'gid://shopify/ProductVariant/10',
      title: '5',
      price: { amount: 11000, currency: 'USD' },
      availability: { available: false },
      options: [{ name: 'Size', label: '5' }],
      media: [{ type: 'image', url: 'https://cdn.shopify.com/a.png' }],
    },
    {
      id: 'gid://shopify/ProductVariant/11',
      title: '6',
      price: { amount: 11000, currency: 'USD' },
      availability: { available: true },
      options: [{ name: 'Size', label: '6' }],
      media: [],
    },
  ],
};

describe('ucpMcpClient', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    ucpClient.clearManifestCache();
  });

  it('discovers the MCP endpoint from /.well-known/ucp and caches it', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      ucp: {
        version: '2026-08-25',
        services: { 'dev.ucp.shopping': [{ transport: 'mcp', endpoint: 'https://shop.myshopify.com/api/ucp/mcp' }] },
        capabilities: { 'dev.ucp.shopping.checkout': [] },
        payment_handlers: { 'dev.shopify.shop_pay': [] },
      },
    }));

    const first = await ucpClient.discover('https://WWW.Example.com/anything');
    const second = await ucpClient.discover('www.example.com');

    expect(first.endpoint).toBe('https://shop.myshopify.com/api/ucp/mcp');
    expect(first.paymentHandlers).toEqual(['dev.shopify.shop_pay']);
    expect(second).toBe(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('https://www.example.com/.well-known/ucp');
  });

  it('sends the agent profile in meta and unwraps structuredContent', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      jsonrpc: '2.0', id: 1, result: { structuredContent: { products: [] } },
    }));

    const result = await ucpClient.callTool('https://shop/api/ucp/mcp', 'search_catalog', { catalog: { query: 'x' } });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.method).toBe('tools/call');
    expect(body.params.name).toBe('search_catalog');
    expect(body.params.arguments.meta['ucp-agent'].profile).toBe(getProfileUrl());
    expect(result).toEqual({ products: [] });
  });

  it('parses JSON text content when there is no structuredContent', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '{"ok":true}' }] },
    }));
    await expect(ucpClient.callTool('https://shop/mcp', 'get_cart', { id: 'c' })).resolves.toEqual({ ok: true });
  });

  it('turns JSON-RPC errors into a UcpError that carries the store continue_url', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32001, message: 'UCP discovery failed', data: { code: 'profile_unreachable', continue_url: 'https://shop.example/' } },
    }));

    await expect(ucpClient.callTool('https://shop/mcp', 'search_catalog', {})).rejects.toMatchObject({
      name: 'UcpError',
      code: 'profile_unreachable',
      statusCode: 502,
      continueUrl: 'https://shop.example/',
    });
  });
});

describe('UcpBridge', () => {
  it('normalizes products: prices in cents, stripped HTML, availability, no zero compare-at', () => {
    const p = normalizeProduct(SAMPLE_PRODUCT, PARTNER);
    expect(p).toMatchObject({
      partnerKey: 'allbirds',
      brand: 'Allbirds',
      title: "Women's Wool Runner",
      description: 'Soft wool sneaker',
      price: { cents: 11000, currency: 'USD' },
      compareAtPrice: null,
      available: true,
      imageUrl: 'https://cdn.shopify.com/a.png',
    });
    expect(p.variants[1]).toMatchObject({ id: 'gid://shopify/ProductVariant/11', options: { Size: '6' }, available: true });
  });

  it('searches through search_catalog with buyer context', async () => {
    const callTool = jest.fn().mockResolvedValue({ products: [SAMPLE_PRODUCT], pagination: { has_next_page: true, cursor: 'abc' } });
    const bridge = new UcpBridge({ ...PARTNER, endpoint: 'https://shop/mcp' }, { callTool });

    const result = await bridge.searchProducts('wool runners', { limit: 3 });

    expect(callTool).toHaveBeenCalledWith('https://shop/mcp', 'search_catalog', {
      catalog: { query: 'wool runners', context: { address_country: 'US', currency: 'USD' }, pagination: { limit: 3 } },
    });
    expect(result.products).toHaveLength(1);
    expect(result.nextCursor).toBe('abc');
  });

  it('starts a checkout and returns totals, what the store still needs, and continue_url', async () => {
    const callTool = jest.fn().mockResolvedValue({
      id: 'gid://shopify/Checkout/xyz',
      currency: 'USD',
      line_items: [{ item: { id: 'gid://shopify/ProductVariant/11', title: 'Wool Runner - 6', price: 11000 }, quantity: 1 }],
      totals: [{ type: 'subtotal', amount: 11000 }, { type: 'tax', amount: 660 }, { type: 'total', amount: 11660 }],
      messages: [{ type: 'error', code: 'delivery_address_required', content: 'Address needed', severity: 'recoverable' }],
      links: [{ type: 'refund_policy', title: 'Refund Policy', url: 'https://shop/refunds' }],
      continue_url: 'https://shop/checkouts/xyz',
    });
    const bridge = new UcpBridge({ ...PARTNER, endpoint: 'https://shop/mcp' }, { callTool });

    const summary = await bridge.startCheckout([{ variantId: 'gid://shopify/ProductVariant/11', quantity: '1' }]);

    expect(callTool).toHaveBeenCalledWith('https://shop/mcp', 'create_checkout', {
      checkout: { line_items: [{ item: { id: 'gid://shopify/ProductVariant/11' }, quantity: 1 }] },
    });
    expect(summary.totals.total.cents).toBe(11660);
    expect(summary.needsFromShopper[0].code).toBe('delivery_address_required');
    expect(summary.policies[0].type).toBe('refund_policy');
    expect(summary.continueUrl).toBe('https://shop/checkouts/xyz');
  });

  it('rejects empty or malformed lines before calling the store', async () => {
    const callTool = jest.fn();
    const bridge = new UcpBridge({ ...PARTNER, endpoint: 'https://shop/mcp' }, { callTool });
    await expect(bridge.startCheckout([])).rejects.toThrow('At least one line item');
    await expect(bridge.startCheckout([{ quantity: 1 }])).rejects.toThrow('variantId');
    expect(callTool).not.toHaveBeenCalled();
  });
});

describe('AgentBridges registry and search', () => {
  it('lists only partners with a supported protocol', () => {
    const partners = AgentBridges.listPartners();
    expect(partners.length).toBeGreaterThan(0);
    expect(partners.every(p => p.protocol === 'ucp-mcp')).toBe(true);
  });

  it('merges results and isolates a failing store', async () => {
    const factories = {
      'ucp-mcp': partner => ({
        searchProducts: async () => {
          if (partner.key === 'skims') throw new Error('store down');
          return { products: [{ partnerKey: partner.key, title: 'x' }] };
        },
      }),
    };

    const result = await AgentBridges.search('dress', { partners: ['allbirds', 'skims'], factories });

    expect(result.searched).toEqual(['allbirds', 'skims']);
    expect(result.products).toEqual([{ partnerKey: 'allbirds', title: 'x' }]);
    expect(result.errors).toEqual([{ partnerKey: 'skims', message: 'store down' }]);
  });

  it('requires a query and a known partner', async () => {
    await expect(AgentBridges.search('  ')).rejects.toThrow('search query is required');
    expect(() => AgentBridges.getBridge('not-a-store')).toThrow('Agent bridge "not-a-store" not found');
  });
});

describe('agent profile', () => {
  const saved = process.env.UCP_SIGNING_PUBLIC_JWK;
  afterEach(() => {
    if (saved === undefined) delete process.env.UCP_SIGNING_PUBLIC_JWK;
    else process.env.UCP_SIGNING_PUBLIC_JWK = saved;
  });

  it('declares required registries and catalog/cart/checkout capabilities', () => {
    const profile = buildAgentProfile();
    expect(profile.ucp.services['dev.ucp.shopping'][0].transport).toBe('mcp');
    expect(profile.ucp.payment_handlers).toEqual({});
    expect(Object.keys(profile.ucp.capabilities)).toEqual(expect.arrayContaining([
      'dev.ucp.shopping.catalog.search',
      'dev.ucp.shopping.cart',
      'dev.ucp.shopping.checkout',
    ]));
  });

  it('never publishes a private key', () => {
    process.env.UCP_SIGNING_PUBLIC_JWK = JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'X', y: 'Y', d: 'SECRET' });
    const [key] = buildAgentProfile().keys;
    expect(key).toMatchObject({ kty: 'EC', crv: 'P-256', x: 'X', y: 'Y', alg: 'ES256' });
    expect(key.d).toBeUndefined();
  });
});

describe('checkout placement', () => {
  it('no longer routes any store to hidden-browser placement', () => {
    expect(CheckoutService.determinePlacementMethod({ integrationType: 'headless', supportsCheckout: true })).toBe('manual');
  });

  it('routes agent-protocol stores to bridge placement', () => {
    expect(CheckoutService.determinePlacementMethod({ integrationType: 'ucp', supportsCheckout: true })).toBe('bridge');
    expect(CheckoutService.determinePlacementMethod({ integrationType: 'api', supportsCheckout: true })).toBe('api');
  });
});
