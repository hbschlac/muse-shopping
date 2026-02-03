# Unified Checkout Orchestration System - Complete ✅

## Overview

The checkout orchestration system enables Muse to act as the **merchant of record** for multi-store purchases. When a user has items from Nordstrom and Nordstrom Rack in their cart, they complete ONE checkout on Muse, and Muse simultaneously places TWO orders with the retailers.

**Key Difference from Affiliate Models:**
- ❌ **Not:** Redirect users to retailer sites to checkout
- ✅ **Yes:** User pays Muse → Muse places orders with retailers → Retailers ship to customer

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER JOURNEY                                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User has cart with items from multiple stores            │
│     • 2 items from Nordstrom                                 │
│     • 2 items from Nordstrom Rack                            │
│                                                               │
│  2. User clicks "Checkout" → Checkout Session Created        │
│     • Cart snapshot frozen (preserves pricing)               │
│     • Session ID: cs_xxxxx                                   │
│     • Expires in 30 minutes                                  │
│                                                               │
│  3. User enters shipping address                             │
│     • Single address for all orders                          │
│     • Validated against USPS/Address API                     │
│                                                               │
│  4. User enters payment method                               │
│     • Stripe payment method token                            │
│     • Single payment for entire cart                         │
│                                                               │
│  5. User clicks "Place Orders"                               │
│     ┌──────────────────────────────────┐                     │
│     │ CHECKOUT ORCHESTRATION           │                     │
│     ├──────────────────────────────────┤                     │
│     │ a. Capture payment from user     │ ← Stripe            │
│     │ b. Create order records          │ ← 2 orders          │
│     │ c. Place orders in parallel:     │                     │
│     │    • Order Nordstrom items       │ ← API/Headless/Manual│
│     │    • Order Nordstrom Rack items  │ ← API/Headless/Manual│
│     │ d. Track placement status        │                     │
│     └──────────────────────────────────┘                     │
│                                                               │
│  6. User sees confirmation                                   │
│     • Nordstrom: Order #MO-ABC123 (placed)                   │
│     • Nordstrom Rack: Order #MO-XYZ789 (placed)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables Created

#### 1. `checkout_sessions`
Represents a single checkout where user purchases from multiple stores.

**Key Fields:**
- `session_id` - Unique session identifier (cs_xxx)
- `user_id` - Reference to user
- `cart_snapshot` - Frozen cart data at checkout time (JSONB)
- `shipping_address` - Customer shipping info (JSONB)
- `payment_method_id` - Stripe payment method token
- `total_cents` - Total amount to charge customer
- `status` - pending → processing → completed/failed
- `stores_to_process` - Array of stores with placement status (JSONB)
- `expires_at` - Session expiration (30 min)

**Purpose:** Orchestrate multi-store checkout in single transaction

---

#### 2. `orders`
Each order = ONE store's portion of the checkout.

One checkout session → Multiple orders (one per store)

**Key Fields:**
- `muse_order_number` - Muse's order ID (MO-XXXXX) shown to customer
- `store_order_number` - Retailer's order ID (received after placement)
- `checkout_session_id` - Links back to checkout session
- `store_id` - Which retailer
- `user_id` - Which customer
- `total_cents` - Total for this store's items
- `shipping_address` - Where to ship (copied from session)
- `status` - pending → placed → shipped → delivered
- `placement_method` - api, headless, or manual
- `tracking_number` - Shipment tracking
- `placed_at` - When order was placed with retailer

**Purpose:** Track individual retailer orders

---

#### 3. `order_items`
Products within each order.

**Key Fields:**
- `order_id` - Parent order
- `product_name`, `product_sku`, `product_url`, `product_image_url`
- `size`, `color`, `quantity`
- `unit_price_cents`, `total_price_cents`
- `item_status` - Track per-item status (for split shipments)

**Purpose:** Detailed line items for each order

---

#### 4. `order_status_history`
Audit trail of all status changes.

**Automatically populated via trigger** when order status changes.

**Purpose:** Track order lifecycle, debugging, customer support

---

#### 5. `payment_transactions`
All payment-related transactions.

**Key Fields:**
- `checkout_session_id` - Links to checkout
- `stripe_payment_intent_id` - Stripe payment intent
- `amount_cents` - Transaction amount
- `transaction_type` - charge, refund, partial_refund
- `status` - pending, succeeded, failed

**Purpose:** Payment reconciliation, refunds, accounting

---

## Services Implemented

### 1. CheckoutService (`src/services/checkoutService.js`)

Main orchestration service for multi-store checkout.

#### Methods:

**`initiateCheckout(userId)`**
- Loads user's current cart
- Creates checkout session
- Generates session ID
- Sets 30-min expiration
- Returns session object

**`addShippingAddress(sessionId, userId, address)`**
- Validates address format
- Updates checkout session
- Returns updated session

**`addPaymentMethod(sessionId, userId, stripePaymentMethodId)`**
- Stores Stripe payment method token
- Returns updated session

**`placeOrders(sessionId, userId)` ⭐ Main orchestration**
- Validates session is ready
- **Captures payment from customer via Stripe**
- **Creates order records** (one per store)
- **Places orders with retailers in parallel**
- Updates session status
- Clears user's cart
- Returns placement results

**`createOrdersFromSession(session)`**
- Creates `orders` table records
- Creates `order_items` table records
- Generates Muse order numbers (MO-XXXXX)
- Returns order objects

**`placeOrdersWithRetailers(orders, session)`**
- Executes all placements in parallel
- Handles failures gracefully
- Returns array of results

**`placeOrderWithRetailer(order, session)`**
- Routes to appropriate placement method:
  - **API:** Call retailer API (Walmart, Target)
  - **Headless:** Puppeteer automation (Nordstrom, Macy's)
  - **Manual:** Create task for ops team
- Updates order with placement result
- Handles errors and retries

**`capturePayment(session)` [STUB]**
- Integrates with Stripe to charge customer
- Creates payment transaction record
- Currently mocked for development

---

### 2. OrderService (`src/services/orderService.js`)

Manages order tracking and status updates.

#### Methods:

**`getUserOrders(userId, options)`**
- Fetches all user's orders
- Groups by checkout session
- Supports pagination and filtering
- Returns orders with store info

**`getOrderByNumber(museOrderNumber, userId)`**
- Fetches single order with items
- Includes status history
- Returns complete order details

**`updateOrderStatus(museOrderNumber, newStatus, metadata)`**
- Updates order status
- Triggers status history record
- Returns updated order

**`updateOrderTracking(museOrderNumber, trackingInfo)`**
- Adds tracking number and carrier
- Auto-updates status to 'shipped'
- Returns updated order

**`getOrderStats(userId)`**
- Total orders, total spent
- Orders by status
- Stores ordered from
- Returns statistics object

---

## API Endpoints

### Checkout Endpoints

```
POST   /api/v1/checkout/sessions
       - Initiate checkout from cart
       - Creates checkout session
       - Returns: { sessionId, cartSnapshot, expiresAt, ... }

GET    /api/v1/checkout/sessions/:sessionId
       - Get checkout session details
       - Returns: Full session object

PUT    /api/v1/checkout/sessions/:sessionId/shipping
       - Add shipping address
       - Body: { name, address1, city, state, zip, country, phone }
       - Returns: Updated session

PUT    /api/v1/checkout/sessions/:sessionId/payment
       - Add payment method
       - Body: { paymentMethodId } (Stripe token)
       - Returns: Updated session

POST   /api/v1/checkout/sessions/:sessionId/place
       - Place orders with all retailers
       - Captures payment
       - Places orders in parallel
       - Returns: { orders: [...], summary: { ... } }
```

### Order Endpoints

```
GET    /api/v1/orders
       - Get all user's orders
       - Query params: limit, offset, status
       - Returns: Orders grouped by checkout session

GET    /api/v1/orders/stats
       - Get order statistics
       - Returns: Total orders, total spent, status breakdown

GET    /api/v1/orders/:orderNumber
       - Get specific order (MO-XXXXX)
       - Returns: Order with items and status history

PUT    /api/v1/orders/:orderNumber/tracking
       - Update tracking info (webhook/admin)
       - Body: { trackingNumber, carrier, estimatedDelivery }
       - Returns: Updated order
```

---

## Example Usage Flow

### Step 1: Initiate Checkout

```bash
POST /api/v1/checkout/sessions
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "sessionId": "cs_abc123xyz",
    "cartSnapshot": {
      "stores": [
        {
          "storeId": 2,
          "storeName": "Nordstrom",
          "itemCount": 2,
          "subtotalCents": 24800,
          "items": [...]
        },
        {
          "storeId": 5,
          "storeName": "Nordstrom Rack",
          "itemCount": 2,
          "subtotalCents": 8900,
          "items": [...]
        }
      ],
      "summary": {
        "totalCents": 33700,
        "totalItemCount": 4
      }
    },
    "status": "pending",
    "expiresAt": "2026-02-03T15:30:00Z"
  }
}
```

### Step 2: Add Shipping Address

```bash
PUT /api/v1/checkout/sessions/cs_abc123xyz/shipping
Authorization: Bearer <token>
{
  "name": "Jane Doe",
  "address1": "123 Main St",
  "address2": "Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94102",
  "country": "US",
  "phone": "(415) 555-1234"
}
```

### Step 3: Add Payment Method

```bash
PUT /api/v1/checkout/sessions/cs_abc123xyz/payment
Authorization: Bearer <token>
{
  "paymentMethodId": "pm_1234567890abcdef"  # Stripe payment method
}
```

### Step 4: Place Orders

```bash
POST /api/v1/checkout/sessions/cs_abc123xyz/place
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "checkoutSessionId": "cs_abc123xyz",
    "orders": [
      {
        "orderId": 1,
        "museOrderNumber": "MO-ABC123XYZ",
        "storeOrderNumber": "API-12345678",
        "status": "placed",
        "placedAt": "2026-02-03T14:45:00Z"
      },
      {
        "orderId": 2,
        "museOrderNumber": "MO-DEF456UVW",
        "storeOrderNumber": "API-87654321",
        "status": "placed",
        "placedAt": "2026-02-03T14:45:01Z"
      }
    ],
    "summary": {
      "totalOrders": 2,
      "successfulOrders": 2,
      "failedOrders": 0
    }
  },
  "message": "Orders placed: 2 successful, 0 failed"
}
```

### Step 5: View Orders

```bash
GET /api/v1/orders
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "checkoutSessions": [
      {
        "checkoutSessionId": "cs_abc123xyz",
        "checkoutDate": "2026-02-03T14:40:00Z",
        "totalCents": 33700,
        "orders": [
          {
            "museOrderNumber": "MO-ABC123XYZ",
            "storeName": "Nordstrom",
            "totalCents": 24800,
            "totalDisplay": "$248.00",
            "status": "placed",
            "trackingNumber": null,
            "placedAt": "2026-02-03T14:45:00Z"
          },
          {
            "museOrderNumber": "MO-DEF456UVW",
            "storeName": "Nordstrom Rack",
            "totalCents": 8900,
            "totalDisplay": "$89.00",
            "status": "placed",
            "trackingNumber": null,
            "placedAt": "2026-02-03T14:45:01Z"
          }
        ]
      }
    ],
    "totalOrders": 2
  }
}
```

---

## Order Placement Methods

### Method 1: API Integration (Tier 1) 🏆

**Retailers:** Walmart, Target, potentially Gap Inc.

**How it works:**
1. User authorizes Muse to access retailer account (OAuth)
2. Muse stores encrypted access tokens
3. At checkout, Muse calls retailer's order placement API
4. Retailer returns order confirmation immediately

**Advantages:**
- Fast and reliable
- Real-time inventory verification
- Immediate order confirmation
- Access to user's saved payment methods

**Implementation Status:** STUB (requires retailer API access)

---

### Method 2: Headless Automation (Tier 2) 🤖

**Retailers:** Nordstrom, Macy's, Old Navy, most fashion sites

**How it works:**
1. User stores retailer credentials in Muse (encrypted)
2. At checkout, Puppeteer launches headless Chrome
3. Logs into retailer site
4. Adds items to cart
5. Enters shipping/payment
6. Submits order
7. Scrapes order confirmation number

**Advantages:**
- Works for any retailer with web checkout
- No API access needed
- Can handle complex checkout flows

**Challenges:**
- Fragile (breaks if retailer changes UI)
- Anti-bot detection
- Slower than API

**Implementation Status:** STUB (requires Puppeteer setup)

---

### Method 3: Manual Placement 📋

**Retailers:** Small boutiques, stores without API or stable checkout

**How it works:**
1. Order marked for manual placement
2. Ops team receives notification
3. Team manually places order on retailer site
4. Enters order confirmation number into Muse

**Advantages:**
- Works for any retailer
- No technical setup needed
- Fallback for failed automation

**Disadvantages:**
- Slow (not real-time)
- Requires human intervention
- Doesn't scale

**Implementation Status:** IMPLEMENTED

---

## Payment Processing

### Current: STUB Implementation

```javascript
capturePayment(session) {
  // TODO: Integrate with Stripe
  // For now, creates mock transaction record
  return { success: true, transactionId: 'txn_xxx' };
}
```

### Planned: Stripe Integration

**Flow:**
1. Frontend creates Stripe Payment Method
2. Backend creates Stripe Payment Intent
3. Frontend confirms payment (3D Secure if needed)
4. Backend captures payment
5. Store transaction record in `payment_transactions`

**Stripe Objects:**
- **Payment Method** - Tokenized card info
- **Payment Intent** - Intent to charge customer
- **Charge** - Actual charge transaction

---

## Order Status Lifecycle

```
pending → placed → confirmed → shipped → delivered
    ↓        ↓         ↓          ↓
  failed  cancelled cancelled  cancelled
```

**Status Definitions:**
- **pending** - Order created, not yet placed with retailer
- **placed** - Successfully placed with retailer
- **confirmed** - Retailer confirmed receipt
- **shipped** - Retailer shipped the order
- **delivered** - Customer received package
- **failed** - Failed to place with retailer
- **cancelled** - Order cancelled (by user or retailer)

**Status changes automatically recorded** in `order_status_history` table via trigger.

---

## Key Features

### 1. Cart Snapshot ✅
Cart data frozen at checkout time preserves pricing even if prices change during checkout.

### 2. Parallel Order Placement ✅
All retailer orders placed simultaneously for speed.

```javascript
const placementPromises = orders.map(order =>
  this.placeOrderWithRetailer(order, session)
);
const results = await Promise.allSettled(placementPromises);
```

### 3. Graceful Failure Handling ✅
If one retailer fails, others still proceed.

```javascript
Promise.allSettled() // Returns both successes and failures
```

### 4. Automatic Status Tracking ✅
Database trigger records all status changes for audit trail.

### 5. Unified Customer Experience ✅
- Single checkout flow
- Single payment
- All orders in one place

---

## What's NOT Implemented (TODOs)

### 1. Stripe Integration ⚠️
```javascript
// src/services/checkoutService.js:capturePayment()
// Currently: Mock implementation
// Needed: Real Stripe API calls
```

### 2. Retailer API Clients ⚠️
```javascript
// src/services/checkoutService.js:placeOrderViaAPI()
// Currently: Returns mock order number
// Needed: Walmart API, Target API integrations
```

### 3. Headless Automation ⚠️
```javascript
// src/services/checkoutService.js:placeOrderViaHeadless()
// Currently: Returns mock order number
// Needed: Puppeteer scripts per retailer
```

### 4. Tax & Shipping Calculation ⚠️
```javascript
// Currently: Set to 0
// Needed: Per-store tax/shipping calculation
// - TaxJar API for sales tax
// - Retailer shipping rules
```

### 5. Address Validation ⚠️
```javascript
// Currently: Basic format validation
// Needed: USPS Address Validation API
```

### 6. Order Tracking Sync ⚠️
```
// Needed: Webhook listeners for:
// - Retailer order confirmations
// - Shipping notifications
// - Delivery confirmations
```

---

## Files Created

### Database
1. `migrations/025_create_checkout_and_orders.sql` - Schema

### Services
2. `src/services/checkoutService.js` - Checkout orchestration (530 lines)
3. `src/services/orderService.js` - Order management (240 lines)

### Controllers
4. `src/controllers/checkoutController.js` - Checkout HTTP handlers (100 lines)
5. `src/controllers/orderController.js` - Order HTTP handlers (90 lines)

### Routes
6. `src/routes/checkoutRoutes.js` - Checkout endpoints (30 lines)
7. `src/routes/orderRoutes.js` - Order endpoints (30 lines)

### Utilities
8. `src/utils/errors.js` - Added `PaymentError` class

### Documentation
9. `CHECKOUT_ORCHESTRATION_COMPLETE.md` - This document

### Modified Files
10. `src/routes/index.js` - Registered checkout and order routes
11. `package.json` - Added nanoid dependency

---

## Testing Plan

### Unit Tests Needed
```javascript
// tests/checkoutService.test.js
- initiateCheckout() with empty cart
- initiateCheckout() with multi-store cart
- validateAddress() with valid/invalid addresses
- createOrdersFromSession() creates correct records
- placeOrdersWithRetailers() handles failures

// tests/orderService.test.js
- getUserOrders() groups by session
- getOrderByNumber() returns complete order
- updateOrderStatus() triggers history
```

### Integration Tests Needed
```javascript
// tests/checkout.integration.test.js
- Full checkout flow: cart → session → shipping → payment → place
- Multi-store order placement
- Payment capture
- Order status updates
```

### E2E Tests Needed
```javascript
// Test complete user journey:
1. Add items from 2 stores to cart
2. Initiate checkout
3. Add shipping address
4. Add payment method
5. Place orders
6. Verify both orders created
7. Check order status
```

---

## Deployment Checklist

### Before Production:
- [ ] Implement Stripe payment capture
- [ ] Set up Stripe webhook handlers
- [ ] Implement address validation (USPS API)
- [ ] Calculate real tax per order (TaxJar API)
- [ ] Calculate real shipping per store
- [ ] Set up monitoring/alerting for failed placements
- [ ] Create admin dashboard for manual order placement
- [ ] Implement refund flow
- [ ] Test with real retailer APIs (sandbox mode)
- [ ] Security audit on payment handling
- [ ] Load testing for parallel order placement
- [ ] Set up database backups
- [ ] Configure retry logic for failed placements

---

## Success Metrics

### Operational
- **Order Placement Success Rate** - Target: >95%
- **Checkout Completion Rate** - Target: >80%
- **Average Checkout Time** - Target: <2 minutes
- **Payment Failure Rate** - Target: <2%

### Business
- **Multi-Store Orders** - % of checkouts with 2+ stores
- **Average Order Value** - Should increase vs single-store
- **Customer Satisfaction** - Post-order surveys
- **Order Tracking Usage** - % users checking order status

---

## Next Steps

### Immediate (Week 1)
1. **Implement Stripe integration** in `capturePayment()`
2. **Write integration tests** for checkout flow
3. **Run migration** to create tables
4. **Test manual order placement** end-to-end

### Short-term (Week 2-3)
5. **Implement address validation** (USPS API)
6. **Calculate real tax** (TaxJar or similar)
7. **Calculate shipping** per store
8. **Build admin panel** for manual order management
9. **Set up order tracking** email parsing

### Medium-term (Month 2)
10. **Implement Tier 2 (Headless)** for Nordstrom
11. **Set up monitoring** for order failures
12. **Implement refund flow**
13. **Add order cancellation**

### Long-term (Month 3+)
14. **Implement Tier 1 (API)** for Walmart/Target
15. **Build analytics dashboard** for order insights
16. **Optimize placement performance**
17. **A/B test checkout UX**

---

## Summary

✅ **Complete checkout orchestration scaffolding built**
- Database schema for sessions, orders, items, payments
- Service layer for checkout and order management
- API endpoints for full checkout flow
- Parallel order placement architecture
- Status tracking and audit trail
- Payment transaction records

⚠️ **Stub implementations for:**
- Stripe payment capture
- Retailer API integrations
- Headless automation
- Tax/shipping calculation

🎯 **Ready for:**
- Integration testing
- Stripe integration
- Real retailer connections
- Production deployment (after TODOs completed)

**Lines of Code:** ~1,200 lines
**Database Tables:** 5 new tables
**API Endpoints:** 9 new endpoints
**Status:** SCAFFOLDING COMPLETE ✅
