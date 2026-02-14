const RequirementAdapterService = require('../../src/services/requirementAdapterService');

describe('RequirementAdapterService', () => {
  test('returns policy snapshot with cart and checkout sections', () => {
    const policy = RequirementAdapterService.getPolicySnapshot();

    expect(policy).toHaveProperty('cart');
    expect(policy).toHaveProperty('checkout');
    expect(policy.cart).toHaveProperty('maxQuantityPerItem');
    expect(policy.checkout).toHaveProperty('maxStoresPerCheckout');
  });

  test('normalizes store IDs and product types', () => {
    expect(RequirementAdapterService.normalizeStoreId('12')).toBe(12);
    expect(RequirementAdapterService.normalizeStoreId('bad')).toBeNull();
    expect(RequirementAdapterService.normalizeProductType(' final_sale ')).toBe('FINAL_SALE');
  });

  test('extracts product type from nested metadata', () => {
    expect(
      RequirementAdapterService.extractItemProductType({ metadata: { product_type: 'digital' } })
    ).toBe('DIGITAL');
  });

  test('evaluates checkout cart as passing when within policy', () => {
    const evaluation = RequirementAdapterService.evaluateCheckoutCart({
      stores: [
        {
          storeId: 1,
          items: [{ inStock: true }],
        },
      ],
      summary: {
        subtotalCents: 10000,
      },
    });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.blockers).toHaveLength(0);
  });

  test('blocks checkout cart when out-of-stock items are present and policy requires in stock', () => {
    const evaluation = RequirementAdapterService.evaluateCheckoutCart({
      stores: [
        {
          storeId: 1,
          items: [{ inStock: false }],
        },
      ],
      summary: {
        subtotalCents: 10000,
      },
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.blockers).toContain('out_of_stock_items_present');
  });

  test('builds cart requirement warnings at high utilization', () => {
    const policy = RequirementAdapterService.getPolicySnapshot();
    const nearTotalItems = Math.ceil(policy.cart.maxTotalQuantity * 0.9);
    const nearDistinctItems = Math.ceil(policy.cart.maxDistinctItems * 0.9);

    const state = RequirementAdapterService.buildCartRequirementState({
      totalItemCount: nearTotalItems,
      totalDistinctItems: nearDistinctItems,
    });

    expect(state.warnings).toContain('approaching_total_quantity_limit');
    expect(state.warnings).toContain('approaching_distinct_item_limit');
  });

  test('evaluates blocked store and blocked product type policies', () => {
    const checkoutPolicy = RequirementAdapterService.getPolicySnapshot().checkout;

    const originalBlockedStores = [...checkoutPolicy.blockedStoreIds];
    const originalBlockedTypes = [...checkoutPolicy.blockedProductTypes];

    checkoutPolicy.blockedStoreIds = [42];
    checkoutPolicy.blockedProductTypes = ['DIGITAL'];

    try {
      const evaluation = RequirementAdapterService.evaluateCheckoutCart({
        stores: [
          {
            storeId: 42,
            items: [{ inStock: true, metadata: { productType: 'digital' } }],
          },
        ],
        summary: { subtotalCents: 5000 },
      });

      expect(evaluation.passed).toBe(false);
      expect(evaluation.blockers).toContain('store_blocked');
      expect(evaluation.blockers).toContain('product_type_blocked');
      expect(evaluation.details.storeRules).toHaveLength(1);
      expect(evaluation.details.productTypeRules).toHaveLength(1);
    } finally {
      checkoutPolicy.blockedStoreIds = originalBlockedStores;
      checkoutPolicy.blockedProductTypes = originalBlockedTypes;
    }
  });

  test('evaluates allowlist constraints for store and product type', () => {
    const checkoutPolicy = RequirementAdapterService.getPolicySnapshot().checkout;

    const originalAllowedStores = [...checkoutPolicy.allowedStoreIds];
    const originalAllowedTypes = [...checkoutPolicy.allowedProductTypes];

    checkoutPolicy.allowedStoreIds = [7];
    checkoutPolicy.allowedProductTypes = ['APPAREL'];

    try {
      const evaluation = RequirementAdapterService.evaluateCheckoutCart({
        stores: [
          {
            storeId: 8,
            items: [{ inStock: true, metadata: { product_type: 'beauty' } }],
          },
        ],
        summary: { subtotalCents: 5000 },
      });

      expect(evaluation.passed).toBe(false);
      expect(evaluation.blockers).toContain('store_not_allowed');
      expect(evaluation.blockers).toContain('product_type_not_allowed');
    } finally {
      checkoutPolicy.allowedStoreIds = originalAllowedStores;
      checkoutPolicy.allowedProductTypes = originalAllowedTypes;
    }
  });
});
