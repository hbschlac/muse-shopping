# OAuth-First Checkout Architecture - The Correct Approach ✅

## Core Principle

**Muse is a PLATFORM, not a MERCHANT**

- Retailers remain the merchant of record
- Payments go directly to retailers
- Credit card statements show retailer name (not Muse)
- Store membership benefits preserved
- Returns handled by retailers

---

## User Experience Requirements

### 1. Store Account Connection (One-Time Setup)
```
User goes to Settings → Connected Stores
Clicks "Connect Nordstrom"
→ Redirects to Nordstrom OAuth login
→ User logs in with Nordstrom credentials
→ Nordstrom asks: "Allow Muse to access your account?"
→ User approves
→ Redirects back to Muse
→ ✅ Nordstrom account connected
```

**Benefits unlocked:**
- Access to saved payment methods
- Access to saved shipping addresses
- Member benefits (free shipping, points, discounts)
- Order history syncing
- One-click checkout

---

### 2. Shopping & Cart
```
User browses Muse
Finds dress on Nordstrom (via Muse)
Clicks "Add to Cart"
→ Added to Muse cart (multi-store cart)

User finds shoes on Macy's
Clicks "Add to Cart"
→ Added to same Muse cart

Cart shows:
┌─────────────────────────┐
│ Nordstrom (connected)   │
│ - Dress $89             │
│ ✓ Free shipping         │
│ ✓ Use saved card        │
└─────────────────────────┘
┌─────────────────────────┐
│ Macy's (connected)      │
│ - Shoes $49             │
│ ✓ Use saved card        │
└─────────────────────────┘
```

---

### 3. Unified Checkout
```
User clicks "Checkout"

Step 1: Verify shipping address
┌─────────────────────────────────┐
│ Ship to:                        │
│ Jane Doe                        │
│ 123 Main St                     │
│ San Francisco, CA 94102         │
│                                 │
│ [Edit Address]                  │
└─────────────────────────────────┘

Step 2: Select payment per store
┌─────────────────────────────────┐
│ Nordstrom                       │
│ ○ Visa •••• 4242 (saved)       │
│ ○ Mastercard •••• 1234 (saved) │
│ ○ Use different card            │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Macy's                          │
│ ○ Visa •••• 4242 (saved)       │
│ ○ Use different card            │
└─────────────────────────────────┘

Step 3: Review & Place Orders
┌─────────────────────────────────┐
│ Nordstrom Order                 │
│ - Dress                    $89  │
│ - Shipping                 FREE │
│ - Tax                     $7.83 │
│ Total                    $96.83 │
│ Charged to: Visa ••4242         │
│ Statement will show: NORDSTROM  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Macy's Order                    │
│ - Shoes                    $49  │
│ - Shipping                $5.95 │
│ - Tax                     $4.32 │
│ Total                    $59.27 │
│ Charged to: Visa ••4242         │
│ Statement will show: MACYS      │
└─────────────────────────────────┘

[Place Both Orders]
```

**User clicks "Place Both Orders"**

Behind the scenes (user doesn't see):
```
Muse API calls Nordstrom API:
POST https://api.nordstrom.com/v1/orders
Authorization: Bearer {user's oauth token}
{
  "items": [{ sku: "...", quantity: 1 }],
  "shippingAddress": { ... },
  "paymentMethodId": "pm_nordstrom_saved_card_1"
}
→ Nordstrom processes payment with user's saved card
→ Returns: Order #NORD-12345678

Simultaneously, Muse calls Macy's API:
POST https://api.macys.com/v1/orders
Authorization: Bearer {user's oauth token}
{
  "items": [{ sku: "...", quantity: 1 }],
  "shippingAddress": { ... },
  "paymentMethodId": "pm_macys_saved_card_1"
}
→ Macy's processes payment with user's saved card
→ Returns: Order #MACYS-87654321
```

**User sees:**
```
✅ Both orders placed successfully!

Nordstrom Order #NORD-12345678
- Tracking: Available in 24 hours
- Total: $96.83 (charged to your Visa ••4242)

Macy's Order #MACYS-87654321
- Tracking: Available in 24 hours
- Total: $59.27 (charged to your Visa ••4242)
```

---

### 4. Credit Card Statement
```
Date        Merchant           Amount
02/03/2026  NORDSTROM         $96.83
02/03/2026  MACYS             $59.27

NOT "MUSE SHOPPING"
```

---

### 5. Returns
```
User wants to return dress

Opens Muse app
Goes to Orders → Nordstrom Order
Clicks "Return Item"

→ Muse redirects to Nordstrom.com return page
→ OR Muse calls Nordstrom API to initiate return
→ Nordstrom processes refund to user's original card
→ Refund shows on statement as "NORDSTROM REFUND"
```

---

## Technical Architecture

### Database Schema Changes

#### 1. Store OAuth Connections
```sql
CREATE TABLE user_store_connections (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  store_id INT NOT NULL REFERENCES stores(id),

  -- OAuth tokens (encrypted)
  oauth_access_token_encrypted TEXT NOT NULL,
  oauth_refresh_token_encrypted TEXT NOT NULL,
  oauth_token_expires_at TIMESTAMP,

  -- Connection status
  is_connected BOOLEAN DEFAULT true,
  connection_status VARCHAR(50), -- 'active', 'expired', 'revoked'

  -- User's info at retailer
  retailer_customer_id VARCHAR(255), -- Store's customer ID
  retailer_email VARCHAR(255), -- Email used at store

  -- Permissions granted
  scopes_granted TEXT[], -- ['orders', 'payment_methods', 'addresses']

  -- Sync status
  last_synced_at TIMESTAMP,

  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, store_id)
);
```

#### 2. Saved Payment Methods (from retailers)
```sql
CREATE TABLE user_saved_payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  store_id INT NOT NULL REFERENCES stores(id),
  user_store_connection_id INT REFERENCES user_store_connections(id),

  -- Payment method reference at retailer
  retailer_payment_method_id VARCHAR(255) NOT NULL,

  -- Display info (safe to store)
  card_brand VARCHAR(50), -- Visa, Mastercard, Amex
  last4 VARCHAR(4),
  exp_month INT,
  exp_year INT,

  -- Card type
  payment_type VARCHAR(50), -- 'card', 'apple_pay', 'paypal'

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Saved Shipping Addresses (from retailers)
```sql
CREATE TABLE user_saved_addresses (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  store_id INT REFERENCES stores(id), -- NULL if multi-store address
  user_store_connection_id INT REFERENCES user_store_connections(id),

  -- Address reference at retailer (if applicable)
  retailer_address_id VARCHAR(255),

  -- Address details
  name VARCHAR(255),
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  phone VARCHAR(50),

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Orders Update
```sql
-- Add to existing orders table
ALTER TABLE orders ADD COLUMN user_store_connection_id INT REFERENCES user_store_connections(id);
ALTER TABLE orders ADD COLUMN retailer_payment_method_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN payment_processed_by VARCHAR(50) DEFAULT 'retailer'; -- 'retailer' not 'muse'
ALTER TABLE orders ADD COLUMN retailer_customer_id VARCHAR(255);
```

---

## OAuth Flow (Step-by-Step)

### 1. Connect Store Account

**Frontend:**
```javascript
// User clicks "Connect Nordstrom"
window.location.href = '/api/v1/oauth/nordstrom/connect';
```

**Backend:**
```javascript
// GET /api/v1/oauth/nordstrom/connect
router.get('/oauth/:storeSlug/connect', (req, res) => {
  const store = getStoreBySlug(req.params.storeSlug);
  const userId = req.userId;

  // Generate OAuth URL
  const authUrl = `https://oauth.nordstrom.com/authorize?` +
    `client_id=${process.env.NORDSTROM_CLIENT_ID}` +
    `&redirect_uri=${process.env.APP_URL}/api/v1/oauth/nordstrom/callback` +
    `&state=${generateState(userId)}` +
    `&scope=orders payment_methods addresses` +
    `&response_type=code`;

  res.redirect(authUrl);
});
```

**User approves on Nordstrom**

**Callback:**
```javascript
// GET /api/v1/oauth/nordstrom/callback?code=xxx&state=yyy
router.get('/oauth/:storeSlug/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = validateState(state);

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  // { access_token, refresh_token, expires_in }

  // Encrypt and store tokens
  await StoreConnectionService.createConnection({
    userId,
    storeId: store.id,
    accessToken: encrypt(tokens.access_token),
    refreshToken: encrypt(tokens.refresh_token),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  });

  // Sync user's data from retailer
  await syncRetailerData(userId, storeId, tokens.access_token);

  res.redirect('/settings/connected-stores?success=true');
});
```

---

### 2. Checkout with OAuth

**New Checkout Flow:**

```javascript
// checkoutService.js - REVISED

static async placeOrders(sessionId, userId) {
  const session = await this.getCheckoutSession(sessionId, userId);

  // NO PAYMENT CAPTURE by Muse
  // Instead, use retailer APIs with OAuth tokens

  const placementResults = [];

  for (const store of session.cartSnapshot.stores) {
    // Get user's OAuth connection to this store
    const connection = await StoreConnectionService.getConnection(userId, store.storeId);

    if (!connection || !connection.isConnected) {
      // User not connected to this store
      placementResults.push({
        storeId: store.storeId,
        status: 'failed',
        error: 'Store account not connected',
      });
      continue;
    }

    // Place order via retailer API using OAuth
    const result = await this.placeOrderViaRetailerAPI(store, session, connection);
    placementResults.push(result);
  }

  return {
    orders: placementResults,
    summary: {
      successful: placementResults.filter(r => r.status === 'success').length,
      failed: placementResults.filter(r => r.status === 'failed').length,
    },
  };
}

static async placeOrderViaRetailerAPI(store, session, connection) {
  // Get retailer API client
  const apiClient = RetailerAPIFactory.getClient(store.storeId, {
    accessToken: decrypt(connection.oauthAccessToken),
  });

  // Place order using retailer's API
  const orderResult = await apiClient.createOrder({
    items: store.items.map(item => ({
      sku: item.productSku,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    })),
    shippingAddress: session.shippingAddress,
    // Use customer's SAVED payment method at retailer
    paymentMethodId: session.selectedPaymentMethods[store.storeId],
    // OR if adding new card, tokenize it first at retailer
  });

  // Save order record
  await this.saveOrder({
    userId,
    storeId: store.storeId,
    museOrderNumber: generateOrderNumber(),
    storeOrderNumber: orderResult.orderId,
    total: orderResult.total,
    status: 'placed',
    paymentProcessedBy: 'retailer', // KEY: Retailer charged card, not Muse
  });

  return {
    storeId: store.storeId,
    status: 'success',
    orderNumber: orderResult.orderId,
    total: orderResult.total,
  };
}
```

---

## Retailer API Integration

### Required APIs per Retailer

**Nordstrom:**
```javascript
class NordstromAPI {
  async createOrder(orderData) {
    const response = await fetch('https://api.nordstrom.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: orderData.items,
        shippingAddress: orderData.shippingAddress,
        paymentMethodId: orderData.paymentMethodId, // User's saved card at Nordstrom
      }),
    });

    return response.json();
    // { orderId: 'NORD-12345', total: 9683, status: 'confirmed' }
  }

  async getPaymentMethods() {
    // Get user's saved cards at Nordstrom
  }

  async getShippingAddresses() {
    // Get user's saved addresses at Nordstrom
  }

  async getOrderStatus(orderId) {
    // Get tracking info
  }

  async initiateReturn(orderId, items) {
    // Start return process
  }
}
```

---

## Apple Pay Integration

For users who want to use Apple Pay:

```javascript
// Frontend (Stripe.js or native Apple Pay)
const paymentRequest = stripe.paymentRequest({
  country: 'US',
  currency: 'usd',
  total: {
    label: 'Nordstrom (via Muse)',
    amount: 9683, // $96.83
  },
  requestPayerName: true,
  requestPayerEmail: true,
});

paymentRequest.on('token', async (ev) => {
  // Get payment method token
  const { token } = ev;

  // Send to backend to use with retailer API
  await fetch('/api/v1/checkout/sessions/cs_xxx/place', {
    method: 'POST',
    body: JSON.stringify({
      stores: {
        nordstrom: {
          paymentMethod: 'apple_pay',
          paymentToken: token.id,
        },
      },
    }),
  });

  ev.complete('success');
});
```

**Backend forwards Apple Pay token to Nordstrom:**
```javascript
await nordstromAPI.createOrder({
  items: [...],
  shippingAddress: {...},
  payment: {
    type: 'apple_pay',
    token: applePayToken, // Nordstrom processes this
  },
});
```

---

## Saved Cards in Muse

**Option 1: Use Retailer's Saved Cards (Recommended)**
- User's cards already saved at Nordstrom
- Muse just displays them and lets user select
- Nordstrom processes payment with their saved card
- ✅ No PCI compliance issues for Muse
- ✅ Shows "NORDSTROM" on statement

**Option 2: Muse as Payment Tokenizer**
- User adds card in Muse (via Stripe or similar)
- Muse tokenizes card
- At checkout, Muse sends token to each retailer
- Each retailer charges the card
- ⚠️ More complex, requires retailer support for external tokens

**Recommended: Option 1**

---

## Key Differences from Previous Architecture

| Aspect | OLD (Wrong) | NEW (Correct) |
|--------|-------------|---------------|
| **Merchant of Record** | Muse | Retailer |
| **Payment Processor** | Muse (Stripe) | Retailer (their system) |
| **CC Statement** | "MUSE SHOPPING" | "NORDSTROM" |
| **Saved Cards** | Muse database | Retailer's saved cards |
| **Free Shipping** | Lost | ✅ Preserved |
| **Store Points** | Lost | ✅ Preserved |
| **Returns** | Muse handles | ✅ Retailer handles |
| **Primary Method** | Manual placement | ✅ OAuth + API |
| **Friction** | High (ops team) | ✅ Low (automated) |

---

## Implementation Priority

### Phase 1: OAuth Foundation (Week 1)
1. Store OAuth connection system
2. Token encryption/storage
3. Connection UI

### Phase 2: Data Sync (Week 2)
1. Sync saved payment methods from retailers
2. Sync saved addresses
3. Display in checkout UI

### Phase 3: First Retailer Integration (Week 3-4)
1. Pick one retailer with API (e.g., Target)
2. Implement full OAuth + order placement flow
3. Test end-to-end

### Phase 4: Scale to More Retailers (Ongoing)
1. Add Nordstrom, Macy's, Walmart
2. Each retailer = new API client
3. Standardize interface

---

## Success Criteria

✅ **User never sees "MUSE" on credit card statement**
✅ **User keeps store membership benefits**
✅ **Checkout happens within Muse interface**
✅ **Returns go through retailer**
✅ **Saved cards work**
✅ **Apple Pay works**
✅ **No manual order placement needed**

This is the architecture that meets your requirements!
