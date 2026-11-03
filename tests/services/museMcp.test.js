/**
 * Item tagger and Muse's MCP server (JSON-RPC handling; store calls mocked).
 */

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

jest.mock('../../src/services/agentBridges', () => {
  const actual = jest.requireActual('../../src/services/agentBridges');
  return { ...actual, search: jest.fn(), getBridge: jest.fn() };
});

const AgentBridges = require('../../src/services/agentBridges');
const { tagProduct, matchesFilters } = require('../../src/services/agentBridges/itemTagger');
const { handleMessage, TOOLS } = require('../../src/routes/museMcpRoutes');

const dress = {
  title: 'Evangeline Silk Midi Dress | Black',
  description: 'A bias-cut slip silhouette for evening.',
  price: { cents: 59500 },
  compareAtPrice: { cents: 69500 },
  available: true,
  variants: [
    { available: true, options: { Size: 's', Color: 'Black' } },
    { available: false, options: { Size: 'M', Color: 'Black' } },
  ],
};

describe('itemTagger', () => {
  it('tags category, color, material, silhouette, occasion, sizes and sale', () => {
    expect(tagProduct(dress)).toEqual({
      category: 'dress',
      colors: ['black'],
      patterns: [],
      materials: ['silk'],
      silhouette: ['midi'],
      fit: [],
      occasion: ['event'],
      sizesInStock: ['S'],
      onSale: true,
    });
  });

  it('takes category from the title before the description', () => {
    const tags = tagProduct({ title: 'Easy Small Hoops', description: 'Pair with any dress or jeans. 14k gold vermeil.' });
    expect(tags.category).toBe('jewelry');
    expect(tags.materials).toContain('gold');
  });

  it('canonicalizes colors and separates patterns', () => {
    const tags = tagProduct({ title: 'Wrap Top - Navy Floral', variants: [] });
    expect(tags.colors).toEqual(['blue']);
    expect(tags.patterns).toEqual(['floral']);
    expect(tags.silhouette).toEqual(['wrap']);
  });

  it('filters on tags, size in stock and price', () => {
    const p = { ...dress, tags: tagProduct(dress) };
    expect(matchesFilters(p, { category: 'dress', color: 'black', size: 'S' })).toBe(true);
    expect(matchesFilters(p, { size: 'M' })).toBe(false);
    expect(matchesFilters(p, { maxPriceCents: 50000 })).toBe(false);
    expect(matchesFilters(p, { color: 'red' })).toBe(false);
  });
});

describe('Muse MCP server', () => {
  it('initializes and lists four tools', async () => {
    const init = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(init.result.serverInfo.name).toBe('muse-shopping');
    expect(init.result.capabilities.tools).toBeDefined();
    const list = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(list.result.tools.map(t => t.name)).toEqual(TOOLS.map(t => t.name));
  });

  it('returns nothing for notifications and an error for unknown methods', async () => {
    expect(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    const res = await handleMessage({ jsonrpc: '2.0', id: 3, method: 'resources/list' });
    expect(res.error.code).toBe(-32601);
  });

  it('maps search_products arguments to bridge search with tag filters', async () => {
    AgentBridges.search.mockResolvedValue({ query: 'dress', searched: ['staud'], products: [], errors: [] });
    const res = await handleMessage({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'search_products', arguments: { query: 'dress', stores: ['staud'], color: 'black', max_price: 250 } },
    });
    expect(AgentBridges.search).toHaveBeenCalledWith('dress', expect.objectContaining({
      partners: ['staud'],
      limitPerPartner: 10,
      filters: expect.objectContaining({ color: 'black', maxPriceCents: 25000 }),
    }));
    expect(res.result.structuredContent.searched).toEqual(['staud']);
  });

  it('maps start_checkout lines and reports store failures as tool errors', async () => {
    const startCheckout = jest.fn().mockResolvedValue({ continueUrl: 'https://shop/c' });
    AgentBridges.getBridge.mockReturnValue({ startCheckout });
    const ok = await handleMessage({
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'start_checkout', arguments: { store: 'skims', lines: [{ variant_id: 'v1', quantity: 2 }] } },
    });
    expect(startCheckout).toHaveBeenCalledWith([{ variantId: 'v1', quantity: 2 }]);
    expect(ok.result.structuredContent.checkout.continueUrl).toBe('https://shop/c');

    const failure = Object.assign(new Error('store down'), { continueUrl: 'https://shop/' });
    startCheckout.mockRejectedValue(failure);
    const bad = await handleMessage({
      jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: { name: 'start_checkout', arguments: { store: 'skims', lines: [{ variant_id: 'v1' }] } },
    });
    expect(bad.result.isError).toBe(true);
    expect(JSON.parse(bad.result.content[0].text)).toEqual({ error: 'store down', continue_url: 'https://shop/' });
  });

  it('rejects unknown tools with invalid params', async () => {
    const res = await handleMessage({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'nope' } });
    expect(res.error.code).toBe(-32602);
  });
});
