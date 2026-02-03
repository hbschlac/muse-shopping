/**
 * Cart API Integration Tests
 * Tests the multi-store shopping cart functionality
 */

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

describe('Cart API', () => {
  let authToken;
  let testUserId;

  // Test data
  const testUser = {
    email: `cart.test.${Date.now()}@muse.com`,
    password: 'TestPass123!',
    username: `carttest${Date.now()}`,
    full_name: 'Cart Test User',
  };

  const nordstromDress = {
    storeId: 2, // Nordstrom
    productName: 'Black Cocktail Dress',
    productSku: 'NORD-DRESS-001',
    productUrl: 'https://nordstrom.com/product/123',
    productImageUrl: 'https://nordstrom.com/dress.jpg',
    priceCents: 8900,
    originalPriceCents: 12900,
    size: 'M',
    color: 'Black',
    quantity: 1,
  };

  const targetSneakers = {
    storeId: 4, // Target
    productName: 'White Sneakers',
    productSku: 'TGT-SHOES-001',
    productUrl: 'https://target.com/product/456',
    priceCents: 4999,
    size: '8',
    color: 'White',
    quantity: 1,
  };

  const nordstromBoots = {
    storeId: 2, // Nordstrom
    productName: 'Leather Boots',
    productSku: 'NORD-BOOTS-001',
    productUrl: 'https://nordstrom.com/boots',
    priceCents: 15900,
    size: '8',
    color: 'Brown',
    quantity: 1,
  };

  // Setup: Create test user and authenticate
  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    authToken = response.body.data.tokens.access_token;
    testUserId = response.body.data.user.id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    // Clean up cart items
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [testUserId]);

    // Clean up test user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);

    // Close database connection
    await pool.end();
  });

  describe('POST /api/v1/cart/items - Add item to cart', () => {
    test('should add item from Nordstrom to cart', async () => {
      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nordstromDress);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item added to cart');
      expect(response.body.data).toMatchObject({
        productName: nordstromDress.productName,
        priceCents: nordstromDress.priceCents,
        quantity: 1,
        size: 'M',
        color: 'Black',
      });
      expect(response.body.data.priceDisplay).toBe('$89.00');
      expect(response.body.data.discountPercent).toBe(31); // (12900-8900)/12900 = 31%
    });

    test('should add item from Target to cart (different store)', async () => {
      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(targetSneakers);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productName).toBe(targetSneakers.productName);
      expect(response.body.data.priceDisplay).toBe('$49.99');
    });

    test('should add another item from Nordstrom', async () => {
      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nordstromBoots);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productName).toBe(nordstromBoots.productName);
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/cart/items')
        .send(nordstromDress);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should fail with missing required fields', async () => {
      const invalidItem = {
        storeId: 2,
        productName: 'Test Product',
        // Missing productUrl and priceCents
      };

      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItem);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should increase quantity if same item added again', async () => {
      // Add the same dress again
      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nordstromDress);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(2); // Should be 2 now
    });
  });

  describe('GET /api/v1/cart - Get user cart', () => {
    test('should get cart grouped by stores', async () => {
      const response = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stores).toHaveLength(2); // Nordstrom and Target

      // Check Nordstrom store
      const nordstromStore = response.body.data.stores.find(
        s => s.storeName === 'Nordstrom'
      );
      expect(nordstromStore).toBeDefined();
      expect(nordstromStore.items).toHaveLength(2); // Dress and Boots
      expect(nordstromStore.itemCount).toBe(3); // 2 dresses + 1 boots
      expect(['redirect', 'headless']).toContain(nordstromStore.integrationType);

      // Check Target store
      const targetStore = response.body.data.stores.find(
        s => s.storeName === 'Target'
      );
      expect(targetStore).toBeDefined();
      expect(targetStore.items).toHaveLength(1); // Sneakers
      expect(targetStore.itemCount).toBe(1);
      expect(['redirect', 'oauth']).toContain(targetStore.integrationType);
    });

    test('should include cart summary', async () => {
      const response = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.summary).toMatchObject({
        totalStoreCount: 2,
        totalItemCount: 4, // 2 dresses + 1 boots + 1 sneakers
      });

      // Total: (8900 * 2) + 15900 + 4999 = 38699 cents = $386.99
      expect(response.body.data.summary.totalCents).toBe(38699);
      expect(response.body.data.summary.totalDisplay).toBe('$386.99');
    });
  });

  describe('GET /api/v1/cart/summary - Get cart summary', () => {
    test('should get cart summary only', async () => {
      const response = await request(app)
        .get('/api/v1/cart/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalStoreCount: 2,
        totalItemCount: 4,
        totalDisplay: '$386.99',
      });
    });
  });

  describe('PATCH /api/v1/cart/items/:id/quantity - Update item quantity', () => {
    let dressItemId;

    beforeAll(async () => {
      // Get the dress item ID
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      const nordstromStore = cartResponse.body.data.stores.find(
        s => s.storeName === 'Nordstrom'
      );
      const dressItem = nordstromStore.items.find(
        item => item.productSku === 'NORD-DRESS-001'
      );
      dressItemId = dressItem.id;
    });

    test('should update item quantity to 1', async () => {
      const response = await request(app)
        .patch(`/api/v1/cart/items/${dressItemId}/quantity`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(1);
      expect(response.body.data.totalPriceDisplay).toBe('$89.00');
    });

    test('should fail with invalid quantity', async () => {
      const response = await request(app)
        .patch(`/api/v1/cart/items/${dressItemId}/quantity`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/cart/items/check - Check if item exists', () => {
    test('should find existing item in cart', async () => {
      const response = await request(app)
        .get('/api/v1/cart/items/check')
        .query({
          storeId: 2,
          productSku: 'NORD-DRESS-001',
          size: 'M',
          color: 'Black',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(response.body.data.item).toBeDefined();
      expect(response.body.data.item.productName).toBe('Black Cocktail Dress');
    });

    test('should not find non-existent item', async () => {
      const response = await request(app)
        .get('/api/v1/cart/items/check')
        .query({
          storeId: 2,
          productSku: 'NON-EXISTENT-SKU',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      expect(response.body.data.item).toBeNull();
    });
  });

  describe('DELETE /api/v1/cart/items/:id - Remove item from cart', () => {
    let bootsItemId;

    beforeAll(async () => {
      // Get the boots item ID
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      const nordstromStore = cartResponse.body.data.stores.find(
        s => s.storeName === 'Nordstrom'
      );
      const bootsItem = nordstromStore.items.find(
        item => item.productSku === 'NORD-BOOTS-001'
      );
      bootsItemId = bootsItem.id;
    });

    test('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/v1/cart/items/${bootsItemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item removed from cart');
    });

    test('should verify item was removed', async () => {
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      const nordstromStore = cartResponse.body.data.stores.find(
        s => s.storeName === 'Nordstrom'
      );
      expect(nordstromStore.items).toHaveLength(1); // Only dress left
      expect(nordstromStore.items[0].productSku).toBe('NORD-DRESS-001');
    });

    test('should fail with non-existent item ID', async () => {
      const response = await request(app)
        .delete('/api/v1/cart/items/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/cart - Clear cart', () => {
    test('should clear entire cart', async () => {
      const response = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemsRemoved).toBeGreaterThan(0);
    });

    test('should verify cart is empty', async () => {
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.status).toBe(200);
      expect(cartResponse.body.data.stores).toHaveLength(0);
      expect(cartResponse.body.data.summary.totalItemCount).toBe(0);
      expect(cartResponse.body.data.summary.totalCents).toBe(0);
    });
  });

  describe('POST /api/v1/cart/items/batch - Add multiple items', () => {
    test('should add multiple items at once', async () => {
      const items = [nordstromDress, targetSneakers, nordstromBoots];

      const response = await request(app)
        .post('/api/v1/cart/items/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.added).toBe(3);
      expect(response.body.data.summary.failed).toBe(0);
    });

    test('should verify all items were added', async () => {
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.body.data.stores).toHaveLength(2);
      expect(cartResponse.body.data.summary.totalItemCount).toBe(3);
    });
  });
});
