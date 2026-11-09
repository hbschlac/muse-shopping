// Shared builders for listing refresh tests.
const variant = (id, over = {}) => ({
  variantId: id, size: 'M', color: null, priceCents: 9800, compareAtCents: null, available: true, ...over,
});
const listing = (id, variants = [variant(`${id}-v1`)], over = {}) => ({
  itemId: id, name: `Item ${id}`, url: `https://shop.example/products/${id}`, variants, ...over,
});
module.exports = { variant, listing };
