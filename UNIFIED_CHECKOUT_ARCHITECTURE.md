# Unified Checkout Architecture - AliExpress Model for Fashion

## Vision

**Complete checkout WITHIN Muse** - Users never leave the app. Like AliExpress where you buy from multiple stores but checkout in one place, Muse enables:
- Add products from Nordstrom, Macy's, Old Navy to ONE cart
- One unified checkout flow
- Multiple order numbers generated (one per store)
- All orders tracked in Muse

## The Problem with Current Fashion Aggregators

### Phia & Daydream (Current Approach)
```
User finds product on aggregator
→ Clicks "Buy" button
→ Redirects to brand/store website
→ User completes checkout on external site
→ User returns to aggregator (maybe)
```

**Why this is broken:**
1. **Context switching** - User has to create account on each store
2. **Lost trust** - Redirecting feels like abandonment
3. **No unified tracking** - Orders scattered across multiple sites
4. **High abandonment** - 70%+ drop-off on redirect
5. **Poor UX** - Have to enter shipping/payment 5+ times

### AliExpress Model (Gold Standard)
```
User adds 5 products from 3 different stores to cart
→ Views unified cart (all items together)
→ Single checkout flow with ONE shipping address, ONE payment method
→ Completes purchase
→ Receives 3 separate order numbers (one per store)
→ All orders tracked in AliExpress app
```

**Why this works:**
1. **No context switching** - Everything happens in-app
2. **Trust & control** - User never leaves platform
3. **Unified experience** - One shipping address, one payment
4. **Lower abandonment** - Seamless flow increases conversion
5. **Better tracking** - All orders in one place

---

## Muse's Unified Checkout System

### Three Integration Tiers

#### Tier 1: Full API Integration (OAuth) 🏆
**Stores:** Walmart, Target, potentially Gap Inc

**Capabilities:**
- ✅ Complete checkout within Muse
- ✅ Access stored payment methods
- ✅ Access saved addresses
- ✅ Real-time inventory sync
- ✅ Order status tracking
- ✅ Returns & exchanges

**Flow:**
```
User logs into Walmart via OAuth in Muse
→ Muse stores encrypted OAuth tokens
→ User adds Walmart product to Muse cart
→ At checkout, Muse calls Walmart API
→ Uses user's saved Walmart payment/address
→ Generates Walmart order number
→ Order tracked in Muse + visible on Walmart.com
```

---

#### Tier 2: Headless Browser Automation 🤖
**Stores:** Nordstrom, Macy's, Old Navy, most fashion retailers

**Capabilities:**
- ✅ Complete checkout within Muse
- ✅ Uses stored credentials (encrypted)
- ✅ Automates checkout flow
- ⚠️ Requires credential storage with user consent
- ⚠️ More fragile (breaks if store changes UI)

**Flow:**
```
User stores Nordstrom login in Muse (encrypted)
→ User adds Nordstrom product to Muse cart
→ At checkout, Puppeteer launches headless browser
→ Logs into Nordstrom.com with stored credentials
→ Adds items to Nordstrom cart
→ Enters shipping/payment from Muse
→ Completes checkout
→ Extracts order number
→ Returns order confirmation to Muse
```

**Technology Stack:**
- **Puppeteer** - Headless Chrome for automation
- **Cookie management** - Maintain sessions
- **CAPTCHA handling** - Anti-bot detection
- **Error recovery** - Retry logic for failures

---

#### Tier 3: Smart Redirect (Cart Pre-fill) 🔄
**Stores:** Boutiques, stores without APIs

**Capabilities:**
- ⚠️ Partial integration
- ✅ Pre-fills cart via URL parameters
- ✅ Redirects to store checkout
- ❌ User completes checkout on store site
- ✅ Order tracking via email scanning

**Flow:**
```
User adds boutique product to Muse cart
→ At checkout, Muse generates cart URL
→ URL includes: product SKUs, quantities, affiliate tracking
→ Opens store site in embedded browser or new tab
→ Cart pre-populated with items
→ User completes checkout on store site
→ Muse detects order via email scanning
→ Order appears in Muse tracking
```

---

## Unified Cart Experience

### Multi-Store Cart UI

```
┌────────────────────────────────────────────┐
│  Your Cart (3 stores, 5 items)            │
├────────────────────────────────────────────┤
│                                             │
│  🏬 Nordstrom (2 items)                    │
│  ├─ Black Dress - Size M    $89.00        │
│  └─ Leather Boots - Size 8  $159.00       │
│     Subtotal: $248.00                      │
│     Shipping: FREE                          │
│     ✓ Checkout within Muse                 │
│                                             │
│  🏬 Macy's (1 item)                        │
│  └─ Gold Necklace           $45.00        │
│     Subtotal: $45.00                       │
│     Shipping: $5.95                         │
│     ✓ Checkout within Muse                 │
│                                             │
│  🏬 Old Navy (2 items)                     │
│  ├─ Jeans - Size 32         $39.99        │
│  └─ T-shirt - Size L        $12.99        │
│     Subtotal: $52.98                       │
│     Shipping: FREE (over $50)              │
│     ⚠️ Redirects to Old Navy checkout      │
│                                             │
├────────────────────────────────────────────┤
│  Total: $351.93                            │
│  [Checkout All Stores] ─────────────────▶  │
└────────────────────────────────────────────┘
```

### Checkout Flow

```
User clicks "Checkout All Stores"

Step 1: Shipping Address (once for all)
┌─────────────────────────┐
│  Where should we ship?  │
│  [Select saved address] │
│  or                     │
│  [Enter new address]    │
└─────────────────────────┘

Step 2: Payment Method (once for all)
┌─────────────────────────┐
│  How will you pay?      │
│  [Select saved card]    │
│  or                     │
│  [Enter new card]       │
└─────────────────────────┘

Step 3: Review & Confirm
┌─────────────────────────────────────┐
│  Review Your Order                  │
│                                      │
│  🏬 Nordstrom - $248.00             │
│     → Order will be placed          │
│                                      │
│  🏬 Macy's - $50.95                 │
│     → Order will be placed          │
│                                      │
│  🏬 Old Navy - $52.98               │
│     → You'll complete on Old Navy   │
│                                      │
│  Total: $351.93                     │
│  [Place Orders] ──────────────────▶ │
└─────────────────────────────────────┘

Step 4: Processing (Real-time feedback)
┌─────────────────────────────────────┐
│  Placing Your Orders...             │
│                                      │
│  ✓ Nordstrom - Order #ND-12345     │
│  ⏳ Macy's - Processing...          │
│  ⏸️ Old Navy - Waiting...           │
└─────────────────────────────────────┘

Step 5: Confirmation
┌─────────────────────────────────────┐
│  All Orders Placed! 🎉              │
│                                      │
│  ✓ Nordstrom - Order #ND-12345     │
│     Arriving Thu, Feb 6             │
│                                      │
│  ✓ Macy's - Order #MC-67890        │
│     Arriving Fri, Feb 7             │
│                                      │
│  → Complete Old Navy checkout       │
│     [Continue to Old Navy] ────▶    │
│                                      │
│  [View All Orders] ──────────────▶  │
└─────────────────────────────────────┘
```

---

## Backend Architecture

### Database Schema

#### cart_items
```sql
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  store_id INT NOT NULL REFERENCES stores(id),
  brand_id INT REFERENCES brands(id),

  -- Product details
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_url TEXT NOT NULL,
  product_image_url TEXT,

  -- Pricing
  price_cents INT NOT NULL,
  original_price_cents INT, -- For showing discounts

  -- Variant details
  size VARCHAR(50),
  color VARCHAR(50),
  quantity INT DEFAULT 1,

  -- Availability
  in_stock BOOLEAN DEFAULT true,
  last_stock_check TIMESTAMP,

  -- Metadata
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, store_id, product_sku, size, color)
);

CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_store ON cart_items(store_id);
```

#### orders
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  store_id INT NOT NULL REFERENCES stores(id),

  -- Order identification
  order_number VARCHAR(100) NOT NULL, -- Store's order number
  muse_order_id VARCHAR(50) NOT NULL UNIQUE, -- Muse's tracking ID

  -- Order details
  subtotal_cents INT NOT NULL,
  shipping_cents INT DEFAULT 0,
  tax_cents INT DEFAULT 0,
  total_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Fulfillment
  order_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),
  estimated_delivery DATE,

  -- Checkout details
  checkout_method VARCHAR(50), -- 'oauth_api', 'headless', 'redirect'
  shipping_address JSONB,

  -- Timestamps
  placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(order_status);
```

#### order_items
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_url TEXT,
  product_image_url TEXT,

  size VARCHAR(50),
  color VARCHAR(50),
  quantity INT NOT NULL,

  unit_price_cents INT NOT NULL,
  total_price_cents INT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

#### checkout_sessions
```sql
CREATE TABLE checkout_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  session_id VARCHAR(100) NOT NULL UNIQUE,

  -- Cart snapshot
  cart_items JSONB NOT NULL,

  -- Checkout info
  shipping_address JSONB,
  payment_method_id VARCHAR(100), -- Reference to payment service

  -- Progress tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  stores_to_checkout JSONB, -- [{ storeId, method, status }]
  completed_orders JSONB, -- [{ storeId, orderNumber, status }]

  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP, -- 30 min expiration

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkout_user ON checkout_sessions(user_id);
CREATE INDEX idx_checkout_session ON checkout_sessions(session_id);
```

---

## API Endpoints

### Cart Management
```
POST   /api/v1/cart/items                  - Add item to cart
GET    /api/v1/cart                        - Get user's cart
PUT    /api/v1/cart/items/:id              - Update cart item (quantity, size, etc.)
DELETE /api/v1/cart/items/:id              - Remove from cart
DELETE /api/v1/cart                        - Clear entire cart
GET    /api/v1/cart/summary                - Cart totals by store
POST   /api/v1/cart/items/batch            - Add multiple items
```

### Checkout
```
POST   /api/v1/checkout/sessions           - Initiate checkout session
PUT    /api/v1/checkout/sessions/:id/shipping - Add shipping address
PUT    /api/v1/checkout/sessions/:id/payment  - Add payment method
POST   /api/v1/checkout/sessions/:id/place    - Place orders
GET    /api/v1/checkout/sessions/:id/status   - Get checkout progress
```

### Orders
```
GET    /api/v1/orders                      - Get all user's orders
GET    /api/v1/orders/:id                  - Get order details
GET    /api/v1/orders/:id/tracking         - Get tracking info
PUT    /api/v1/orders/:id/cancel           - Cancel order (if possible)
POST   /api/v1/orders/:id/return           - Initiate return
```

---

## Implementation Phases

### Phase 1: Basic Cart (Week 1) ⚡
**Goal:** Users can add items from multiple stores to cart

**Tasks:**
1. Create cart database tables
2. Build CartService with add/remove/update
3. Create cart API endpoints
4. Basic cart UI (list view)

**Deliverable:** Multi-store cart that persists items

---

### Phase 2: Checkout Session (Week 2) 🔄
**Goal:** Unified checkout flow with shipping/payment

**Tasks:**
1. Create checkout_sessions table
2. Build CheckoutService to orchestrate flow
3. Stripe integration for payment processing
4. Address validation service
5. Checkout UI (shipping → payment → review)

**Deliverable:** Complete checkout flow (no actual store orders yet)

---

### Phase 3: Tier 3 Implementation (Week 3) 🔗
**Goal:** Smart redirect with cart pre-fill

**Tasks:**
1. Build URL generator for each store
2. Test cart pre-fill parameters
3. Implement affiliate tracking
4. Post-checkout order detection via email

**Deliverable:** Redirect checkout works for all stores

---

### Phase 4: Tier 2 Implementation (Week 4-5) 🤖
**Goal:** Headless browser automation for major stores

**Tasks:**
1. Set up Puppeteer infrastructure
2. Build generic checkout automation framework
3. Implement store-specific scrapers:
   - Nordstrom
   - Macy's
   - Old Navy
4. CAPTCHA detection and handling
5. Session management and cookies
6. Error recovery and retry logic

**Deliverable:** Automated checkout for 3+ major stores

---

### Phase 5: Tier 1 Implementation (Week 6-8) 🏆
**Goal:** Full API integration with OAuth stores

**Tasks:**
1. Research Walmart API documentation
2. Implement Walmart OAuth flow
3. Build order placement via Walmart API
4. Test with Walmart developer sandbox
5. Repeat for Target
6. Real-time inventory sync

**Deliverable:** Full API checkout for Walmart/Target

---

## Technical Challenges & Solutions

### Challenge 1: Payment Processing
**Problem:** Each store has different payment requirements

**Solutions:**
- **Stripe Connect** - Act as payment facilitator, split payments per store
- **Store stored payment** - Use OAuth to access user's saved cards at each store
- **Headless automation** - Enter payment details via automation (risky)

**Recommended:** Stripe Connect + Store OAuth where available

---

### Challenge 2: Anti-Bot Detection
**Problem:** Stores detect and block headless browsers

**Solutions:**
- **Stealth mode** - Use puppeteer-extra-plugin-stealth
- **Residential proxies** - Rotate IP addresses
- **Human-like behavior** - Random delays, mouse movements
- **CAPTCHA services** - 2Captcha, Anti-Captcha for solving
- **Cookie fingerprinting** - Maintain realistic browser fingerprint

---

### Challenge 3: Store UI Changes
**Problem:** Stores update UI, breaking automation

**Solutions:**
- **Selector fallbacks** - Multiple CSS selectors for same element
- **Visual regression testing** - Detect UI changes
- **Monitoring & alerts** - Notify when automation fails
- **Graceful degradation** - Fall back to Tier 3 if automation fails

---

### Challenge 4: Session Management
**Problem:** Maintaining logged-in state across checkouts

**Solutions:**
- **Cookie persistence** - Save session cookies in encrypted storage
- **Token refresh** - Automatically refresh OAuth tokens
- **Re-authentication** - Prompt user if session expired
- **Session pooling** - Maintain multiple sessions per user

---

### Challenge 5: Order Tracking
**Problem:** Need real-time order status from stores

**Solutions:**
- **Email scanning** - Parse tracking emails automatically
- **Store APIs** - Fetch order status via OAuth (Tier 1)
- **Web scraping** - Log into store and scrape order page (Tier 2)
- **Webhook integration** - Store notifies Muse of updates (ideal)

---

## Security & Compliance

### PCI Compliance
- **Never store raw credit card numbers**
- Use tokenization (Stripe tokens)
- For headless automation, enter card details directly on store site

### Credential Storage
- **AES-256 encryption** for stored passwords
- **Key derivation** - Unique encryption key per user
- **User consent** - Clear disclosure before storing credentials
- **Easy deletion** - One-click to remove all stored credentials

### Legal Considerations
- **Terms of Service** - Ensure automation doesn't violate store ToS
- **Affiliate agreements** - Maintain proper affiliate disclosures
- **Data privacy** - GDPR/CCPA compliance for stored data
- **Liability** - Clear disclaimers about order completion

---

## Success Metrics

### Conversion Metrics
- **Cart abandonment rate** - Target: <30% (vs 70% for redirects)
- **Multi-store checkout rate** - % of carts with 2+ stores
- **Checkout completion rate** - Target: >80%
- **Time to checkout** - Target: <2 minutes

### Operational Metrics
- **Automation success rate** - Target: >95% for Tier 2
- **Average checkout latency** - Target: <10 seconds per store
- **Error rate** - Target: <5%
- **Order tracking accuracy** - Target: >98%

### Business Metrics
- **Average order value** - Should increase with multi-store cart
- **Orders per user** - Target: 2x vs single-store
- **Retention rate** - Users who complete 2nd purchase
- **Commission revenue** - From affiliate links

---

## Competitive Advantage

### Why Muse Wins

1. **True Unified Checkout** - Only app with complete in-app checkout
2. **No Context Switching** - Users never leave Muse
3. **Better UX** - One address, one payment, multiple orders
4. **Order Tracking** - All orders in one place
5. **Price Comparison** - See same item across stores in cart
6. **Smart Recommendations** - "This dress is $10 cheaper at Nordstrom Rack"

### vs Phia/Daydream
| Feature | Muse | Phia/Daydream |
|---------|------|---------------|
| Checkout location | In-app ✅ | External redirect ❌ |
| Multi-store cart | Yes ✅ | No ❌ |
| Unified payment | One payment ✅ | Multiple payments ❌ |
| Order tracking | Centralized ✅ | Scattered ❌ |
| Conversion rate | High (~80%) ✅ | Low (~30%) ❌ |

---

## Next Steps

1. **Build Phase 1 (Cart)** - Start with basic multi-store cart
2. **Stripe Setup** - Integrate payment processing
3. **Test Tier 3** - Implement redirect checkout for all stores
4. **Research APIs** - Investigate Walmart/Target API access
5. **Puppeteer POC** - Build proof-of-concept for Nordstrom automation

---

**Ready to build the future of fashion shopping! 🚀**
