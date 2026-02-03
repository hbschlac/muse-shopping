# Connect Scaffolding - Store Account Linking System

## Overview

**Purpose:** Enable users to link their existing store accounts (Old Navy, Nordstrom, Commense, etc.) to Muse for unified checkout.

**Goal:** When a user shops on Muse, they can checkout items from multiple stores in one transaction because we have their account credentials/authorization.

**Model:** Similar to how ChatGPT checkout works with Walmart, or how ShopAll enables checkout from Dolce Vita brand store.

---

## Architecture Components

### 1. Store Registry
**What:** Master list of stores we support

**Database Table:** `stores`

### 2. User Store Accounts
**What:** Track which stores each user has accounts at

**Database Table:** `user_store_accounts`

### 3. Account Detection
**What:** Scan emails to identify which stores user shops at

**Enhancement:** Update `emailScannerService.js`

### 4. Account Linking Flow
**What:** OAuth or redirect flow to connect user's store account

**API Routes:** `/api/v1/store-accounts/*`

### 5. Checkout Integration
**What:** Use linked accounts to enable unified checkout

**Future:** Checkout service that calls store APIs

---

## Database Schema

### Table: `stores`

```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255), -- "Old Navy" vs "OLD NAVY"
  description TEXT,
  logo_url TEXT,
  website_url TEXT NOT NULL,

  -- Integration method
  integration_type VARCHAR(50) NOT NULL, -- 'oauth', 'redirect', 'api', 'manual'
  oauth_config JSONB, -- OAuth credentials if applicable
  api_config JSONB, -- API endpoints if applicable

  -- Capabilities
  supports_checkout BOOLEAN DEFAULT false,
  supports_order_history BOOLEAN DEFAULT false,
  supports_cart_api BOOLEAN DEFAULT false,

  -- Metadata
  category VARCHAR(100), -- 'fashion', 'home', 'beauty', etc.
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example stores:
INSERT INTO stores (name, slug, display_name, website_url, integration_type, supports_checkout) VALUES
('oldnavy', 'old-navy', 'Old Navy', 'https://oldnavy.gap.com', 'redirect', true),
('nordstrom', 'nordstrom', 'Nordstrom', 'https://www.nordstrom.com', 'redirect', true),
('nordstromrack', 'nordstrom-rack', 'Nordstrom Rack', 'https://www.nordstromrack.com', 'redirect', true),
('target', 'target', 'Target', 'https://www.target.com', 'redirect', true),
('walmart', 'walmart', 'Walmart', 'https://www.walmart.com', 'api', true),
('amazon', 'amazon', 'Amazon', 'https://www.amazon.com', 'manual', false);
```

### Table: `store_aliases`

```sql
CREATE TABLE store_aliases (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  alias_type VARCHAR(50) NOT NULL, -- 'email_domain', 'subdomain', 'display_name'
  alias_value VARCHAR(255) NOT NULL,
  confidence_score INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(alias_value, alias_type)
);

CREATE INDEX idx_store_aliases_store_id ON store_aliases(store_id);
CREATE INDEX idx_store_aliases_type ON store_aliases(alias_type);
CREATE INDEX idx_store_aliases_value ON store_aliases(alias_value);

-- Example aliases:
INSERT INTO store_aliases (store_id, alias_type, alias_value) VALUES
(1, 'email_domain', 'oldnavy.com'),
(1, 'email_domain', 'gap.com'), -- Old Navy owned by Gap
(2, 'email_domain', 'eml.nordstrom.com'),
(2, 'email_domain', 'nordstrom.com'),
(3, 'email_domain', 'eml.nordstromrack.com'),
(3, 'email_domain', 'nordstromrack.com'),
(4, 'email_domain', 'target.com'),
(4, 'email_domain', 'email.target.com'),
(5, 'email_domain', 'walmart.com'),
(5, 'email_domain', 'info.walmart.com');
```

### Table: `user_store_accounts`

```sql
CREATE TABLE user_store_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Account identification
  account_email VARCHAR(255), -- Email user uses for this store
  account_identifier TEXT, -- Store-specific customer ID if available

  -- Linking status
  is_linked BOOLEAN DEFAULT false, -- Has user authorized Muse to access?
  linking_method VARCHAR(50), -- 'auto_detected', 'manual', 'oauth'

  -- OAuth tokens (encrypted)
  oauth_access_token_encrypted TEXT,
  oauth_refresh_token_encrypted TEXT,
  oauth_token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Detection metadata
  first_detected_at TIMESTAMP WITH TIME ZONE, -- When we first saw them shop here
  last_order_detected_at TIMESTAMP WITH TIME ZONE, -- Most recent order we found
  total_orders_detected INTEGER DEFAULT 0, -- How many times we saw orders

  -- Verification
  is_verified BOOLEAN DEFAULT false, -- Did we confirm account ownership?
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verified_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_user_store_accounts_user_id ON user_store_accounts(user_id);
CREATE INDEX idx_user_store_accounts_store_id ON user_store_accounts(store_id);
CREATE INDEX idx_user_store_accounts_linked ON user_store_accounts(is_linked);
```

### Table: `store_order_history`

```sql
CREATE TABLE store_order_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_store_account_id INTEGER REFERENCES user_store_accounts(id) ON DELETE SET NULL,

  -- Order details
  order_number VARCHAR(255), -- Store's order number
  order_date TIMESTAMP WITH TIME ZONE,
  order_total_cents INTEGER, -- Total in cents
  order_currency VARCHAR(3) DEFAULT 'USD',

  -- Source
  detected_from VARCHAR(50), -- 'email_scan', 'api_sync', 'manual_entry'
  source_email_id VARCHAR(255), -- Gmail message ID if from email

  -- Parsed data
  items_detected JSONB DEFAULT '[]', -- Products we identified
  raw_data JSONB DEFAULT '{}', -- Raw email/API data

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_store_order_history_user_id ON store_order_history(user_id);
CREATE INDEX idx_store_order_history_store_id ON store_order_history(store_id);
CREATE INDEX idx_store_order_history_date ON store_order_history(order_date DESC);
```

---

## Enhanced Email Scanner

### Current Flow
1. Scan emails → Extract sender domains → Match to brands → Auto-follow brands

### Enhanced Flow
1. Scan emails → Extract sender domains
2. Match to **BOTH** brands AND stores
3. Extract account email (To: field)
4. Extract order details (order number, date, total)
5. Create `user_store_accounts` records
6. Create `store_order_history` records
7. Auto-follow brands
8. Notify user of detected accounts

### Code Changes

**File:** `src/services/emailScannerService.js`

Add new method:
```javascript
/**
 * Enhanced email scan that detects both brands AND stores
 * Creates store account records and order history
 */
static async scanEmailsForBrandsAndStores(userId) {
  // ... existing scan logic ...

  const storeMatches = [];
  const orderHistory = [];

  for (const email of emails) {
    // Extract store from sender
    const storeMatch = await this.matchEmailToStore(email);
    if (storeMatch) {
      storeMatches.push({
        storeId: storeMatch.id,
        storeName: storeMatch.name,
        accountEmail: email.to, // User's email at this store
        orderNumber: this.extractOrderNumber(email.body),
        orderDate: email.date,
        orderTotal: this.extractOrderTotal(email.body)
      });
    }
  }

  // Create user_store_accounts records
  await this.createStoreAccountRecords(userId, storeMatches);

  // Create order history
  await this.createOrderHistoryRecords(userId, storeMatches);

  return {
    brandsFound: [...],
    storesDetected: storeMatches,
    orderHistoryCreated: orderHistory
  };
}

/**
 * Match email sender to store using store_aliases
 */
static async matchEmailToStore(email) {
  const domain = this.extractDomain(email.from);

  // Query store_aliases table
  const result = await db.query(`
    SELECT s.*
    FROM stores s
    JOIN store_aliases sa ON s.id = sa.store_id
    WHERE sa.alias_value = $1 AND sa.is_active = true
    LIMIT 1
  `, [domain]);

  return result.rows[0] || null;
}

/**
 * Create or update user_store_accounts based on scan
 */
static async createStoreAccountRecords(userId, storeMatches) {
  for (const match of storeMatches) {
    await db.query(`
      INSERT INTO user_store_accounts (
        user_id,
        store_id,
        account_email,
        linking_method,
        first_detected_at,
        last_order_detected_at,
        total_orders_detected
      )
      VALUES ($1, $2, $3, 'auto_detected', NOW(), $4, 1)
      ON CONFLICT (user_id, store_id)
      DO UPDATE SET
        last_order_detected_at = EXCLUDED.last_order_detected_at,
        total_orders_detected = user_store_accounts.total_orders_detected + 1,
        updated_at = NOW()
    `, [userId, match.storeId, match.accountEmail, match.orderDate]);
  }
}
```

---

## API Routes

### File: `src/routes/storeAccountRoutes.js`

```javascript
const express = require('express');
const StoreAccountController = require('../controllers/storeAccountController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/store-accounts
 * @desc    Get all store accounts for current user
 * @access  Private
 * @returns Array of store accounts with linking status
 */
router.get('/', StoreAccountController.getUserStoreAccounts);

/**
 * @route   GET /api/v1/store-accounts/detected
 * @desc    Get auto-detected stores (not yet linked)
 * @access  Private
 * @returns Array of stores we found in email scan
 */
router.get('/detected', StoreAccountController.getDetectedStores);

/**
 * @route   POST /api/v1/store-accounts/:storeId/link
 * @desc    Initiate account linking for a store
 * @access  Private
 * @returns Linking URL or instructions
 */
router.post('/:storeId/link', StoreAccountController.initiateStoreLinking);

/**
 * @route   GET /api/v1/store-accounts/callback/:storeId
 * @desc    Handle OAuth callback from store
 * @access  Public (called by store)
 */
router.get('/callback/:storeId', StoreAccountController.handleStoreLinkingCallback);

/**
 * @route   DELETE /api/v1/store-accounts/:storeId
 * @desc    Unlink a store account
 * @access  Private
 */
router.delete('/:storeId', StoreAccountController.unlinkStore);

/**
 * @route   GET /api/v1/store-accounts/:storeId/orders
 * @desc    Get order history for a specific store
 * @access  Private
 */
router.get('/:storeId/orders', StoreAccountController.getStoreOrderHistory);

module.exports = router;
```

---

## User Experience Flow

### 1. Email Scan Detects Stores

**After Gmail Connection:**
```
✅ Gmail connected successfully!

We found you shop at these stores:
• Nordstrom (12 orders in past year)
• Old Navy (8 orders in past year)
• Nordstrom Rack (5 orders in past year)
• Cider (3 orders in past year)

[Link My Accounts] to enable 1-click checkout
```

### 2. View Detected Accounts

**User Dashboard:**
```
Connected Stores (0 linked)

Nordstrom                          [Link Account]
└─ hbschlac@gmail.com
└─ 12 orders detected

Old Navy                           [Link Account]
└─ hbschlac@gmail.com
└─ 8 orders detected

Nordstrom Rack                     [Link Account]
└─ hbschlac@gmail.com
└─ 5 orders detected

Cider                              [Link Account]
└─ hbschlac@gmail.com
└─ 3 orders detected
```

### 3. Link Account Flow

**Option A: OAuth (Walmart, Target)**
1. User clicks [Link Account] for Walmart
2. Redirect to Walmart OAuth page
3. User authorizes Muse
4. Callback to Muse with access token
5. Store encrypted token in database
6. ✅ Account linked!

**Option B: Redirect (Old Navy, Nordstrom)**
1. User clicks [Link Account] for Old Navy
2. Show instructions:
   ```
   To enable checkout on Muse:
   1. Make sure you're logged into Old Navy
   2. Click [Verify Account]
   3. We'll redirect you to Old Navy
   4. Come back to complete linking
   ```
3. Redirect to Old Navy with return URL
4. User returns to Muse
5. ✅ Account linked!

**Option C: Manual (Amazon - doesn't allow third-party)**
1. User clicks [Link Account] for Amazon
2. Show message:
   ```
   Amazon doesn't support third-party checkout.
   When you add Amazon items to cart, we'll
   redirect you to Amazon to complete purchase.
   ```

### 4. Shopping with Linked Accounts

**Muse Product Page:**
```
Lucy Floral Dress
$89.00

Available at:
• Nordstrom ✅ Linked
• Bloomingdale's [Link Account]

[Add to Cart - Checkout on Muse] ← Enabled because Nordstrom linked
[View on Nordstrom.com]
```

### 5. Multi-Store Cart

**Cart Page:**
```
Your Cart (3 stores, all linked ✅)

Old Navy ✅
├─ High-Waisted Jeans x2 ......... $80.00

Nordstrom ✅
├─ Lucy Floral Dress ............. $89.00

Nordstrom Rack ✅
├─ Winter Jacket ................. $65.00

Total: $234.00

[Checkout on Muse] ← Enabled!
One click, 3 separate order numbers
```

---

## Integration Types

### Type 1: OAuth API (Best)
**Examples:** Walmart, Target (if they offer it)
**How it works:**
- User authorizes Muse via OAuth
- We get access token + refresh token
- Can call their checkout API directly
- Can sync order history
- Can add to cart via API

**Implementation:**
```javascript
// Create order via store API
const response = await axios.post(
  'https://api.walmart.com/v1/orders',
  {
    items: [...],
    shipping_address: {...},
    payment_method: 'stored' // Use their saved payment
  },
  {
    headers: {
      'Authorization': `Bearer ${decryptedAccessToken}`
    }
  }
);
```

### Type 2: Redirect Checkout (Good)
**Examples:** Old Navy, Nordstrom, most stores
**How it works:**
- User logs into store (we verify via cookie/session)
- We pre-fill cart via URL parameters
- Redirect to store checkout page
- User completes purchase on store site
- Store redirects back to Muse with order number

**Implementation:**
```javascript
// Build pre-filled cart URL
const checkoutUrl = buildStoreCheckoutUrl('oldnavy', {
  items: [
    { sku: 'ON-JEANS-123', quantity: 2 },
  ],
  returnUrl: 'https://muse.com/order-complete'
});

// Redirect user
res.redirect(checkoutUrl);
```

### Type 3: Manual (Fallback)
**Examples:** Amazon (doesn't allow third-party)
**How it works:**
- We open product page in new tab
- User completes purchase manually
- No unified checkout
- Still track in order history if they forward email

---

## Security Considerations

### 1. Token Encryption
All OAuth tokens encrypted with AES-256-GCM:
```javascript
const { encryptToken, decryptToken } = require('../utils/encryption');

// Store
const encrypted = encryptToken(accessToken);
await db.query('UPDATE user_store_accounts SET oauth_access_token_encrypted = $1', [encrypted]);

// Retrieve
const encrypted = result.rows[0].oauth_access_token_encrypted;
const accessToken = decryptToken(encrypted);
```

### 2. Account Verification
Before linking, verify user owns the account:
```javascript
// Option 1: OAuth flow (inherently verified)
// Option 2: Email verification
//   - Send code to account_email
//   - User enters code
//   - Mark as verified

// Option 3: Order verification
//   - Ask for recent order number
//   - Check against detected orders
//   - Mark as verified
```

### 3. Scoped Permissions
Only request minimum permissions needed:
- ✅ Read order history
- ✅ Create orders
- ❌ Modify account settings
- ❌ View payment methods (use stored)

---

## Implementation Plan

### Phase 1: Database Setup
- [ ] Create `stores` table
- [ ] Create `store_aliases` table
- [ ] Create `user_store_accounts` table
- [ ] Create `store_order_history` table
- [ ] Seed initial stores (Old Navy, Nordstrom, etc.)

### Phase 2: Enhanced Email Scanner
- [ ] Update `emailScannerService.js` to detect stores
- [ ] Add store matching logic
- [ ] Extract order details (number, date, total)
- [ ] Create `user_store_accounts` records
- [ ] Create `store_order_history` records

### Phase 3: API Routes
- [ ] Create `storeAccountRoutes.js`
- [ ] Create `storeAccountController.js`
- [ ] Create `storeAccountService.js`
- [ ] Test store account detection
- [ ] Test account linking flow

### Phase 4: Store Integrations
- [ ] Research Old Navy checkout options
- [ ] Research Nordstrom checkout options
- [ ] Build redirect checkout flow
- [ ] Build OAuth flow (if available)
- [ ] Test end-to-end checkout

### Phase 5: Frontend UI
- [ ] Detected stores dashboard
- [ ] Account linking UI
- [ ] Multi-store cart
- [ ] Unified checkout flow

---

## Success Metrics

**Account Detection:**
- % of email senders matched to stores
- Avg orders detected per user
- Accuracy of order extraction

**Account Linking:**
- % of detected accounts linked
- Time to link account
- Link success rate

**Checkout Usage:**
- % of cart checkouts via Muse (vs store redirect)
- Avg cart value
- Multi-store cart adoption

---

## Next Steps

Ready to start implementation! Recommend:

1. **Create database tables** (10 min)
2. **Seed initial stores** with Old Navy, Nordstrom, etc. (5 min)
3. **Enhance email scanner** to detect stores (30 min)
4. **Test store detection** with your account (10 min)
5. **Build API routes** for store accounts (30 min)

Then we can move to Discover (product feeds) and Checkout (unified cart).

**Shall I proceed with Phase 1: Database Setup?**
