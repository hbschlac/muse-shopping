# Loyalty Points & In-App Checkout Flow

## Visual Flow Diagram

```
╔═══════════════════════════════════════════════════════════════════════╗
║                          USER SHOPPING JOURNEY                         ║
╚═══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  1. User Adds Items to Cart from Multiple Stores                   │
│                                                                     │
│  Cart:                                                              │
│  ┌────────────────────────────────────────────┐                    │
│  │ Store A (OAuth + Checkout) - $50           │                    │
│  │ Store B (OAuth + Checkout) - $75           │                    │
│  │ Store C (OAuth + Checkout) - $100          │                    │
│  └────────────────────────────────────────────┘                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. User Clicks "Checkout"                                          │
│                                                                     │
│  System calls: CheckoutService.initiateCheckout(userId)            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
╔═══════════════════════════════════════════════════════════════════════╗
║  CHECKPOINT 1: Session Creation Validation                            ║
║  Location: checkoutService.js:47-87                                   ║
╚═══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  For each store in cart:                                            │
│                                                                     │
│  Store A:                                                           │
│  ✓ Get store config from database                                  │
│  ✓ Determine placement method (oauth + checkout = 'api')           │
│  ✓ Check if 'api' or 'headless' → PASS ✓                          │
│  ✓ Check user connection → getConnection(userId, storeId)          │
│    - isConnected: true ✓                                           │
│    - accountEmail: "user@example.com" ✓                            │
│  ✓ Add to storesToProcess                                          │
│                                                                     │
│  Store B:                                                           │
│  ✓ Get store config from database                                  │
│  ✓ Determine placement method (oauth + checkout = 'api')           │
│  ✓ Check if 'api' or 'headless' → PASS ✓                          │
│  ✓ Check user connection → getConnection(userId, storeId)          │
│    - isConnected: true ✓                                           │
│    - accountEmail: "user@example.com" ✓                            │
│  ✓ Add to storesToProcess                                          │
│                                                                     │
│  Store C:                                                           │
│  ✓ Get store config from database                                  │
│  ✓ Determine placement method (oauth + checkout = 'api')           │
│  ✓ Check if 'api' or 'headless' → PASS ✓                          │
│  ✓ Check user connection → getConnection(userId, storeId)          │
│    - isConnected: true ✓                                           │
│    - accountEmail: "user@example.com" ✓                            │
│  ✓ Add to storesToProcess                                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Validation Complete!                                               │
│  ✓ All stores are 'api' or 'headless' (in-app checkout)           │
│  ✓ User is connected to all stores (loyalty guaranteed)            │
│  ✓ Create checkout session                                         │
│                                                                     │
│  Session Created: cs_abc123                                         │
│  └─ userId: 789                                                     │
│  └─ storesToProcess: [                                              │
│       { storeId: 1, placementMethod: 'api', hasLoyaltyAccount: true },
│       { storeId: 2, placementMethod: 'api', hasLoyaltyAccount: true },
│       { storeId: 3, placementMethod: 'api', hasLoyaltyAccount: true }
│     ]                                                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. User Adds Shipping Address                                      │
│                                                                     │
│  POST /api/checkout/cs_abc123/shipping                              │
│  Body: { name, address1, city, state, zip, country }               │
│                                                                     │
│  ✓ Address validated and saved                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. User Adds Per-Store Payment Methods                             │
│                                                                     │
│  POST /api/checkout/cs_abc123/store-payment-methods                 │
│  Body: {                                                            │
│    paymentMethods: {                                                │
│      "1": "pm_store_a_token_xyz",                                   │
│      "2": "pm_store_b_token_abc",                                   │
│      "3": "pm_store_c_token_def"                                    │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  ✓ Payment methods saved to session                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. User Clicks "Place Orders"                                      │
│                                                                     │
│  System calls: CheckoutService.placeOrders(sessionId, userId)       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
╔═══════════════════════════════════════════════════════════════════════╗
║  CHECKPOINT 2: Pre-Placement Validation                               ║
║  Location: checkoutService.js:186-189                                 ║
╚═══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  validateSessionForPlacement(session):                              │
│  ✓ Shipping address exists                                          │
│  ✓ Session status is 'pending'                                      │
│  ✓ Session not expired                                              │
│                                                                     │
│  validateStoresForInAppCheckout(session):                           │
│  For each store:                                                    │
│    ✓ Placement method is 'api' or 'headless'                       │
│    ✓ Retailer payment method exists in session.paymentMethods      │
│                                                                     │
│  All checks passed! ✓                                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. Check if Stripe Capture Needed                                  │
│                                                                     │
│  hasMuseMORStores = storesToProcess.some(s => s.placementMethod === 'muse')
│  → false (all stores are retailer-MOR)                              │
│                                                                     │
│  ✓ Skip Stripe capture - Payment goes directly to retailers        │
│  Log: "All stores are retailer-MOR; skipping Muse payment capture" │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. Create Order Records                                            │
│                                                                     │
│  For each store:                                                    │
│  ✓ Generate Muse order number (MO-ABC123)                          │
│  ✓ Insert into 'orders' table                                      │
│  ✓ Insert order items into 'order_items' table                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
╔═══════════════════════════════════════════════════════════════════════╗
║  CHECKPOINT 3: Place Orders with Retailers (Parallel)                 ║
║  Location: checkoutService.js:213 & 400-470                           ║
╚═══════════════════════════════════════════════════════════════════════╝

                      ┌──────────────┐
                      │ Order Store A│
                      └──────┬───────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ Store A  │ │ Store B  │ │ Store C  │
         │ Order    │ │ Order    │ │ Order    │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              ▼            ▼            ▼

┌─────────────────────────────────────────────────────────────────────┐
│  For Store A Order (placeOrderViaAPI):                              │
│                                                                     │
│  1. Get OAuth connection:                                           │
│     connection = getConnection(userId, storeId)                     │
│     ✓ isConnected: true                                            │
│     ✓ accountEmail: "user@example.com"                             │
│     ✓ customerIdentifier: "CUST-12345"                             │
│                                                                     │
│  2. Log authentication details:                                     │
│     "Placing order MO-ABC123 using authenticated account:           │
│      Connected account email: user@example.com                      │
│      Customer ID: CUST-12345                                        │
│      Loyalty points and account benefits will be applied."          │
│                                                                     │
│  3. Get access token (auto-refresh if needed):                      │
│     accessToken = getAccessToken(userId, storeId)                   │
│                                                                     │
│  4. Get retailer API client:                                        │
│     apiClient = RetailerAPIFactory.getClient(storeId, { accessToken })
│                                                                     │
│  5. Get payment method from session:                                │
│     paymentMethodId = session.paymentMethods["1"]                   │
│     → "pm_store_a_token_xyz"                                        │
│                                                                     │
│  6. Place order with retailer:                                      │
│     orderResult = apiClient.createOrder({                           │
│       items: [...],                                                 │
│       shippingAddress: {...},                                       │
│       paymentMethodId: "pm_store_a_token_xyz"                       │
│     })                                                              │
│                                                                     │
│  7. Retailer processes order:                                       │
│     - Uses authenticated account (CUST-12345)                       │
│     - Charges retailer payment method                               │
│     - Awards loyalty points automatically                           │
│     - Applies member discounts                                      │
│     - Returns order details:                                        │
│       {                                                             │
│         orderNumber: "RETAILER-67890",                              │
│         trackingNumber: "TRACK-123",                                │
│         total: 5000,                                                │
│         loyaltyPoints: 150,                                         │
│         memberDiscount: 500                                         │
│       }                                                             │
│                                                                     │
│  8. Log success:                                                    │
│     "Order placed successfully: RETAILER-67890.                     │
│      Order placed using user's connected account."                  │
│                                                                     │
│  9. Return result with account info:                                │
│     {                                                               │
│       storeOrderNumber: "RETAILER-67890",                           │
│       success: true,                                                │
│       trackingNumber: "TRACK-123",                                  │
│       total: 5000,                                                  │
│       accountInfo: {                                                │
│         connectedAccountEmail: "user@example.com",                  │
│         customerIdentifier: "CUST-12345",                           │
│         loyaltyPointsEarned: 150,                                   │
│         memberDiscountApplied: 500                                  │
│       }                                                             │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘

         [Same process for Store B and Store C in parallel]

                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. Update Order Records                                            │
│                                                                     │
│  For each order:                                                    │
│  ✓ Update status to 'placed'                                       │
│  ✓ Store retailer order number                                     │
│  ✓ Store tracking number                                           │
│  ✓ Store account info in metadata:                                 │
│    {                                                                │
│      accountInfo: {                                                 │
│        connectedAccountEmail: "user@example.com",                   │
│        customerIdentifier: "CUST-12345",                            │
│        loyaltyPointsEarned: 150,                                    │
│        memberDiscountApplied: 500                                   │
│      },                                                             │
│      placementTimestamp: "2024-01-15T10:30:00Z"                     │
│    }                                                                │
│                                                                     │
│  ✓ Log loyalty points earned:                                      │
│    "Order 123 earned 150 loyalty points for user@example.com"      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  9. Clear User Cart                                                 │
│                                                                     │
│  ✓ CartService.clearCart(userId)                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  10. Return Final Results to User                                   │
│                                                                     │
│  Response:                                                          │
│  {                                                                  │
│    checkoutSessionId: "cs_abc123",                                  │
│    orders: [                                                        │
│      {                                                              │
│        orderId: 101,                                                │
│        museOrderNumber: "MO-ABC123",                                │
│        storeOrderNumber: "STORE-A-67890",                           │
│        status: "placed",                                            │
│        accountInfo: {                                               │
│          connectedAccountEmail: "user@example.com",                 │
│          loyaltyPointsEarned: 150,                                  │
│          memberDiscountApplied: 500                                 │
│        }                                                            │
│      },                                                             │
│      {                                                              │
│        orderId: 102,                                                │
│        museOrderNumber: "MO-DEF456",                                │
│        storeOrderNumber: "STORE-B-12345",                           │
│        status: "placed",                                            │
│        accountInfo: {                                               │
│          connectedAccountEmail: "user@example.com",                 │
│          loyaltyPointsEarned: 200,                                  │
│          memberDiscountApplied: 750                                 │
│        }                                                            │
│      },                                                             │
│      {                                                              │
│        orderId: 103,                                                │
│        museOrderNumber: "MO-GHI789",                                │
│        storeOrderNumber: "STORE-C-54321",                           │
│        status: "placed",                                            │
│        accountInfo: {                                               │
│          connectedAccountEmail: "user@example.com",                 │
│          loyaltyPointsEarned: 250,                                  │
│          memberDiscountApplied: 1000                                │
│        }                                                            │
│      }                                                              │
│    ],                                                               │
│    summary: {                                                       │
│      totalOrders: 3,                                                │
│      successfulOrders: 3,                                           │
│      failedOrders: 0,                                               │
│      totalLoyaltyPoints: 600,                                       │
│      totalDiscounts: 2250                                           │
│    }                                                                │
│  }                                                                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🎉 SUCCESS!                                                        │
│                                                                     │
│  ✅ All orders placed via authenticated accounts                    │
│  ✅ Loyalty points earned: 600 total                               │
│  ✅ Member discounts applied: $22.50 total                         │
│  ✅ Orders appear in retailer account history                      │
│  ✅ Payment went directly to retailers (not Stripe)                │
│  ✅ Complete audit trail in logs                                   │
│  ✅ Account info stored in order metadata                          │
└─────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════╗
║                    LOYALTY POINTS GUARANTEED ✨                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## Error Scenarios

### Scenario 1: User Not Connected to a Store
```
Cart has Store A (connected) + Store B (NOT connected)
  ↓
Click "Checkout"
  ↓
BLOCKED at Checkpoint 1 ❌
  ↓
Error: "You must connect your account with Store B to checkout.
        This ensures you receive loyalty points and account benefits."
  ↓
User clicks "Connect to Store B"
  ↓
OAuth flow completes
  ↓
User returns and clicks "Checkout" again
  ↓
CHECKPOINT 1 PASSES ✅
  ↓
Checkout proceeds
```

### Scenario 2: Store Doesn't Support In-App Checkout
```
Cart has Store A (oauth+checkout) + Store C (manual/redirect)
  ↓
Click "Checkout"
  ↓
BLOCKED at Checkpoint 1 ❌
  ↓
Error: "These stores are not configured for in-app checkout: Store C"
  ↓
User must remove Store C from cart OR wait for Store C integration
```

### Scenario 3: Missing Retailer Payment Method
```
User connected to all stores ✅
All stores support in-app checkout ✅
User adds shipping address ✅
User clicks "Place Orders" (forgot to add payment methods!)
  ↓
BLOCKED at Checkpoint 2 ❌
  ↓
Error: "No retailer payment method found for Store A.
        Each store requires a saved payment method at the retailer."
  ↓
User adds payment methods
  ↓
CHECKPOINT 2 PASSES ✅
  ↓
Orders placed successfully
```

---

**Every order, every time: Your loyalty points are guaranteed!** 🎊
