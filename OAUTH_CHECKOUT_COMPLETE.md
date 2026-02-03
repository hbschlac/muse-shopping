# OAuth Checkout & Returns System - Complete Implementation

## Overview
Complete OAuth-first checkout and returns system where **retailers are the merchant of record**, not Muse. All payment processing, order creation, and return handling happens via retailer APIs.

**Architecture Principle:** Muse is a **PLATFORM**, not a **MERCHANT**

---

## ✅ What's Implemented

### 1. Database Schema

#### OAuth Connections
**File:** `migrations/026_create_oauth_store_connections.sql`

Tables:
- `user_store_connections` - OAuth tokens (encrypted), connection status
- `user_saved_payment_methods` - Display info only (card last4, no sensitive data)
- `user_saved_addresses` - Shipping addresses synced from retailers
- `oauth_states` - CSRF protection for OAuth flow

**Security:**
- OAuth tokens encrypted with AES-256-GCM
- No raw card data stored (PCI DSS compliant)
- State tokens prevent CSRF attacks
- Auto-cleanup of expired states

#### Returns System
**File:** `migrations/036_create_returns_system.sql`

Tables:
- `returns` - Return records (references retailer's return ID)
- `return_items` - Individual items in return
- `return_status_history` - Audit trail of status changes

**Key Principle:** Returns are registered in retailer's system (source of truth). Muse maintains reference for display.

---

### 2. Services

#### StoreConnectionService
**File:** `src/services/storeConnectionService.js`

**Capabilities:**
- OAuth token encryption/decryption (AES-256-GCM)
- CSRF state token generation and verification
- Automatic token refresh (5-minute buffer before expiry)
- Store connection management
- Token lifecycle management

**Key Methods:**
```javascript
static encrypt(text)                          // Encrypt OAuth tokens
static decrypt(encryptedText)                 // Decrypt OAuth tokens
static createOAuthState(userId, storeId)      // CSRF protection
static verifyOAuthState(stateToken)           // Validate OAuth callback
static createConnection(connectionData)       // Store OAuth tokens
static getAccessToken(userId, storeId)        // Get valid token (auto-refresh)
static refreshAccessToken(userId, storeId)    // Refresh expired token
static disconnectStore(userId, storeId)       // Revoke OAuth connection
```

#### ReturnService
**File:** `src/services/returnService.js`

**Capabilities:**
- Check return eligibility via retailer API
- Initiate returns in retailer's system
- Track return status
- Sync status from retailer

**Key Methods:**
```javascript
static async checkReturnEligibility(userId, orderId)   // Check if order can be returned
static async initiateReturn(userId, returnData)        // Create return in retailer system
static async getReturn(userId, returnId)               // Get return details
static async getUserReturns(userId, options)           // List user's returns
static async syncReturnStatus(userId, returnId)        // Sync from retailer
```

#### RetailerAPIFactory
**File:** `src/services/retailerAPIFactory.js`

**Capabilities:**
- Factory pattern for creating retailer API clients
- OAuth flow management (authorization URL, token exchange, refresh, revoke)
- Extensible for new retailers

**Supported Retailers:**
- Target (ID: 4)
- Walmart (ID: 5)
- Nordstrom (ID: 1)

**Key Methods:**
```javascript
static getClient(storeId, options)           // Get API client for retailer
static getOAuthClient(storeId)               // Get OAuth client
static supportsOAuth(storeId)                // Check if retailer has OAuth
```

---

### 3. Retailer API Clients

#### TargetAPI
**File:** `src/services/retailerAPIs/targetAPI.js`

**Methods:**
- `createOrder(orderData)` - Place order using customer's Target account
- `getPaymentMethods()` - Get saved cards (includes RedCard)
- `getShippingAddresses()` - Get saved addresses
- `getOrderStatus(orderId)` - Track order
- `initiateReturn(orderId, items)` - Create return
- `getCustomerProfile()` - Get customer info

#### WalmartAPI
**File:** `src/services/retailerAPIs/walmartAPI.js`

**Methods:**
- `createOrder(orderData)` - Place order using customer's Walmart account
- `getPaymentMethods()` - Get saved cards (includes Walmart Pay)
- `getShippingAddresses()` - Get saved addresses
- `getOrderStatus(orderId)` - Track order
- `getReturnEligibility(orderId)` - Check return window
- `initiateReturn(orderId, items, returnMethod)` - Create return
- `getReturnStatus(returnId)` - Track return
- `getCustomerProfile()` - Get customer info (includes Walmart+ status)

#### NordstromAPI
**File:** `src/services/retailerAPIs/nordstromAPI.js`

**Methods:**
- `createOrder(orderData)` - Place order using customer's Nordstrom account
- `getPaymentMethods()` - Get saved cards (includes Nordstrom Card)
- `getShippingAddresses()` - Get saved addresses
- `getOrderStatus(orderId)` - Track order
- `getReturnEligibility(orderId)` - Check return window
- `initiateReturn(orderId, items, returnMethod)` - Create return
- `getReturnStatus(returnId)` - Track return
- `getCustomerProfile()` - Get Nordy Club status and points

**Special Features:**
- Nordstrom Card detection
- Nordy Club tier tracking (Member, Influencer, Ambassador, Icon)
- Points earned/refunded tracking
- Multiple return methods (ship, in-store, curbside)

---

### 4. Controllers

#### StoreConnectionController
**File:** `src/controllers/storeConnectionController.js`

**Endpoints:**
- `GET /api/store-connections` - Get all user's connections
- `GET /api/store-connections/:storeId` - Get specific connection
- `POST /api/store-connections/:storeId/connect` - Initiate OAuth flow
- `GET /api/store-connections/callback` - OAuth callback handler
- `DELETE /api/store-connections/:storeId` - Disconnect store
- `GET /api/store-connections/:storeId/payment-methods` - Get saved cards
- `GET /api/store-connections/:storeId/addresses` - Get saved addresses
- `POST /api/store-connections/:storeId/sync-payment-methods` - Sync from retailer
- `POST /api/store-connections/:storeId/sync-addresses` - Sync from retailer

#### ReturnController
**File:** `src/controllers/returnController.js`

**Endpoints:**
- `GET /api/returns/eligibility/:orderId` - Check return eligibility
- `POST /api/returns` - Initiate return
- `GET /api/returns` - Get user's returns
- `GET /api/returns/:returnId` - Get return details
- `POST /api/returns/:returnId/sync` - Sync status from retailer

---

### 5. Routes

**Files:**
- `src/routes/storeConnectionRoutes.js` - OAuth connection routes
- `src/routes/returnRoutes.js` - Return management routes

**Added to:** `src/routes/index.js`
```javascript
router.use('/store-connections', storeConnectionRoutes);
router.use('/returns', returnRoutes);
```

---

## How It Works

### Checkout Flow

```
1. USER CONNECTS ACCOUNT (one-time setup)
   User clicks "Connect Nordstrom Account" in Muse
   ↓
   POST /api/store-connections/1/connect
   ↓
   Redirects to Nordstrom OAuth: https://oauth.nordstrom.com/authorize?...
   ↓
   User logs into Nordstrom, grants permissions
   ↓
   Nordstrom redirects back: /api/store-connections/callback?code=...&state=...
   ↓
   Muse exchanges code for tokens (access + refresh)
   ↓
   Tokens encrypted and stored in database
   ↓
   Syncs payment methods and addresses from Nordstrom

2. SHOPPING
   User adds items to cart (from multiple stores)
   ↓
   Cart groups items by store:
   - Nordstrom: 2 items
   - Target: 1 item

3. CHECKOUT
   User clicks "Checkout" in Muse
   ↓
   For each store in cart:
     - Get valid access token (auto-refresh if needed)
     - Get retailer API client
     - Call retailer.createOrder({
         items: [...],
         shippingAddress: {...},
         paymentMethodId: "user's saved card at retailer"
       })
     - Retailer processes payment (NOT Muse)
     - Retailer creates order in their system
     - Returns order ID, tracking, etc.
   ↓
   Muse saves reference to retailer orders
   ↓
   Order appears in:
   - Muse app (via our database)
   - Retailer's app (via their system)

4. CREDIT CARD STATEMENT
   Date        Merchant               Amount
   02/03/26    NORDSTROM             $89.99
   02/03/26    TARGET                $45.50

   NOT "MUSE SHOPPING"!
```

### Return Flow

```
1. CHECK ELIGIBILITY
   GET /api/returns/eligibility/123
   ↓
   Calls Nordstrom API: GET /orders/{orderId}/return-eligibility
   ↓
   Returns:
   {
     eligible: true,
     daysRemaining: 28,
     returnWindow: "30 days",
     returnMethods: ["ship", "in_store", "curbside"]
   }

2. INITIATE RETURN
   POST /api/returns
   {
     orderId: 123,
     items: [{ orderItemId: 456, quantity: 1, reason: "wrong_size" }],
     returnMethod: "ship"
   }
   ↓
   Calls Nordstrom API: POST /orders/{orderId}/returns
   ↓
   Nordstrom creates return in THEIR system
   ↓
   Returns:
   {
     returnId: "NORD-RET-789",
     returnLabel: { pdfUrl: "...", qrCode: "..." },
     trackingNumber: "1Z999...",
     refundAmount: 8999,
     estimatedRefundDate: "2026-02-10"
   }
   ↓
   Muse saves reference to Nordstrom's return
   ↓
   Return appears in:
   - Muse app (display only)
   - Nordstrom app (source of truth)

3. REFUND
   Nordstrom processes return → issues refund
   ↓
   Credit card statement shows:
   Date        Merchant               Amount
   02/10/26    NORDSTROM REFUND      +$89.99

   NOT "MUSE SHOPPING REFUND"!
```

---

## Key Benefits

### For Customers
✅ **Store Benefits Preserved:** Free shipping, rewards points, membership perks all work
✅ **Credit Card Shows Retailer:** "NORDSTROM" not "MUSE SHOPPING"
✅ **One-Time Setup:** Connect account once, shop seamlessly forever
✅ **Saved Cards Work:** Use existing saved payment methods from retailers
✅ **Returns Easy:** Instant eligibility check, one-click initiation
✅ **Dual Visibility:** Orders show in both Muse and retailer apps

### For Muse
✅ **No Payment Liability:** Retailers handle all payment processing
✅ **No PCI Compliance:** Never touch raw card data
✅ **No Return Logistics:** Retailers handle shipping, inspection, refunds
✅ **Scalable:** Add new retailers by implementing API client
✅ **Legal Simplicity:** Not merchant of record, just a platform

### For Retailers
✅ **Customer Retention:** Orders in their system, brand on credit card
✅ **Loyalty Programs:** Points and rewards apply normally
✅ **Existing Infrastructure:** Use their payment processing, returns system
✅ **Brand Control:** Customer sees retailer name throughout process

---

## Environment Variables Required

Add to `.env`:

```bash
# Encryption for OAuth tokens
ENCRYPTION_KEY=<64-character-hex-string>  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Target OAuth
TARGET_CLIENT_ID=<from-target-partnership>
TARGET_CLIENT_SECRET=<from-target-partnership>
TARGET_API_BASE_URL=https://api.target.com/partners/v1

# Walmart OAuth
WALMART_CLIENT_ID=<from-walmart-partnership>
WALMART_CLIENT_SECRET=<from-walmart-partnership>
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3

# Nordstrom OAuth
NORDSTROM_CLIENT_ID=<from-nordstrom-partnership>
NORDSTROM_CLIENT_SECRET=<from-nordstrom-partnership>
NORDSTROM_API_BASE_URL=https://api.nordstrom.com/v1
NORDSTROM_PARTNER_ID=muse
```

---

## Next Steps (Requires Partnerships)

### 1. Retailer Partnerships
- **Target:** Apply for Target+ Partner API access
- **Walmart:** Apply for Walmart Marketplace API access
- **Nordstrom:** Reach out to Nordstrom partner team
- Each requires:
  - Business partnership agreement
  - Technical integration review
  - Sandbox credentials for testing
  - Production credentials after approval

### 2. OAuth App Registration
For each retailer:
1. Register Muse as OAuth client
2. Get `client_id` and `client_secret`
3. Configure redirect URI: `https://muse.app/api/store-connections/callback`
4. Request scopes: orders, payment_methods, addresses, profile, returns
5. Test in sandbox environment
6. Submit for production approval

### 3. Testing
1. Use sandbox credentials to test full flow
2. Test scenarios:
   - OAuth connection success
   - OAuth connection failure
   - Token refresh
   - Order placement
   - Payment method sync
   - Address sync
   - Return eligibility
   - Return initiation
   - Status syncing

### 4. Frontend Integration
Build UI for:
- Store connection management (connect/disconnect)
- Payment method selection at checkout
- Address selection at checkout
- Return flow (eligibility check, item selection, method choice)
- Order tracking
- Return tracking

---

## Security Notes

🔒 **OAuth Tokens:**
- ALWAYS encrypted at rest (AES-256-GCM)
- Decrypted only when making API calls
- Never logged or exposed in responses

🔒 **CSRF Protection:**
- State tokens used in OAuth flow
- Tokens verified on callback
- Single-use, time-limited (15 minutes)

🔒 **No Sensitive Data:**
- Never store raw card numbers
- Only store display info (last4, brand, exp)
- Payment references point to retailer's system

🔒 **PCI DSS Compliant:**
- Muse never touches card data
- All payment processing by retailers
- No card data in logs or databases

---

## File Summary

### Created Files (New)
1. `migrations/026_create_oauth_store_connections.sql` - OAuth database schema
2. `migrations/036_create_returns_system.sql` - Returns database schema
3. `src/services/storeConnectionService.js` - OAuth token management
4. `src/services/returnService.js` - Return management
5. `src/services/retailerAPIFactory.js` - API client factory
6. `src/services/retailerAPIs/targetAPI.js` - Target API client
7. `src/services/retailerAPIs/walmartAPI.js` - Walmart API client
8. `src/services/retailerAPIs/nordstromAPI.js` - Nordstrom API client
9. `src/controllers/storeConnectionController.js` - OAuth controller
10. `src/controllers/returnController.js` - Return controller
11. `src/routes/storeConnectionRoutes.js` - OAuth routes
12. `src/routes/returnRoutes.js` - Return routes

### Modified Files
1. `src/routes/index.js` - Added store-connections and returns routes
2. `src/services/checkoutService.js` - Updated to use OAuth (previously created)

### Documentation
1. `OAUTH_CHECKOUT_ARCHITECTURE.md` - Architecture design doc
2. `RETURN_EXPERIENCE_DESIGN.md` - Return flow design doc
3. `OAUTH_CHECKOUT_COMPLETE.md` - This file (implementation summary)

---

## Architecture Diagram

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Shops in Muse app
       │ 2. Adds items to cart (multiple stores)
       │ 3. Clicks "Checkout"
       │
       ▼
┌─────────────────────────────────────────┐
│           MUSE PLATFORM                 │
│  ┌─────────────────────────────────┐   │
│  │  Cart Service                   │   │
│  │  - Groups items by store        │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│  ┌────────────▼────────────────────┐   │
│  │  Checkout Service               │   │
│  │  - For each store:              │   │
│  │    • Get OAuth token            │   │
│  │    • Get API client             │   │
│  │    • Call retailer API          │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│  ┌────────────▼────────────────────┐   │
│  │  Retailer API Factory           │   │
│  │  - Creates API client           │   │
│  │  - Manages OAuth tokens         │   │
│  └────────────┬────────────────────┘   │
└───────────────┼─────────────────────────┘
                │
    ┌───────────┴───────────┬─────────────┐
    │                       │             │
    ▼                       ▼             ▼
┌──────────┐          ┌──────────┐   ┌──────────┐
│ NORDSTROM│          │  TARGET  │   │ WALMART  │
│   API    │          │   API    │   │   API    │
└────┬─────┘          └────┬─────┘   └────┬─────┘
     │                     │              │
     │ • Create order      │              │
     │ • Process payment   │              │
     │ • Issue tracking    │              │
     │                     │              │
     ▼                     ▼              ▼
┌──────────┐          ┌──────────┐   ┌──────────┐
│Nordstrom │          │ Target   │   │ Walmart  │
│  Order   │          │  Order   │   │  Order   │
│  System  │          │  System  │   │  System  │
└──────────┘          └──────────┘   └──────────┘

USER SEES ORDER IN:
✅ Muse app (reference/cache)
✅ Retailer app (source of truth)

CREDIT CARD SHOWS:
✅ "NORDSTROM" (merchant of record)
✅ NOT "MUSE SHOPPING"
```

---

## Status: Ready for Partnership Negotiations

All code is complete and ready for testing once retailer partnerships are established. The system is designed to be:
- **Secure** (PCI compliant, encrypted tokens)
- **Scalable** (easy to add new retailers)
- **Customer-friendly** (seamless checkout, preserved benefits)
- **Retailer-friendly** (they remain merchant of record)

Contact retailer partnership teams to begin sandbox integration testing.
