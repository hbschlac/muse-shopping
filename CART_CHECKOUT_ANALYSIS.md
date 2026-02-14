# Cart & Checkout Backend API Analysis

**Date:** 2026-02-08
**Status:** Scaffolding Complete - Production Readiness Gaps Identified

---

## 1. Backend API Contract Summary

### 1.1 Cart API (`/api/v1/cart`)

#### Cart Item Management
- **`POST /items`** - Add single item to cart
  - Validates currency, quantity, store eligibility, product type
  - Enforces cart capacity limits (distinct items, total quantity)
  - Auto-merges duplicates (same SKU, size, color)
  - Returns formatted cart item with PDP URL, actions paths

- **`POST /items/batch`** - Add multiple items
  - Partial success model (returns `success[]` and `failed[]`)
  - Same validation as single add

- **`GET /items/check`** - Check if item exists in cart
  - Query params: `storeId`, `productSku`, `size`, `color`
  - Returns `{exists: boolean, item: object|null}`

- **`POST /items/:id/move-to-favorites`** - Swipe action scaffold
  - Moves item to favorites if `itemId` mapping exists in metadata
  - Always removes from cart (configurable via `removeFromCart` param)
  - Returns `{removedFromCart, favorite: {status, itemId}}`

- **`PUT /items/:id`** - Update item (quantity, size, color)
- **`PATCH /items/:id/quantity`** - Update quantity only
- **`DELETE /items/:id`** - Remove item

#### Cart Retrieval
- **`GET /`** - Get full cart grouped by store
  - Returns stores array with reverse chronological ordering
  - Each store includes: items, subtotalCents, itemCount, storeSlug, storeLogo
  - Summary includes: totalStoreCount, totalItemCount, totalDistinctItems, subtotalCents
  - **NEW:** Includes `requirements` object with policy snapshot and warnings

- **`GET /count`** - Lightweight badge count
  - Returns `{totalItemCount: number}` (sum of quantities, not distinct items)
  - Optimized for global cart icon polling

- **`GET /summary`** - Cart summary only (no items)
  - Totals, discounts, store count

- **`DELETE /`** - Clear entire cart
  - Returns `{itemsRemoved: number}`

### 1.2 Checkout API (`/api/v1/checkout`)

#### Session Management
- **`POST /sessions`** - Initiate checkout from cart
  - Creates session with 30min expiration
  - Snapshots current cart state
  - Determines placement method per store (api/headless/manual)
  - **NEW:** Enforces requirement adapter policies (throws if cart violates rules)
  - **NEW:** Pre-populates checkout metadata scaffold with shipping options, store connect hints, Apple Pay flag
  - Returns session with `storesToProcess[]`, `checkoutMetadata`, `expiresAt`

- **`GET /sessions/:sessionId`** - Retrieve session details
- **`GET /readiness`** - Pre-flight check for current cart
  - **NEW:** Returns per-store readiness with issues array
  - **NEW:** Includes requirement policy evaluation (blockers, warnings)
  - **NEW:** Includes store connect hints, shipping options scaffold, payment method status

#### Session Data Collection (NEW Endpoints)
- **`PUT /sessions/:sessionId/shipping`** - Add shipping address
  - Validates required fields (name, address1, city, state, zip, country)
  - US zip validation

- **`PUT /sessions/:sessionId/recipient`** - Save recipient contact info
  - Required: email, phone
  - Stored in `checkout_metadata.recipient`

- **`PUT /sessions/:sessionId/billing`** - Set billing preferences
  - Supports `sameAsShipping: boolean` or custom `billingAddress`
  - Stores separate billing address or null if same-as-shipping

- **`PUT /sessions/:sessionId/payment`** - Add payment method
  - If `storeId` provided: saves to `retailer_payment_methods` map for that store
  - If no `storeId`: saves to `payment_method_id` (Muse payment)
  - Auto-persists retailer payment methods via StoreAccountService

- **`PUT /sessions/:sessionId/promo`** - Apply promo code scaffold
  - Validates code is present
  - Stores `{code, eligibleStoreIds[], appliedAt}`
  - No actual promo validation logic yet (scaffold)

- **`PUT /sessions/:sessionId/shipping-options`** - Save per-store shipping selections
  - Payload: `{selections: {[storeId]: {optionId, ...}}}`
  - Validates storeIds are in session
  - Validates each selection has `optionId`

#### Order Placement
- **`POST /sessions/:sessionId/place`** - Place orders with all retailers
  - Validates session readiness (address, payment, expiration, requirements)
  - **NEW:** Enforces requirement adapter policies before proceeding
  - Captures Muse payment if MOR stores exist (currently none)
  - Creates order records per store
  - Places orders in parallel (api/headless/manual routing)
  - Clears cart on full success, partial clear on partial failure
  - Returns `{orders[], summary: {totalOrders, successfulOrders, failedOrders, status}}`

---

## 2. Requirement Adapter System

### 2.1 Architecture
- **Config:** `src/config/requirementAdapters.js` - Environment-driven policy defaults
- **Service:** `src/services/requirementAdapterService.js` - Centralized enforcement & evaluation
- **Integration:** Wired into CartService and CheckoutService at decision points

### 2.2 Cart Policies (Enforced at Add/Update Time)
| Policy | Env Var | Default | Enforcement Point |
|--------|---------|---------|-------------------|
| Max quantity per item | `CART_MAX_QUANTITY_PER_ITEM` | 99 | `CartService.addItem`, `updateItemQuantity` |
| Max total quantity | `CART_MAX_TOTAL_QUANTITY` | 500 | `assertCartCapacity` |
| Max distinct items | `CART_MAX_DISTINCT_ITEMS` | 100 | `assertCartCapacity` |
| Allowed currencies | `CART_ALLOWED_CURRENCIES` | USD | `assertCurrencyAllowed` |
| Allowed store IDs | `CART_ALLOWED_STORE_IDS` | [] (all) | `assertStoreAllowedForCart` |
| Blocked store IDs | `CART_BLOCKED_STORE_IDS` | [] | `assertStoreAllowedForCart` |
| Allowed product types | `CART_ALLOWED_PRODUCT_TYPES` | [] (all) | `assertProductTypeAllowedForCart` |
| Blocked product types | `CART_BLOCKED_PRODUCT_TYPES` | [] | `assertProductTypeAllowedForCart` |
| Warn at capacity % | `CART_WARN_AT_PERCENT` | 85 | `buildCartRequirementState` (warnings) |

### 2.3 Checkout Policies (Enforced at Initiation & Placement)
| Policy | Env Var | Default | Enforcement Point |
|--------|---------|---------|-------------------|
| Max stores per checkout | `CHECKOUT_MAX_STORES` | 20 | `evaluateCheckoutCart` |
| Require items in stock | `CHECKOUT_REQUIRE_ITEMS_IN_STOCK` | true | `evaluateCheckoutCart` (blocker) |
| Max subtotal (cents) | `CHECKOUT_MAX_SUBTOTAL_CENTS` | 1000000 ($10k) | `evaluateCheckoutCart` |
| Allowed/blocked stores | Same as cart | [] | `evaluateCheckoutCart` |
| Allowed/blocked types | Same as cart | [] | `evaluateCheckoutCart` |

### 2.4 Policy Evaluation Flow
1. **Cart Add/Update:** Throws `ValidationError` immediately if violates cart policies
2. **Cart GET:** Returns warnings in `requirements.warnings[]` if approaching limits (non-blocking)
3. **Checkout Initiate:** Calls `enforceCheckoutCart()` which throws if any blockers exist
4. **Checkout Place:** Re-validates requirements before payment capture

### 2.5 Product Type Extraction Logic
- Checks (in order): `item.productType`, `item.product_type`, `item.metadata.productType`, `item.metadata.product_type`, `item.metadata.category`
- Normalizes to uppercase for comparison

---

## 3. Gap Analysis vs Production Requirements

### 3.1 CRITICAL GAPS (Blocking Production)

#### Payment Processing
- **Missing:** Stripe integration is stubbed
  - `StripeService.createPaymentIntent()` not implemented
  - `StripeService.confirmPaymentIntent()` not implemented
  - No webhook handler for payment events
- **Impact:** Cannot capture payments from users
- **Fix Required:** Full Stripe integration with test mode first

#### Retailer API Integrations
- **Missing:** `RetailerAPIFactory.getClient()` is stub
  - No actual OAuth-based retailer order placement
  - No retailer-specific adapters (Shopify, BigCommerce, etc.)
- **Impact:** `placeOrderViaAPI()` will fail for all stores marked as `api` placement
- **Fix Required:** Per-retailer SDK implementations or generic REST client

#### Headless Automation
- **Missing:** `HeadlessAutomationService.placeOrder()` is stub
  - `HeadlessAutomationService.isSupported()` is stub
  - No Puppeteer/Playwright automation scripts
- **Impact:** `placeOrderViaHeadless()` will fail for all stores marked as `headless`
- **Fix Required:** Browser automation framework with per-store checkout flows

#### Store Account Service
- **Missing:** `StoreAccountService.getPaymentMethodsForStores()` implementation
  - `StoreAccountService.savePaymentMethod()` stub
  - `StoreAccountService.getUserStoreAccounts()` stub
- **Impact:** Readiness endpoint will not show saved payment methods
- **Fix Required:** Database schema + service implementation for retailer payment tokens

#### Manual Order Service
- **Missing:** `ManualOrderService.createManualOrderTask()` stub
  - No ops dashboard for manual fulfillment queue
  - No notification system (email/Slack) for ops team
- **Impact:** Manual orders will silently fail to create tasks
- **Fix Required:** Task queue table, ops UI, notification wiring

### 3.2 HIGH PRIORITY GAPS (Needed Before Scale)

#### Inventory & Stock Validation
- **Missing:** Real-time stock check integration
- **Current:** Cart items have `in_stock` boolean, but no background refresh job
- **Impact:** Users may checkout out-of-stock items
- **Fix Required:**
  - Stock validation service with retailer API calls
  - Background job to refresh `last_stock_check` for cart items
  - Real-time validation on checkout initiation

#### Tax & Shipping Calculation
- **Missing:** Real tax calculation (currently hardcoded to 0)
  - No shipping cost calculation (hardcoded to 0)
  - No integration with tax services (Avalara, TaxJar)
- **Impact:** `totalCents` is incorrect, users undercharged
- **Fix Required:**
  - Tax service integration with address-based lookup
  - Shipping cost calculation per store (could be retailer API or estimation)

#### Promo Code Validation
- **Missing:** Actual promo validation logic
- **Current:** Endpoint saves promo code string to metadata only
- **Impact:** Promo codes have no effect on pricing
- **Fix Required:**
  - Promo codes table (code, discount_type, value, eligible_stores, expiration)
  - Validation service to apply discounts
  - Integration with per-store promo restrictions

#### Order Status Tracking
- **Missing:** Post-placement tracking updates
  - No webhook listeners for retailer order status changes
  - No tracking number updates from retailers
- **Impact:** Orders placed but status never updates
- **Fix Required:**
  - Webhook handlers per retailer
  - Background job to poll retailer APIs for status
  - Order status transition state machine

#### Session Expiration Cleanup
- **Missing:** Background job to clean up expired sessions
- **Current:** Sessions expire but remain in DB indefinitely
- **Impact:** Database bloat over time
- **Fix Required:** Cron job to delete sessions older than expiration + grace period

### 3.3 MEDIUM PRIORITY GAPS (Quality of Life)

#### Address Validation
- **Current:** Basic regex validation for US zip codes only
- **Missing:** USPS/SmartyStreets validation, autocomplete suggestions
- **Impact:** Typos may cause delivery failures
- **Fix Required:** Address validation service integration

#### Multi-Currency Support
- **Current:** Hardcoded to USD
- **Missing:** Currency conversion, display formatting per locale
- **Impact:** Cannot support international retailers/users
- **Fix Required:** Currency service, exchange rate lookup, locale formatting

#### Cart Item Metadata Enrichment
- **Missing:** Size/color inventory validation
- **Missing:** Product availability by variant
- **Impact:** Users may select unavailable sizes/colors
- **Fix Required:** Variant-level stock tracking integration

#### Checkout Abandonment Recovery
- **Missing:** Email/SMS reminders for abandoned checkouts
- **Missing:** Analytics tracking for drop-off points
- **Impact:** Lost revenue opportunities
- **Fix Required:** Background job + email service integration

#### Fraud Detection
- **Missing:** Address verification, velocity checks, risk scoring
- **Impact:** Vulnerable to fraudulent orders
- **Fix Required:** Stripe Radar integration, custom risk rules

### 3.4 LOW PRIORITY GAPS (Future Enhancements)

- **Cart Sharing:** Generate shareable cart links
- **Saved Carts:** Persist multiple cart states per user
- **Gift Options:** Gift wrap, messages, recipient addresses
- **Subscription/Auto-Reorder:** Recurring orders
- **Loyalty Integration:** Points redemption during checkout
- **A/B Testing:** Checkout flow experiments
- **Multi-Language:** i18n for checkout flow

---

## 4. Data Model Summary

### 4.1 Cart Items Table (`cart_items`)
```sql
- id (PK)
- user_id (FK)
- store_id (FK)
- brand_id (FK, nullable)
- product_name, product_sku, product_url, product_image_url
- product_description
- price_cents, original_price_cents
- currency (default 'USD')
- size, color (nullable)
- quantity
- in_stock (boolean)
- last_stock_check (timestamp)
- metadata (jsonb) - includes productType, itemId for favorites mapping
- added_at, updated_at
```

### 4.2 Checkout Sessions Table (`checkout_sessions`)
```sql
- id (PK)
- user_id (FK)
- session_id (unique, 'cs_' prefix)
- cart_snapshot (jsonb) - full cart at checkout time
- shipping_address (jsonb)
- billing_address (jsonb, nullable if same-as-shipping)
- payment_method_id (Stripe PM ID, nullable)
- retailer_payment_methods (jsonb) - map of {storeId: token}
- checkout_metadata (jsonb) - NEW: recipient, billing prefs, promo, shipping selections
- subtotal_cents, shipping_cents, tax_cents, total_cents
- currency
- status (pending, processing, completed, failed, cancelled)
- stores_to_process (jsonb) - [{storeId, placementMethod, status, ...}]
- stripe_payment_intent_id
- payment_captured_at
- error_message
- started_at, completed_at, expires_at
- created_at, updated_at
```

### 4.3 Orders Table (`orders`)
```sql
- id (PK)
- user_id (FK)
- checkout_session_id (FK)
- store_id (FK)
- muse_order_number (unique, 'MO-' prefix)
- store_order_number (nullable, from retailer)
- subtotal_cents, shipping_cents, tax_cents, total_cents
- shipping_address (jsonb)
- status (pending, placed, confirmed, shipped, delivered, cancelled, failed)
- placement_method (api, headless, manual, muse)
- placement_error (text, nullable)
- placement_attempts (int, default 0)
- tracking_number
- placed_at, confirmed_at, shipped_at, delivered_at
- created_at, updated_at
```

### 4.4 Order Items Table (`order_items`)
```sql
- id (PK)
- order_id (FK)
- product_name, product_sku, product_url
- product_image_url, product_description
- size, color
- quantity
- unit_price_cents, total_price_cents
- original_price_cents (for discount tracking)
- created_at
```

---

## 5. Implementation Plan for Production Readiness

### Phase 1: Payment & Core Integrations (2-3 weeks)
**Goal:** Enable end-to-end checkout for at least one test store

1. **Stripe Integration (Week 1)**
   - [ ] Implement `StripeService.createPaymentIntent()`
   - [ ] Implement `StripeService.confirmPaymentIntent()`
   - [ ] Add webhook endpoint for payment events (`/api/v1/webhooks/stripe`)
   - [ ] Add payment method tokenization flow
   - [ ] Test mode validation with test cards
   - [ ] Error handling for declined cards, network failures

2. **Store Account Payment Methods (Week 1)**
   - [ ] Migration: `store_account_payment_methods` table
   - [ ] Implement `StoreAccountService.savePaymentMethod()`
   - [ ] Implement `StoreAccountService.getPaymentMethodsForStores()`
   - [ ] Implement `StoreAccountService.getUserStoreAccounts()`
   - [ ] Encryption for stored tokens

3. **Retailer API Integration (Week 2-3)**
   - [ ] Choose pilot retailer (e.g., Shopify-based store)
   - [ ] Implement Shopify OAuth adapter
   - [ ] Implement `RetailerAPIFactory` with Shopify client
   - [ ] Test order placement flow end-to-end
   - [ ] Add error handling & retry logic
   - [ ] Add logging for debugging

4. **Manual Order Queue (Week 2)**
   - [ ] Migration: `manual_order_tasks` table
   - [ ] Implement `ManualOrderService.createManualOrderTask()`
   - [ ] Add ops dashboard endpoint to list/claim tasks
   - [ ] Add Slack webhook notification
   - [ ] Add task completion workflow

### Phase 2: Validation & Accuracy (2 weeks)
**Goal:** Ensure pricing, inventory, and order accuracy

1. **Tax Calculation (Week 4)**
   - [ ] Integrate TaxJar or Avalara
   - [ ] Implement tax lookup service
   - [ ] Update `CheckoutService.placeOrders()` to calculate tax before payment
   - [ ] Add tax breakdown to order response
   - [ ] Test with various US addresses

2. **Shipping Cost Calculation (Week 4)**
   - [ ] Research shipping APIs (EasyPost, ShipEngine)
   - [ ] Implement shipping rate lookup
   - [ ] Add shipping options selection UI contract
   - [ ] Update checkout flow to display shipping costs
   - [ ] Store selected shipping method per order

3. **Stock Validation (Week 5)**
   - [ ] Implement stock check service (retailer API-based)
   - [ ] Add background job to refresh cart item stock status
   - [ ] Real-time validation on checkout initiation
   - [ ] Add "out of stock" handling in checkout flow
   - [ ] Remove unavailable items automatically or warn user

4. **Promo Code System (Week 5)**
   - [ ] Migration: `promo_codes` table
   - [ ] Implement promo validation service
   - [ ] Add discount calculation to cart/checkout
   - [ ] Support store-specific and global promos
   - [ ] Add expiration & usage limit tracking

### Phase 3: Tracking & Operations (1-2 weeks)
**Goal:** Post-purchase visibility and operational tools

1. **Order Tracking (Week 6)**
   - [ ] Webhook handlers for retailer order updates
   - [ ] Background polling job for stores without webhooks
   - [ ] Update order status transitions
   - [ ] Add tracking number updates
   - [ ] User-facing order status API

2. **Session Cleanup (Week 6)**
   - [ ] Background job to archive/delete expired sessions
   - [ ] Add retention policy (e.g., 7 days post-expiration)
   - [ ] Metrics for session completion rate

3. **Ops Dashboard Enhancements (Week 7)**
   - [ ] Manual order task UI (claim, complete, reject)
   - [ ] Failed order retry interface
   - [ ] Order search & filtering
   - [ ] Export orders for accounting

### Phase 4: Scale & Quality (Ongoing)
**Goal:** Prepare for production load and edge cases

1. **Error Handling & Monitoring**
   - [ ] Structured error logging for all checkout steps
   - [ ] Alerting for payment failures, API errors
   - [ ] Sentry integration for exception tracking
   - [ ] Datadog/New Relic for performance monitoring

2. **Testing Coverage**
   - [ ] Unit tests for all service methods (80%+ coverage)
   - [ ] Integration tests for full checkout flow
   - [ ] E2E tests with test retailers
   - [ ] Load testing for concurrent checkouts

3. **Fraud Prevention**
   - [ ] Stripe Radar integration
   - [ ] Velocity checks (orders per user per day)
   - [ ] Address verification service
   - [ ] Manual review queue for high-risk orders

4. **Address Validation**
   - [ ] USPS or SmartyStreets integration
   - [ ] Autocomplete suggestions on frontend
   - [ ] Delivery confidence scoring

---

## 6. High-Priority Test Plan

### 6.1 Unit Tests

#### Cart Service Tests
```javascript
// tests/services/cartService.test.js
describe('CartService', () => {
  describe('addItem', () => {
    test('enforces currency restrictions');
    test('enforces quantity limits per item');
    test('enforces total cart quantity limit');
    test('enforces distinct item limit');
    test('blocks adding items from blocked stores');
    test('blocks adding blocked product types');
    test('merges duplicate items (same SKU, size, color)');
    test('increments quantity when merging');
    test('formats cart item with actions paths');
  });

  describe('getCart', () => {
    test('groups items by store in reverse chronological order');
    test('calculates store subtotals correctly');
    test('includes requirement warnings when approaching limits');
    test('returns empty cart for new user');
  });

  describe('moveItemToFavorites', () => {
    test('removes from cart when removeFromCart=true');
    test('adds to favorites when itemId mapping exists');
    test('returns skipped status when no itemId mapping');
  });

  describe('getCartCount', () => {
    test('returns sum of quantities, not distinct items');
  });
});
```

#### Checkout Service Tests
```javascript
// tests/services/checkoutService.test.js
describe('CheckoutService', () => {
  describe('initiateCheckout', () => {
    test('throws ValidationError when cart is empty');
    test('throws ValidationError when cart violates requirement policies');
    test('blocks checkout when stores are blocked via policy');
    test('blocks checkout when product types are blocked');
    test('determines placement method correctly per store');
    test('populates checkout metadata with shipping options');
    test('populates checkout metadata with store connect hints');
    test('sets expiration to 30 minutes from now');
  });

  describe('getCheckoutReadiness', () => {
    test('returns ready=false when cart is empty');
    test('returns ready=false when stores do not support in-app checkout');
    test('returns ready=false when out-of-stock items present and policy requires in-stock');
    test('includes per-store issues array');
    test('includes requirement blockers and warnings');
  });

  describe('setRecipientInfo', () => {
    test('requires email and phone');
    test('normalizes email to lowercase');
    test('stores in checkout_metadata.recipient');
  });

  describe('setBillingPreferences', () => {
    test('allows sameAsShipping=true with no billing address');
    test('requires billingAddress when sameAsShipping=false');
    test('validates billing address fields');
  });

  describe('applyPromoCode', () => {
    test('requires non-empty code');
    test('stores code and eligible store IDs in metadata');
  });

  describe('setShippingSelections', () => {
    test('requires selections to be an object');
    test('validates storeIds are in session');
    test('requires optionId for each selection');
  });

  describe('placeOrders', () => {
    test('throws when session is expired');
    test('throws when shipping address is missing');
    test('throws when payment method is missing (for MOR stores)');
    test('throws when requirement policies fail');
    test('clears cart on full success');
    test('partially clears cart on partial failure');
    test('returns summary with successful and failed counts');
  });
});
```

#### Requirement Adapter Service Tests
```javascript
// tests/services/requirementAdapterService.test.js (already exists)
- ✅ Policy snapshot retrieval
- ✅ Store ID and product type normalization
- ✅ Product type extraction from nested metadata
- ✅ Checkout cart evaluation (passing/blocking)
- ✅ Out-of-stock blocking
- ✅ Cart requirement warnings at high utilization
- ✅ Blocked store/product type evaluation
- ✅ Allowlist constraint evaluation
```

### 6.2 Integration Tests

```javascript
// tests/integration/checkout-flow.test.js
describe('Full Checkout Flow', () => {
  test('end-to-end: cart -> checkout -> payment -> order placement', async () => {
    // 1. Create user and add items to cart
    // 2. Initiate checkout session
    // 3. Add shipping address
    // 4. Add recipient info
    // 5. Add payment method
    // 6. Apply promo code
    // 7. Set shipping selections
    // 8. Place orders
    // 9. Verify orders created
    // 10. Verify cart cleared
    // 11. Verify payment captured (stub)
  });

  test('partial failure: one store succeeds, one fails', async () => {
    // 1. Add items from two stores
    // 2. Mock one retailer API to fail
    // 3. Place orders
    // 4. Verify partial cart clear
    // 5. Verify session status = partial_failure
  });

  test('requirement blocker: checkout with blocked store', async () => {
    // 1. Set CHECKOUT_BLOCKED_STORE_IDS=42 in test env
    // 2. Add item from store 42
    // 3. Attempt checkout initiation
    // 4. Expect ValidationError with blocker details
  });
});
```

### 6.3 E2E API Tests

```javascript
// tests/e2e/cart-api.test.js
describe('Cart API E2E', () => {
  test('POST /cart/items - adds item and returns formatted response');
  test('POST /cart/items/batch - handles mixed success/failure');
  test('GET /cart - returns grouped stores with requirements');
  test('GET /cart/count - returns badge count');
  test('POST /cart/items/:id/move-to-favorites - swipe action');
  test('DELETE /cart/items/:id - removes item');
  test('DELETE /cart - clears entire cart');
});

// tests/e2e/checkout-api.test.js
describe('Checkout API E2E', () => {
  test('GET /checkout/readiness - returns readiness status');
  test('POST /checkout/sessions - creates session from cart');
  test('PUT /checkout/sessions/:id/shipping - validates address');
  test('PUT /checkout/sessions/:id/recipient - requires email & phone');
  test('PUT /checkout/sessions/:id/billing - validates billing address');
  test('PUT /checkout/sessions/:id/payment - saves payment method');
  test('PUT /checkout/sessions/:id/promo - applies promo code');
  test('PUT /checkout/sessions/:id/shipping-options - validates selections');
  test('POST /checkout/sessions/:id/place - requires all prerequisites');
});
```

### 6.4 Performance Tests

```javascript
// tests/performance/cart-load.test.js
describe('Cart Performance', () => {
  test('getCart with 50 items across 10 stores completes <500ms');
  test('addItem enforces requirement checks <100ms');
  test('getCartCount query optimized <50ms');
});

// tests/performance/checkout-concurrency.test.js
describe('Checkout Concurrency', () => {
  test('10 concurrent checkout initiations do not deadlock');
  test('placeOrders with 5 stores in parallel completes <10s');
});
```

### 6.5 Migration Validation Tests

```javascript
// tests/migrations/059-checkout-metadata.test.js
describe('Migration 059', () => {
  test('adds checkout_metadata column with jsonb default');
  test('existing sessions have empty object as metadata');
  test('can insert and retrieve complex metadata');
});
```

---

## 7. Breaking Changes & Deprecations

### None Identified
- All new endpoints are additive
- Existing cart/checkout endpoints maintain backward compatibility
- New fields in responses are optional and do not break existing clients

### Future Deprecation Candidates
- `GET /cart/summary` may be redundant with `GET /cart` (includes summary)
- Consider consolidating once frontend migrates

---

## 8. Deployment Checklist

### Pre-Production
- [ ] Run migration 059 on staging database
- [ ] Set all `CART_*` and `CHECKOUT_*` env vars in staging
- [ ] Verify requirement adapter policy loads correctly
- [ ] Test cart add with various scenarios (blocked stores, product types)
- [ ] Test checkout initiation with policy violations
- [ ] Verify readiness endpoint returns correct issues
- [ ] Test all new checkout metadata endpoints

### Production Deploy
- [ ] Run migration 059 on production database (zero downtime)
- [ ] Set production env vars for requirement adapters
- [ ] Deploy backend with new code
- [ ] Monitor error logs for validation errors
- [ ] Monitor checkout session creation rate
- [ ] Monitor cart badge count query performance
- [ ] Verify no impact on existing cart/checkout flows

### Post-Deploy Monitoring
- [ ] Track checkout abandonment rate by step
- [ ] Monitor requirement policy violation frequency
- [ ] Alert on increased payment failures
- [ ] Alert on API integration errors (RetailerAPIFactory stubs)

---

## 9. Open Questions for Product/Business

1. **Requirement Policy Enforcement:**
   - Should blocked stores/product types return 400 errors or soft warnings?
   - Current: Hard blocks with ValidationError
   - Alternative: Allow add but flag items as non-checkout-eligible

2. **Promo Code Validation:**
   - Should promo codes be validated on apply (PUT /promo) or on place orders?
   - Should invalid codes return errors or just ignore them?

3. **Stock Validation:**
   - How often should background job refresh cart item stock?
   - Should out-of-stock items auto-remove from cart or just flag?

4. **Session Expiration:**
   - 30 minutes sufficient? Should be configurable?
   - Grace period before deletion?

5. **Payment Flow:**
   - Should we support "save for later" payment methods at user level?
   - Or always require payment method per checkout session?

6. **Multi-Currency:**
   - Priority for international expansion?
   - If yes, need currency conversion service integration

7. **Manual Order Fulfillment:**
   - What SLA for ops team to process manual orders?
   - Should users be notified when order requires manual processing?

---

## 10. Summary & Next Steps

### What's Complete ✅
- **Cart API:** Full CRUD with requirement adapter enforcement
- **Checkout API:** Session management, metadata scaffolding, readiness checks
- **Requirement Adapters:** Env-driven policy configuration with enforcement
- **Database Schema:** Migrations complete, checkout_metadata added
- **Tests:** Requirement adapter service covered, controller/service ready for tests

### What's Missing ❌
- **Payment Processing:** Stripe integration (critical blocker)
- **Retailer Integrations:** API clients for order placement (critical blocker)
- **Stock Validation:** Real-time inventory checks (high priority)
- **Tax/Shipping:** Accurate cost calculation (high priority)
- **Promo Codes:** Validation and discount application (medium priority)
- **Order Tracking:** Post-placement status updates (medium priority)

### Recommended Immediate Actions
1. **Run migration 059** on dev/staging databases
2. **Add env vars** to .env files (already in .env.example)
3. **Implement Stripe integration** (Phase 1, Week 1)
4. **Choose pilot retailer** and implement API adapter (Phase 1, Week 2-3)
5. **Write unit tests** for CartService and CheckoutService (Phase 4)
6. **Deploy to staging** and validate end-to-end flow with test data

### Risk Assessment
- **HIGH RISK:** Deploying to production without payment/retailer integrations will result in failed checkouts
- **MEDIUM RISK:** Missing stock validation may lead to out-of-stock order failures
- **LOW RISK:** Requirement adapters are defensive and will prevent invalid checkouts

### Timeline Estimate
- **Minimum Viable Checkout:** 3-4 weeks (Stripe + 1 retailer + manual queue)
- **Production-Ready Checkout:** 6-8 weeks (add tax, shipping, stock, promos)
- **Fully Scaled Checkout:** 10-12 weeks (add tracking, fraud, multiple retailers)

---

**Document Owner:** Backend Engineering
**Last Updated:** 2026-02-08
**Next Review:** After Phase 1 completion
