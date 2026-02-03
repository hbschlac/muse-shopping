# Brand vs Store Data Architecture & Flow

## Executive Summary

**Current State:** The system currently uses a single `brands` table with an `is_retailer` flag to distinguish between brands and stores. This is functional but not optimal for the Walmart (store) → Scoop (brand) relationship you described.

**Scan Results:** Your email scan just completed! Found 14 brand/store mentions, matched 4 of them:
- **Nordstrom** (store)
- **Nordstrom Rack** (store)
- **Old Navy** (store)
- **Cider** (brand)

**Recommended Enhancement:** Add a proper stores table with a brand-to-store relationship to support your vision.

---

## Current Data Architecture

### 1. Brands Table
**Location:** `brands` table in database

**Purpose:** Stores both brands AND retailers (stores)

**Key Fields:**
- `id` - Unique identifier
- `name` - Brand/store name (e.g., "Nordstrom", "Lucy", "Scoop")
- `is_retailer` - Boolean flag (true = store like Walmart, false = brand like Lucy)
- `website_url` - Where to shop
- `category` - Type of products
- `price_tier` - Budget, mid-range, luxury

**Current Challenge:** This structure treats Walmart and Scoop equally, but doesn't capture that Scoop is *sold at* Walmart.

### 2. Brand Aliases Table
**Location:** `brand_aliases` table

**Purpose:** Map different ways brands/stores appear in emails to our canonical brand records

**Example Aliases:**
- `alias_value: "eml.nordstrom.com"` → `brand_id: 3` (Nordstrom)
- `alias_value: "oldnavy.com"` → `brand_id: 64` (Old Navy)
- `alias_value: "une.shopcider.com"` → `brand_id: 61` (Cider)

**Alias Types:**
- `email_domain` - From sender domain (e.g., "eml.nordstrom.com")
- `display_name` - How they appear in email body
- `subdomain` - Variations like "shop.nike.com"

### 3. Email Scan Results Table
**Location:** `email_scan_results` table

**Purpose:** Track what we found in each email scan

**Your Latest Scan Results (User ID 8):**
```json
{
  "emails_scanned": 500,
  "brands_found": [
    "gmail.com",
    "une.shopcider.com",
    "oldnavy.com" (multiple),
    "eml.nordstrom.com" (multiple),
    "eml.nordstromrack.com" (multiple)
  ],
  "brands_matched": [
    {"brandId": 61, "brandName": "Cider", "confidenceScore": 100},
    {"brandId": 64, "brandName": "Old Navy", "confidenceScore": 100},
    {"brandId": 4, "brandName": "Nordstrom Rack", "confidenceScore": 100},
    {"brandId": 3, "brandName": "Nordstrom", "confidenceScore": 100}
  ],
  "brands_auto_followed": [3, 4, 61],
  "scan_duration": "2 minutes 12 seconds"
}
```

### 4. User Brand Follows Table
**Location:** `user_brand_follows` table

**Purpose:** Track which brands/stores each user follows

**Your Current Follows (User ID 8):**
- 10 default brands (Zara, H&M, Nike, Lululemon, Nordstrom, ASOS, Madewell, Everlane, Uniqlo, Target)
- 3 auto-followed from email scan (Nordstrom, Nordstrom Rack, Cider)

**Total:** 13 brands/stores you're following

---

## Data Flow: Scan → Experience

### Step 1: Email Scan
**Trigger:** User connects Gmail → Background scan starts

**Process:**
1. Scan last 500 emails
2. Extract sender domains (e.g., "eml.nordstrom.com", "oldnavy.com")
3. Look for order confirmation keywords ("order confirmed", "receipt", "tracking")
4. Store raw findings in `brands_found` array

### Step 2: Brand Matching
**Trigger:** After extraction

**Process:**
1. Take each domain found (e.g., "eml.nordstrom.com")
2. Check `brand_aliases` table for match
3. Use fuzzy matching for partial matches (85%+ similarity)
4. If matched, add to `brands_matched` with confidence score
5. If not matched, add to `extracted_brands_queue` for human review

### Step 3: Auto-Follow Creation
**Trigger:** After matching

**Process:**
1. Take matched brands (Nordstrom, Nordstrom Rack, Cider, Old Navy)
2. Check if user already follows them
3. If not, create `user_brand_follows` record
4. Mark as `is_auto_detected: true` vs manually followed
5. Store in `brands_auto_followed` array in scan results

### Step 4: Customer Experience Shaping

**Feed Personalization:**
- User opens Muse app
- Feed queries `user_brand_follows` for user ID 8
- Shows products from: Nordstrom, Nordstrom Rack, Cider, Old Navy + 10 default brands
- Prioritizes brands with `is_auto_detected: true` (since we know they actually shop there)

**Discover Tab:**
- Shows products from followed brands/stores
- Can filter by category, price tier
- "Because you shop at Nordstrom" recommendation logic

**Checkout Flow:**
- When user adds item to cart, we check which store sells it
- If user has account linked for that store, enable one-click checkout
- If not, prompt to link account or checkout on store website

---

## Recommended Architecture Enhancement

### Problem
Current structure doesn't distinguish between:
- **Stores** (Walmart, Nordstrom) that *sell* multiple brands
- **Brands** (Scoop, Lucy) that are *sold at* multiple stores

### Proposed Solution

#### New Table: `stores`
```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  website_url TEXT,
  logo_url TEXT,
  checkout_integration VARCHAR(50), -- 'api', 'redirect', 'manual'
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Examples: Walmart, Nordstrom, Old Navy, Target
```

#### New Table: `brand_store_relationships`
```sql
CREATE TABLE brand_store_relationships (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  is_primary_seller BOOLEAN DEFAULT false, -- Is this the brand's main store?
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, store_id)
);

-- Examples:
-- brand_id: 100 (Scoop), store_id: 1 (Walmart), is_primary_seller: false
-- brand_id: 101 (Lucy), store_id: 2 (Nordstrom), is_primary_seller: false
-- brand_id: 64 (Old Navy), store_id: 64 (Old Navy), is_primary_seller: true
```

#### Update: `brands` table
```sql
-- Remove is_retailer flag (no longer needed)
ALTER TABLE brands DROP COLUMN is_retailer;

-- Add brand type
ALTER TABLE brands ADD COLUMN brand_type VARCHAR(50) DEFAULT 'independent';
-- Values: 'independent', 'house_brand', 'designer'
```

#### New Table: `user_store_accounts`
```sql
CREATE TABLE user_store_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  account_email VARCHAR(255), -- User's email for that store
  is_linked BOOLEAN DEFAULT false, -- Have they authorized Muse to access?
  oauth_token_encrypted TEXT, -- For stores with API access
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, store_id)
);

-- Example: user_id: 8, store_id: 2 (Nordstrom), account_email: 'hbschlac@gmail.com', is_linked: true
```

### Benefits

1. **Clear Hierarchy:** Stores sell brands, brands sold at stores
2. **Multi-Store Checkout:** Know which stores user has accounts at
3. **Better Recommendations:** "Scoop at Walmart" vs just "Scoop"
4. **Account Linking:** Connect user's Old Navy login to enable checkout
5. **Inventory Tracking:** Same brand available at 3 different stores

---

## Example User Journey

### Scenario: New User "Hannah" Signs Up

**Step 1: Connect Gmail**
- Hannah connects hbschlac@gmail.com
- System scans 500 emails
- Finds: Nordstrom, Nordstrom Rack, Old Navy, Cider

**Step 2: Auto-Follow Brands/Stores**
- System creates follows for all 4
- Adds 10 default popular brands
- Total: 13 follows

**Step 3: Browse Feed**
- Hannah opens Muse app
- Sees products from her 13 followed brands/stores
- Feed shows: "New at Nordstrom" (store she shops at)

**Step 4: Discover New Brand**
- Hannah sees Lucy brand dress
- Clicks → sees "Available at Nordstrom" (store she already shops at!)
- System knows she has Nordstrom account from email history
- Prompts: "Link your Nordstrom account for 1-click checkout"

**Step 5: Multi-Store Cart**
- Hannah adds to cart:
  - 2 jeans from Old Navy ($40 each)
  - 1 dress from Lucy at Nordstrom ($89)
  - 1 jacket from Nordstrom Rack ($65)

**Cart Summary:**
```
Your Cart (3 Stores)

Old Navy
- High-Waisted Jeans x2 .............. $80.00

Nordstrom
- Lucy Floral Dress .................. $89.00

Nordstrom Rack
- Winter Jacket ...................... $65.00

Total: $234.00
Checkout with Muse →
```

**Step 6: Unified Checkout**
- Hannah clicks "Checkout with Muse"
- System processes 3 separate transactions:
  1. Old Navy Order #ON-2026-12345
  2. Nordstrom Order #NR-8765432
  3. Nordstrom Rack Order #NRK-445566

**Hannah's Experience:**
- One click, one payment
- Three order confirmation emails
- Each store ships separately
- All tracked in Muse app under "My Orders"

---

## Implementation Priority

### Phase 1: Current System (✅ DONE)
- Email scanning working
- Brand matching working
- Auto-follow working
- Feed shows followed brands

### Phase 2: Store Account Detection (NEXT)
- Enhance email scan to detect store accounts
- Identify which stores user shops at
- Track account emails per store

### Phase 3: Store/Brand Separation (FUTURE)
- Create `stores` table
- Create `brand_store_relationships` table
- Migrate existing `is_retailer` brands to stores
- Update feed to show "Brand at Store"

### Phase 4: Account Linking (FUTURE)
- Create `user_store_accounts` table
- Build OAuth flows for stores that support it
- Build redirect flows for stores without API
- Enable "Link Account" prompts

### Phase 5: Unified Checkout (FUTURE)
- Build multi-store cart system
- Implement order splitting logic
- Create unified payment flow
- Generate multiple order numbers per transaction

---

## Data Storage Summary

| Data Type | Stored Where | Example |
|-----------|--------------|---------|
| Brand/Store Info | `brands` table | Nordstrom, Lucy, Scoop |
| Email Aliases | `brand_aliases` | "eml.nordstrom.com" → Nordstrom |
| Scan Raw Results | `email_scan_results.brands_found` | ["eml.nordstrom.com", "oldnavy.com"] |
| Matched Brands | `email_scan_results.brands_matched` | [{"brandId": 3, "brandName": "Nordstrom"}] |
| User Follows | `user_brand_follows` | user_id: 8, brand_id: 3 (Nordstrom) |
| User Accounts | *Future: `user_store_accounts`* | user_id: 8, store_id: 2, email: hbschlac@gmail.com |

---

## Next Steps

1. ✅ **Gmail Integration** - COMPLETE
2. ⏳ **Store Account Detection** - Enhance email scanner to extract account info
3. ⏳ **Store Table Setup** - Create stores infrastructure
4. ⏳ **Account Linking UI** - Build "Link Account" flows
5. ⏳ **Multi-Store Cart** - Build unified checkout experience

**Current Focus:** Move to Connect scaffolding for store account linking architecture.
