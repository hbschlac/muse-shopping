# Retailer Merchant-of-Record (MOR) Checkout Implementation

## Summary
All changes have been applied to enforce **in-app checkout only** where the **retailer is the merchant-of-record** for all cart orders.

## Key Requirements Implemented

### 1. ✅ Block Session Creation if Any Store Not In-App
**File:** `src/services/checkoutService.js:47-67`

- After building `storesToProcess` array, we now validate each store's placement method
- Blocks session creation if any store has placement method other than `'api'` or `'headless'`
- Error message clearly identifies which stores are not configured for in-app checkout

```javascript
// CRITICAL: Block session creation if any store not in-app
const blocked = storesToProcess.filter(store => !['api', 'headless'].includes(store.placementMethod));
if (blocked.length > 0) {
  const names = blocked.map(s => s.storeName || s.storeSlug || s.storeId).join(', ');
  throw new ValidationError(`These stores are not configured for in-app checkout: ${names}`);
}
```

### 2. ✅ Validate All Stores Before Placing Orders
**File:** `src/services/checkoutService.js:161-162` & `734-761`

- New method `validateStoresForInAppCheckout(session)` validates all stores in the checkout session
- Called in `placeOrders()` immediately after `validateSessionForPlacement()`
- Performs two critical checks for each store:
  1. **Placement method must be 'api' or 'headless'** - Rejects any store not in these categories
  2. **Requires retailer payment method token** - Each in-app store MUST have a saved payment method at the retailer

```javascript
// Validate all stores for in-app checkout
await this.validateStoresForInAppCheckout(session);
```

### 3. ✅ Per-Store Payment Methods
**Files:**
- `src/services/checkoutService.js:145-170` (new method `addStorePaymentMethods`)
- `src/services/checkoutService.js:473-479` (use per-store payment method in API orders)
- `src/services/checkoutService.js:833` (include in `formatCheckoutSession`)
- `migrations/053_add_payment_methods_to_checkout_sessions.sql` (database migration)

**New Method Added:**
```javascript
static async addStorePaymentMethods(sessionId, userId, paymentMethods)
```

**Usage in API Orders:**
```javascript
// Get payment method from session (per-store retailer payment method)
const paymentMethodId = session.paymentMethods?.[String(order.store_id)];

if (!paymentMethodId) {
  throw new Error(`No payment method found for store ID ${order.store_id}`);
}
```

**Database Schema:**
```sql
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}';
```

Format: `{ "storeId": "paymentMethodToken", "123": "pm_xxx", "456": "pm_yyy" }`

### 4. ✅ Store Placement Method Uses Store Config
**File:** `src/services/checkoutService.js:764-803`

Two new methods:
1. **`getStoreConfig(storeId)`** - Fetches store configuration from database
2. **`determinePlacementMethod({ integrationType, supportsCheckout })`** - Determines placement method based on store config

**Placement Method Logic:**
- `'api'` - OAuth integration with checkout support (retailer-MOR)
- `'headless'` - API integration with checkout support (retailer-MOR)
- `'manual'` - Manual or redirect integrations (NOT supported in retailer-MOR mode)
- `'muse'` - Would be Muse-MOR (NOT used in this implementation)

```javascript
static determinePlacementMethod({ integrationType, supportsCheckout }) {
  // Retailer is merchant-of-record for api/headless
  if (integrationType === 'oauth' && supportsCheckout) {
    return 'api';
  }

  if (integrationType === 'api' && supportsCheckout) {
    return 'headless';
  }

  // Manual or redirect means Muse would be MOR (not supported in retailer-MOR mode)
  if (integrationType === 'manual' || integrationType === 'redirect') {
    return 'manual';
  }

  // Default fallback
  return 'manual';
}
```

### 5. ✅ Stripe Capture Only for Muse-MOR Stores
**File:** `src/services/checkoutService.js:165-177`

Modified `placeOrders()` to conditionally capture payment:
- Checks if any stores have `placementMethod === 'muse'`
- Only calls `capturePayment()` if Muse-MOR stores exist
- For retailer-MOR stores (api/headless), payment goes directly to retailer, NOT through Stripe

```javascript
// Step 1: Capture payment from customer (only for Muse-MOR stores)
// With retailer-MOR, payment goes directly to retailer, not through Muse/Stripe
const hasMuseMORStores = session.storesToProcess.some(store => store.placementMethod === 'muse');

if (hasMuseMORStores) {
  const paymentResult = await this.capturePayment(session);

  if (!paymentResult.success) {
    await this.updateSessionStatus(sessionId, 'failed');
    throw new PaymentError(paymentResult.error || 'Payment failed');
  }
} else {
  logger.info('All stores are retailer-MOR; skipping Muse payment capture');
}
```

## Database Migration

**File:** `migrations/053_add_payment_methods_to_checkout_sessions.sql`

Run this migration to add the `payment_methods` column to the `checkout_sessions` table:

```bash
psql $DATABASE_URL -f migrations/053_add_payment_methods_to_checkout_sessions.sql
```

## API Usage

### Initiate Checkout with Per-Store Payment Methods

1. **Initiate Checkout**
   ```javascript
   POST /api/checkout/initiate
   ```

2. **Add Shipping Address**
   ```javascript
   POST /api/checkout/:sessionId/shipping
   Body: { name, address1, city, state, zip, country }
   ```

3. **Add Per-Store Payment Methods**
   ```javascript
   POST /api/checkout/:sessionId/store-payment-methods
   Body: {
     paymentMethods: {
       "123": "pm_retailer_token_store_123",
       "456": "pm_retailer_token_store_456"
     }
   }
   ```

4. **Place Orders**
   ```javascript
   POST /api/checkout/:sessionId/place-orders
   ```

## Validation Flow

```
Cart → Checkout Session Creation
  ↓
  Check each store's placement method
  ↓
  Block if any store is NOT 'api' or 'headless'
  ↓
  User adds shipping address
  ↓
  User adds per-store payment methods
  ↓
  Place Orders
  ↓
  Validate all stores again (placement method + payment method)
  ↓
  Skip Stripe capture (retailer-MOR)
  ↓
  Place orders with retailers using their payment methods
```

## Testing Checklist

- [ ] Run database migration
- [ ] Test cart with all in-app stores (should succeed)
- [ ] Test cart with mixed stores (should block at session creation)
- [ ] Test cart with manual/redirect stores (should block at session creation)
- [ ] Test order placement without per-store payment methods (should fail validation)
- [ ] Test order placement with per-store payment methods (should succeed)
- [ ] Verify Stripe is NOT called for retailer-MOR orders
- [ ] Verify payment goes directly to retailer

## Files Modified

1. `src/services/checkoutService.js` - Core checkout logic
2. `migrations/053_add_payment_methods_to_checkout_sessions.sql` - Database schema

## Loyalty Points & Account Benefits

### ✅ Implemented Features

All orders are placed **using the user's connected account** at each retailer, ensuring:

1. **Automatic Loyalty Points** - Points are earned because orders are placed through the user's authenticated account
2. **Member Discounts Applied** - Account-specific discounts and benefits are automatically applied
3. **Order History Tracked** - Orders appear in the retailer's system under the user's account
4. **Connection Validation** - Session creation is blocked if user is not connected to all stores

### Implementation Details

#### 1. Connection Validation at Session Creation
**Location:** `src/services/checkoutService.js:73-87`

Before creating a checkout session, we validate that the user is connected to **every** store in their cart:

```javascript
// CRITICAL: Validate user is connected to each store (for loyalty points & account benefits)
for (const store of storesToProcess) {
  const connection = await StoreConnectionService.getConnection(userId, store.storeId);

  if (!connection || !connection.isConnected) {
    throw new ValidationError(
      `You must connect your account with ${store.storeName || store.storeSlug} to checkout. ` +
      `This ensures you receive loyalty points and account benefits.`
    );
  }

  logger.info(
    `User ${userId} connected to store ${store.storeId} (${store.storeName}): ` +
    `Order will be placed using authenticated account for loyalty points`
  );
}
```

#### 2. Connection Info Included in Session
**Location:** `src/services/checkoutService.js:64-68`

Each store in `storesToProcess` now includes:
- `connectedAccountEmail` - Email address user uses at that retailer
- `hasLoyaltyAccount` - Boolean indicating if connected for loyalty tracking

#### 3. Explicit Logging During Order Placement
**Location:** `src/services/checkoutService.js:417-423`

When placing each order, we log detailed connection information:

```javascript
logger.info(
  `Placing order ${order.muse_order_number} using authenticated account for user ${session.userId}: ` +
  `Connected account email: ${connection.accountEmail || 'N/A'}, ` +
  `Customer ID: ${connection.customerIdentifier || 'N/A'}. ` +
  `Loyalty points and account benefits will be automatically applied.`
);
```

#### 4. Loyalty Info in Order Response
**Location:** `src/services/checkoutService.js:453-461`

Order placement results include account information:

```javascript
return {
  storeOrderNumber: orderResult.orderNumber,
  success: true,
  trackingNumber: orderResult.trackingNumber,
  total: orderResult.total,
  accountInfo: {
    connectedAccountEmail: connection.accountEmail,
    customerIdentifier: connection.customerIdentifier,
    loyaltyPointsEarned: orderResult.loyaltyPoints || null,
    memberDiscountApplied: orderResult.memberDiscount || null,
  },
};
```

#### 5. Account Info Stored in Order Metadata
**Location:** `src/services/checkoutService.js:706-726`

Order records include loyalty information in metadata:

```javascript
const metadata = {
  accountInfo: result.accountInfo || {},
  placementTimestamp: new Date().toISOString(),
};
```

### Response Format

When orders are placed, the response includes:

```json
{
  "checkoutSessionId": "cs_xxx",
  "orders": [
    {
      "orderId": 123,
      "museOrderNumber": "MO-XXXXX",
      "storeOrderNumber": "RETAILER-12345",
      "status": "placed",
      "placedAt": "2024-01-15T10:30:00Z",
      "accountInfo": {
        "connectedAccountEmail": "user@example.com",
        "customerIdentifier": "CUST-789",
        "loyaltyPointsEarned": 150,
        "memberDiscountApplied": 500
      }
    }
  ],
  "summary": {
    "totalOrders": 2,
    "successfulOrders": 2,
    "failedOrders": 0
  }
}
```

### User Experience Flow

1. **Add items to cart** from multiple stores
2. **Click checkout** → System validates user is connected to all stores
3. **If not connected** → User is prompted to connect their account (with explanation that it's needed for loyalty points)
4. **Add shipping address** → Standard flow
5. **Add payment methods** → Per-store retailer payment methods
6. **Place orders** → Each order placed using authenticated account
7. **Confirmation** → Shows loyalty points earned for each store

### Frontend Integration

The frontend should:

1. **Display connection status** for each store in cart
2. **Show loyalty benefits** - "✓ Connected - You'll earn loyalty points"
3. **Prompt to connect** - "Connect your account to earn loyalty points"
4. **Show points earned** in order confirmation

### Error Messages

Clear, user-friendly messages explain why connection is required:

- ❌ "You must connect your account with [Store Name] to checkout. This ensures you receive loyalty points and account benefits."
- ✓ "Connected to [Store Name] - You'll earn loyalty points on this order"

## Next Steps

1. **Run the migration** to add `payment_methods` column
2. **Add route handler** for `POST /api/checkout/:sessionId/store-payment-methods`
3. **Frontend integration** to:
   - Display connection status for each store in cart
   - Show loyalty benefits messaging
   - Collect per-store payment methods
   - Display loyalty points earned in confirmation
4. **Test with actual retailer APIs** to verify payment processing and loyalty point tracking
5. **Add logging dashboard** to track:
   - Orders placed via connected accounts
   - Loyalty points earned per user/store
   - Connection success rates
