/**
 * Requirement adapter policy defaults.
 *
 * These values are intentionally conservative scaffolding defaults and can be
 * overridden via environment variables without changing service code.
 */

const parseIntOr = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolOr = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const parseListOr = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const parsed = String(value)
    .split(',')
    .map(v => v.trim().toUpperCase())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
};

const parseIntListOr = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  const parsed = String(value)
    .split(',')
    .map(v => parseInt(v.trim(), 10))
    .filter(Number.isFinite);

  return parsed.length > 0 ? parsed : fallback;
};

const requirementAdapterPolicy = {
  cart: {
    maxQuantityPerItem: parseIntOr(process.env.CART_MAX_QUANTITY_PER_ITEM, 99),
    maxTotalQuantity: parseIntOr(process.env.CART_MAX_TOTAL_QUANTITY, 500),
    maxDistinctItems: parseIntOr(process.env.CART_MAX_DISTINCT_ITEMS, 100),
    allowedCurrencies: parseListOr(process.env.CART_ALLOWED_CURRENCIES, ['USD']),
    warnAtPercentOfLimit: parseIntOr(process.env.CART_WARN_AT_PERCENT, 85),
    allowedStoreIds: parseIntListOr(process.env.CART_ALLOWED_STORE_IDS, []),
    blockedStoreIds: parseIntListOr(process.env.CART_BLOCKED_STORE_IDS, []),
    allowedProductTypes: parseListOr(process.env.CART_ALLOWED_PRODUCT_TYPES, []),
    blockedProductTypes: parseListOr(process.env.CART_BLOCKED_PRODUCT_TYPES, []),
  },
  checkout: {
    maxStoresPerCheckout: parseIntOr(process.env.CHECKOUT_MAX_STORES, 20),
    requireItemsInStock: parseBoolOr(process.env.CHECKOUT_REQUIRE_ITEMS_IN_STOCK, true),
    maxSubtotalCents: parseIntOr(process.env.CHECKOUT_MAX_SUBTOTAL_CENTS, 1000000),
    allowedStoreIds: parseIntListOr(process.env.CHECKOUT_ALLOWED_STORE_IDS, []),
    blockedStoreIds: parseIntListOr(process.env.CHECKOUT_BLOCKED_STORE_IDS, []),
    allowedProductTypes: parseListOr(process.env.CHECKOUT_ALLOWED_PRODUCT_TYPES, []),
    blockedProductTypes: parseListOr(process.env.CHECKOUT_BLOCKED_PRODUCT_TYPES, []),
  },
};

module.exports = {
  requirementAdapterPolicy,
};
