const { validateOutput } = require('../../src/services/listingWatch/contract');
const { listing, variant } = require('./helpers');

describe('listing contract', () => {
  test('rejects output that is not { listings: [] }', () => {
    expect(validateOutput(null).ok).toBe(false);
    expect(validateOutput({ items: [] }).ok).toBe(false);
  });

  test('keeps good listings and drops bad ones with a reason', () => {
    const r = validateOutput({
      listings: [
        listing('a'),
        listing('b', [], {}),
        listing('c', [variant('c1')], { url: 'http://shop.example/c' }),
        listing('d', [variant('d1', { priceCents: 5 })]),
        listing('e', [variant('e1', { priceCents: 98.5 })]),
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.listings.map(l => l.itemId)).toEqual(['a']);
    expect(r.dropped).toBe(4);
    expect(r.errors.join(' ')).toMatch(/at least one variant/);
    expect(r.errors.join(' ')).toMatch(/https/);
    expect(r.errors.join(' ')).toMatch(/whole cents/);
  });

  test('drops duplicate item ids', () => {
    const r = validateOutput({ listings: [listing('a'), listing('a')] });
    expect(r.listings).toHaveLength(1);
    expect(r.dropped).toBe(1);
  });

  test('strips markup and control characters from store text', () => {
    const r = validateOutput({
      listings: [listing('a', [variant('a1', { size: '<b>S</b>' })], { name: 'Wool <img src=x onerror=alert(1)>Coat\n', brand: '<i>Acme</i>' })],
    });
    expect(r.listings[0].name).toBe('Wool Coat');
    expect(r.listings[0].brand).toBe('Acme');
    expect(r.listings[0].variants[0].size).toBe('S');
  });

  test('keeps store URLs exactly as given', () => {
    const url = 'https://shop.example/products/a?variant=1&utm_content=x&condition=new';
    expect(validateOutput({ listings: [listing('a', undefined, { url })] }).listings[0].url).toBe(url);
  });

  test('a non-https image is dropped, not the listing', () => {
    const r = validateOutput({ listings: [listing('a', undefined, { imageUrl: 'http://x/y.jpg' })] });
    expect(r.listings[0].imageUrl).toBeNull();
  });
});
