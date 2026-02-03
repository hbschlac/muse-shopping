# CONNECT Gateway Architecture - Multi-Channel Onboarding

## Vision

Mirror ShopApp's seamless connection experience where users see **real-time scanning progress** with dynamic, visual feedback as the system personalizes their shopping experience.

## Connection Gateways

### 1. Email Connection (Gmail) ✅ CURRENT
**Flow:**
```
User clicks "Connect Gmail"
→ OAuth consent screen
→ Real-time email scanning with progress bar
→ Shows: "Found Nordstrom (5 orders)... Found Target (2 orders)..."
→ Auto-follows brands + creates store accounts
→ "All set! We found 4 stores you shop at"
```

**Backend Status:** Implemented, needs WebSocket enhancement for real-time updates

---

### 2. Store OAuth Connection (Direct Login)
**Stores with OAuth APIs:**
- Walmart
- Target
- Gap Inc (Old Navy, Gap, Banana Republic)
- Potentially: Macy's, Nordstrom (if APIs available)

**Flow:**
```
User sees "You shop at Walmart (detected from email)"
→ "Link your Walmart account for 1-click checkout"
→ OAuth consent screen (Walmart login)
→ Stores encrypted tokens
→ "Connected! You can now checkout at Walmart in one click"
→ Background: Sync order history, saved addresses, payment methods
```

**Benefits:**
- Full order history sync
- One-click checkout within Muse
- No password re-entry
- Auto-update inventory availability

---

### 3. Store Manual Login (Credential Storage)
**For stores without OAuth:**
- Nordstrom
- Macy's
- Bloomingdale's
- Saks
- Most boutique stores

**Flow:**
```
User sees "You shop at Nordstrom (detected from email)"
→ "Link your Nordstrom account"
→ Modal: "Enter your Nordstrom login"
→ Email + Password fields
→ Encrypted storage with user consent
→ "Connected! We'll use this when you checkout"
```

**Security:**
- AES-256 encryption
- User consent required
- Can delete anytime
- Used only for checkout automation
- Optional: Use headless browser to maintain session cookies instead

---

### 4. Store Account Detection (Email-Based)
**Automatic detection from email scanning:**

**Flow:**
```
During email scan:
→ Detect order from "order@nordstrom.com"
→ Match to Nordstrom via store_aliases
→ Create user_store_accounts record (is_linked: false)
→ Show in UI: "We found you shop at Nordstrom (5 orders)"
→ Prompt: "Link your account for faster checkout"
```

**Current Status:** ✅ Infrastructure exists, needs integration

---

### 5. Social Proof Connection (Future)
**Instagram, Pinterest, TikTok:**

**Flow:**
```
"Connect Instagram to discover brands you love"
→ OAuth consent
→ Scan liked posts, saved items, tagged brands
→ Extract brand mentions
→ Auto-follow in Muse
→ "We found 12 brands from your Instagram!"
```

**Use Cases:**
- Influencer discovery (brands they promote)
- Style preferences (aesthetic analysis)
- Friend shopping circles

---

## Real-Time Scanning Experience

### Current State (Synchronous)
```javascript
POST /api/v1/email/scan
→ Waits 2+ minutes
→ Returns results
```

**Problem:** No user feedback, feels broken

### Target State (Asynchronous + WebSocket)
```javascript
// 1. Initiate scan
POST /api/v1/email/scan/start
→ Returns scanId immediately

// 2. Connect to progress stream
WebSocket /api/v1/email/scan/:scanId/progress
→ Receives real-time updates:
{
  "status": "scanning",
  "progress": 45,
  "current": "Scanning email 225/500...",
  "found": [
    { "brand": "Nordstrom", "orders": 5, "logo": "..." },
    { "brand": "Target", "orders": 2, "logo": "..." }
  ]
}

// 3. Completion
{
  "status": "complete",
  "progress": 100,
  "summary": {
    "emailsScanned": 500,
    "brandsFound": 4,
    "storesDetected": 4,
    "totalOrders": 12
  }
}
```

---

## Frontend UX (ShopApp-Inspired)

### Connection Screen Components

#### 1. Gateway Selection
```
┌─────────────────────────────────────┐
│   Connect Your Shopping Accounts    │
├─────────────────────────────────────┤
│                                      │
│  📧 Email (Gmail)                   │
│  ▸ Fastest way to get started      │
│  ▸ Auto-detects stores & brands    │
│  [Connect Gmail] ────────────────▶  │
│                                      │
│  🏬 Store Accounts                  │
│  ▸ Enable 1-click checkout         │
│  ▸ Sync order history              │
│                                      │
│  [ ] Walmart    [ ] Target          │
│  [ ] Nordstrom  [ ] Macy's          │
│                                      │
│  📱 Social (Coming Soon)            │
│  [ ] Instagram  [ ] Pinterest       │
└─────────────────────────────────────┘
```

#### 2. Real-Time Scanning UI
```
┌─────────────────────────────────────┐
│   Personalizing Your Feed...        │
├─────────────────────────────────────┤
│                                      │
│  ████████████░░░░░░░░░░  45%       │
│  Scanning email 225/500...          │
│                                      │
│  ✓ Found: Nordstrom                │
│    └─ 5 orders, $1,234 spent       │
│                                      │
│  ✓ Found: Target                   │
│    └─ 2 orders, $156 spent         │
│                                      │
│  🔍 Still scanning...               │
│                                      │
└─────────────────────────────────────┘
```

#### 3. Results Summary
```
┌─────────────────────────────────────┐
│   All Set! Here's What We Found     │
├─────────────────────────────────────┤
│                                      │
│  📊 Your Shopping Profile           │
│  ▸ 500 emails scanned              │
│  ▸ 4 stores detected               │
│  ▸ 12 total orders                 │
│  ▸ $2,456 spent (last year)        │
│                                      │
│  🏬 Detected Stores                 │
│                                      │
│  [Nordstrom Logo] Nordstrom        │
│  5 orders • $1,234                 │
│  [Link Account] ──────────────────▶│
│                                      │
│  [Target Logo] Target              │
│  2 orders • $156                   │
│  [Link Account] ──────────────────▶│
│                                      │
│  [Continue to Feed] ──────────────▶│
└─────────────────────────────────────┘
```

---

## Database Schema Enhancements

### Add to `user_store_accounts` table:
```sql
ALTER TABLE user_store_accounts
ADD COLUMN connection_method VARCHAR(20), -- 'email_detected', 'oauth', 'manual', 'auto_linked'
ADD COLUMN credentials_encrypted TEXT, -- For manual login stores
ADD COLUMN oauth_tokens_encrypted TEXT, -- For OAuth stores
ADD COLUMN last_sync_at TIMESTAMP,
ADD COLUMN sync_status VARCHAR(20), -- 'pending', 'syncing', 'success', 'failed'
ADD COLUMN supports_checkout BOOLEAN DEFAULT false,
ADD COLUMN supports_order_sync BOOLEAN DEFAULT false;
```

### Add `connection_sessions` table:
```sql
CREATE TABLE connection_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(50), -- 'email_scan', 'oauth_connect', 'manual_link'
  status VARCHAR(20), -- 'pending', 'in_progress', 'completed', 'failed'
  progress_percent INT DEFAULT 0,
  current_step TEXT,
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation Phases

### Phase 1: Email Scanner Integration ⚡ NOW
**Tasks:**
1. Update `emailScannerService.js` to call `StoreAccountService.matchEmailToStore()`
2. Create store accounts during email scan
3. Extract order details and populate `store_order_history`
4. Return store detection in scan results

**Outcome:** Email scanning automatically populates detected stores

---

### Phase 2: Real-Time Progress API 🔄 NEXT
**Tasks:**
1. Create `connection_sessions` table
2. Build `ConnectionSessionService` for progress tracking
3. Add WebSocket or Server-Sent Events for real-time updates
4. Update email scanner to report progress incrementally
5. Create endpoints: `POST /scan/start`, `GET /scan/:id/progress`

**Outcome:** Frontend can show real-time scanning progress

---

### Phase 3: Store OAuth Integration 🔐 WEEK 2
**Tasks:**
1. Research OAuth APIs for Walmart, Target, Gap
2. Create `StoreOAuthService` for each provider
3. Build OAuth callback handlers
4. Store encrypted OAuth tokens
5. Implement order history sync via APIs
6. Create checkout automation for OAuth stores

**Outcome:** Users can link Walmart/Target accounts with OAuth

---

### Phase 4: Manual Store Login 🔑 WEEK 3
**Tasks:**
1. Create secure credential storage service
2. Build encrypted credential vault
3. Add manual login endpoints
4. Create headless browser automation (Puppeteer)
5. Implement session cookie management
6. Build checkout automation for manual stores

**Outcome:** Users can link any store with manual login

---

### Phase 5: Social Connection 📱 FUTURE
**Tasks:**
1. Instagram OAuth integration
2. Pinterest API integration
3. Brand extraction from social posts
4. Image recognition for product matching
5. Influencer brand discovery

**Outcome:** Discover brands from social media

---

## Security & Privacy

### Credential Encryption
- AES-256-GCM encryption
- Unique encryption key per user (derived from master key + user salt)
- Keys stored in HSM or separate secure vault
- Never log or expose credentials

### OAuth Token Management
- Store refresh tokens only (encrypted)
- Access tokens generated on-demand
- Automatic token rotation
- Revocation support

### User Consent
- Clear disclosure: "We'll store your login to enable checkout"
- Opt-in required
- Easy deletion: "Unlink account" removes all credentials
- Transparency: Show last used, last synced

### Compliance
- GDPR: Right to delete all stored credentials
- CCPA: Clear notice and opt-out
- PCI: Never store credit card data (use tokenization)

---

## API Endpoints Summary

### Email Connection
```
GET    /api/v1/email/auth              - Get Gmail OAuth URL
POST   /api/v1/email/callback          - Handle OAuth callback
POST   /api/v1/email/scan/start        - Start async scan (returns scanId)
GET    /api/v1/email/scan/:id/progress - Get scan progress
GET    /api/v1/email/scan/:id/result   - Get final results
DELETE /api/v1/email/disconnect        - Disconnect Gmail
```

### Store OAuth Connection
```
GET    /api/v1/stores/:slug/oauth/url           - Get OAuth URL for store
POST   /api/v1/stores/:slug/oauth/callback      - Handle OAuth callback
POST   /api/v1/stores/:slug/oauth/refresh       - Refresh tokens
DELETE /api/v1/stores/:slug/oauth/disconnect    - Revoke OAuth
```

### Store Manual Connection
```
POST   /api/v1/stores/:slug/login        - Store manual credentials
PUT    /api/v1/stores/:slug/credentials  - Update credentials
DELETE /api/v1/stores/:slug/credentials  - Delete credentials
POST   /api/v1/stores/:slug/verify       - Verify credentials work
```

### Store Account Management
```
GET    /api/v1/store-accounts              - All store accounts
GET    /api/v1/store-accounts/detected     - Detected but not linked
GET    /api/v1/store-accounts/linked       - Linked accounts only
GET    /api/v1/store-accounts/summary      - Summary stats
POST   /api/v1/store-accounts/:id/link     - Link account
POST   /api/v1/store-accounts/:id/sync     - Trigger order sync
DELETE /api/v1/store-accounts/:id          - Unlink account
```

---

## Example User Journey

### Sarah's Onboarding Experience

**Step 1: Registration**
- Sarah signs up with Google Sign-In
- Lands on: "Let's personalize your feed"

**Step 2: Gmail Connection**
- Clicks "Connect Gmail"
- Authorizes Google OAuth
- Sees real-time progress:
  - "Scanning email 100/500..."
  - "Found Nordstrom (3 orders)"
  - "Found Old Navy (2 orders)"
  - "Found Macy's (1 order)"

**Step 3: Results**
- Summary: "We found 3 stores you shop at!"
- Shows store cards with order counts and spending
- Prompts: "Link accounts for faster checkout?"

**Step 4: Store Linking**
- Nordstrom: "Link Account" → Manual login modal
- Old Navy: "Link Account" → OAuth redirect (if available)
- Macy's: "Link Account" → Manual login modal

**Step 5: Feed**
- Redirects to personalized feed
- Shows products from Nordstrom, Old Navy, Macy's
- "You shop at these stores" widget in sidebar
- Can add more stores anytime

---

## Success Metrics

### Connection Rate
- % of users who connect at least one gateway
- % who connect Gmail vs stores vs social
- Time to first connection

### Linking Rate
- % of detected stores that get linked
- Connection method distribution (OAuth vs manual)
- Drop-off points in linking flow

### Retention
- Users with linked accounts vs not linked
- Checkout completion rate (linked vs not)
- Re-connection rate after disconnect

### Engagement
- Orders placed through linked accounts
- Order sync success rate
- Average stores linked per user

---

## Next Steps

1. **Integrate email scanner with store detection** (30 min)
2. **Add real-time progress tracking** (2 hours)
3. **Build frontend connection UI** (4 hours)
4. **Research store OAuth APIs** (2 hours)
5. **Implement first OAuth provider (Walmart or Target)** (6 hours)
6. **Build manual login flow** (4 hours)

---

**Status:** Architecture Complete, Ready for Implementation
**Priority:** Phase 1 (Email Scanner Integration) - Start Now
