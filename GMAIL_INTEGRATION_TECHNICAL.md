# Gmail Integration - Technical Implementation Summary

## Architecture Overview

The Gmail integration system consists of several interconnected services and utilities that work together to scan emails, extract brand information, and automatically follow brands.

### System Flow

```
User Initiates OAuth → Google Authorization → Callback Handler
    ↓
Store Encrypted Tokens → Scan Emails → Extract Brands
    ↓
Match to Database → Auto-Follow Brands → Store Results
```

---

## File Structure

```
src/
├── config/
│   └── googleAuth.js              # Google OAuth 2.0 configuration
├── controllers/
│   └── emailConnectionController.js  # HTTP request handlers
├── routes/
│   └── emailConnectionRoutes.js   # API route definitions
├── services/
│   ├── emailScannerService.js     # Main email scanning logic
│   └── brandMatcherService.js     # Brand matching algorithms
├── utils/
│   ├── emailParser.js             # Email parsing utilities
│   └── encryption.js              # Token encryption utilities
└── db/
    ├── migrations/
    │   └── 007_email_connections.sql  # Database schema
    └── seeds/
        └── brand_aliases.sql      # Brand alias seed data
```

---

## Database Schema

### email_connections
Stores OAuth connection information and tokens.

```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (FK to users)
- provider: VARCHAR(50) - 'gmail', 'outlook', etc.
- email_address: VARCHAR(255)
- access_token: TEXT - Encrypted OAuth token
- refresh_token: TEXT - Encrypted refresh token
- token_expires_at: TIMESTAMP
- last_scanned_at: TIMESTAMP
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

**Indexes:**
- `user_id`, `provider`, `is_active`, `token_expires_at`

**Constraints:**
- `UNIQUE(user_id, provider)` - One connection per provider per user

---

### brand_aliases
Maps email domains and name variations to brands.

```sql
- id: SERIAL PRIMARY KEY
- brand_id: INTEGER (FK to brands)
- alias_type: VARCHAR(50) - 'email_domain', 'store_name', 'variation'
- alias_value: VARCHAR(255) - e.g., 'orders@zara.com'
- confidence_score: INTEGER (0-100)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

**Indexes:**
- `brand_id`, `alias_type`, `alias_value`, `is_active`
- GIN index on `to_tsvector(alias_value)` for text search

**Constraints:**
- `UNIQUE(alias_value, alias_type)` - No duplicate aliases

---

### email_scan_results
Audit log of all email scans.

```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (FK to users)
- email_connection_id: INTEGER (FK to email_connections)
- scan_date: TIMESTAMP
- emails_scanned: INTEGER
- brands_found: JSONB - Array of brand identifiers
- brands_matched: JSONB - Array of matched brands with confidence
- brands_auto_followed: JSONB - Array of brand IDs followed
- errors: JSONB - Array of errors encountered
- scan_duration_ms: INTEGER
- created_at: TIMESTAMP
```

**Indexes:**
- `user_id`, `email_connection_id`, `scan_date DESC`
- GIN indexes on JSONB columns for efficient querying

---

### extracted_brands_queue
Temporary queue for processing extracted brands.

```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (FK to users)
- scan_result_id: INTEGER (FK to email_scan_results)
- brand_identifier: VARCHAR(255) - Domain or name
- extraction_source: VARCHAR(50) - 'sender_domain', 'subject', 'body'
- email_subject: TEXT
- email_sender: VARCHAR(255)
- email_date: TIMESTAMP
- matched_brand_id: INTEGER (FK to brands)
- confidence_score: INTEGER (0-100)
- is_processed: BOOLEAN
- created_at: TIMESTAMP
```

---

## Core Services

### googleAuth.js

**Purpose:** Manage Google OAuth 2.0 authentication flow.

**Key Functions:**

```javascript
createOAuth2Client()
// Creates configured OAuth2 client with credentials

getAuthUrl()
// Generates authorization URL for user to visit
// Returns: String (authorization URL)

getTokensFromCode(code)
// Exchanges authorization code for tokens
// Params: code (String) - Authorization code
// Returns: Promise<Object> - { access_token, refresh_token, expiry_date }

refreshAccessToken(refreshToken)
// Refreshes expired access token
// Params: refreshToken (String)
// Returns: Promise<Object> - New tokens

createGmailClient(accessToken, refreshToken)
// Creates authenticated Gmail API client
// Returns: gmail_v1.Gmail client
```

**Configuration:**
- Requires: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Scopes: `gmail.readonly`, `userinfo.email`
- Access type: `offline` (to get refresh token)

---

### encryption.js

**Purpose:** Encrypt/decrypt sensitive OAuth tokens.

**Algorithm:** AES-256-GCM with PBKDF2 key derivation

**Key Functions:**

```javascript
encrypt(text)
// Encrypts text using AES-256-GCM
// Returns: Promise<String> - Format: "salt:iv:tag:encrypted"

decrypt(encryptedData)
// Decrypts encrypted data
// Returns: Promise<String> - Plain text

generateEncryptionKey()
// Generates secure random encryption key
// Returns: String (64-char hex)
```

**Security Features:**
- Unique salt per encryption (64 bytes)
- Random IV per encryption (16 bytes)
- Authentication tag for integrity (16 bytes)
- PBKDF2 with 100,000 iterations
- 256-bit key length

---

### emailParser.js

**Purpose:** Parse emails and extract brand information.

**Key Functions:**

```javascript
isOrderConfirmation(email)
// Determines if email is an order confirmation
// Checks subject and snippet for keywords
// Returns: Boolean

extractSenderDomain(email)
// Extracts domain from email address
// Params: email (String) - e.g., "orders@zara.com"
// Returns: String - e.g., "zara.com"

extractBrandFromSubject(subject)
// Extracts brand names from subject line
// Patterns: "Your [Brand] Order", "[Brand] Order Confirmation"
// Returns: Array<String> - Potential brand names

extractBrandFromBody(body)
// Extracts brands from email body
// Patterns: "Thank you for shopping at [Brand]"
// Returns: Array<String> - Potential brand names

extractAllBrandIdentifiers(email)
// Comprehensive extraction from all sources
// Returns: Object {
//   domain: String,
//   fullEmail: String,
//   subjectBrands: Array<String>,
//   bodyBrands: Array<String>
// }
```

**Order Confirmation Keywords:**
- "order confirmation", "order receipt", "purchase confirmation"
- "thank you for your order", "order details", "order number"
- "receipt", "order summary", "order placed"
- "payment confirmation", "shipment confirmation"

---

### emailScannerService.js

**Purpose:** Main service for scanning emails and managing connections.

**Key Functions:**

```javascript
getAuthUrl()
// Returns Gmail OAuth authorization URL

connectGmail(userId, authCode)
// Completes OAuth flow and stores encrypted tokens
// Steps:
//   1. Exchange code for tokens
//   2. Get user's email address
//   3. Encrypt tokens
//   4. Store in database
// Returns: Promise<Object> - Connection info

refreshAccessToken(userId)
// Refreshes expired access token
// Automatically updates database

getValidAccessToken(userId)
// Gets valid token (refreshes if expired)
// Checks expiration and refreshes if needed

scanEmailsForBrands(userId)
// Main scanning function
// Steps:
//   1. Get valid access token
//   2. Query Gmail for order emails (last 12 months)
//   3. Process emails in batches of 50
//   4. Extract brand identifiers
//   5. Match to database brands
//   6. Auto-follow high confidence matches
//   7. Store scan results
// Returns: Promise<Object> - Scan results

processBatch(gmail, messageIds, userId, connectionId)
// Process a batch of emails
// Internal helper for scanEmailsForBrands

disconnectEmail(userId)
// Marks connection as inactive

getConnectionStatus(userId)
// Gets connection status and last scan info
```

**Configuration:**
- `MAX_EMAILS_TO_SCAN`: 500
- `MONTHS_TO_SCAN_BACK`: 12
- `BATCH_SIZE`: 50

---

### brandMatcherService.js

**Purpose:** Match extracted brand identifiers to database brands.

**Matching Strategies:**

1. **Exact Alias Match (100% confidence)**
   - Direct match in `brand_aliases` table
   - Fastest and most accurate

2. **Domain Match (100% confidence)**
   - Extract domain from sender email
   - Match against `email_domain` aliases
   - Try variations: `orders@`, `noreply@`, `email@`

3. **Exact Name Match (100% confidence)**
   - Direct match to brand name in database
   - Case-insensitive

4. **Fuzzy Name Match (70-95% confidence)**
   - Uses PostgreSQL `pg_trgm` similarity
   - Threshold: 0.3 similarity score
   - Falls back to exact match if extension unavailable

**Key Functions:**

```javascript
matchByAlias(identifier, aliasType)
// Match by alias in brand_aliases table
// Returns: Promise<Object|null> - Brand match

matchByDomain(domain)
// Match by email domain
// Tries exact domain and common email patterns

matchByName(brandName)
// Match by brand name (fuzzy or exact)
// Uses pg_trgm similarity if available

extractBrandFromEmail(emailData)
// Extract and match brand from email
// Priority: domain > subject > body
// Returns: Promise<Object|null> - Best match

autoFollowMatchedBrands(userId, matchedBrands)
// Auto-follow brands with confidence >= 80
// Creates user_brand_follows records
// Returns: Promise<Array> - Followed brand IDs
```

**Confidence Thresholds:**
- `CONFIDENCE_THRESHOLD_AUTO_FOLLOW`: 80
- `CONFIDENCE_THRESHOLD_EXACT_MATCH`: 100
- `CONFIDENCE_THRESHOLD_FUZZY_MATCH`: 70

---

## API Routes

### Authentication
All endpoints require authentication via `authMiddleware`.

### Route Definitions

```javascript
GET    /api/v1/email/connect        // Get OAuth URL
POST   /api/v1/email/callback       // Complete OAuth (body: {code})
POST   /api/v1/email/scan           // Trigger scan
GET    /api/v1/email/status         // Get connection status
DELETE /api/v1/email/disconnect     // Disconnect Gmail
GET    /api/v1/email/scans          // Get scan history (pagination)
```

---

## Controller Layer

### emailConnectionController.js

Handles HTTP requests and responses. Each method:
1. Extracts and validates request data
2. Calls appropriate service method
3. Formats response using `successResponse`
4. Passes errors to error handler via `next(error)`

---

## Security Measures

### Token Encryption
- All OAuth tokens encrypted before database storage
- AES-256-GCM with unique salt and IV per encryption
- PBKDF2 key derivation (100k iterations)

### OAuth Scopes
- `gmail.readonly` - Read-only access
- `userinfo.email` - Only email address
- No write or send permissions

### Privacy
- No raw email content stored
- Only brand identifiers extracted
- Scan results are audit logs only
- User can disconnect anytime

### Rate Limiting
- Gmail API has quotas (1 billion quota units/day)
- Recommend implementing rate limiting on scan endpoint
- Batch processing to avoid memory issues

### Access Control
- All endpoints require authentication
- Users can only access their own connections
- No cross-user data access

---

## Error Handling

### OAuth Errors
- `invalid_grant` - Code expired or already used
- Token refresh failures → Mark connection inactive
- Configuration errors → Validation errors

### Gmail API Errors
- Rate limit exceeded → Return 429 error
- Invalid credentials → Prompt reconnection
- Network errors → Retry with exponential backoff

### Database Errors
- Connection failures → Log and return 500
- Constraint violations → Return 409
- Not found → Return 404

### Encryption Errors
- Missing key → Validation error on startup
- Decryption failure → Prompt reconnection

---

## Performance Considerations

### Batch Processing
- Emails processed in batches of 50
- Prevents memory issues with large result sets
- Reduces Gmail API quota usage

### Database Optimization
- Indexes on frequently queried columns
- GIN indexes for JSONB and full-text search
- Prepared statements for repeated queries

### Caching
- Token expiration checked before API calls
- Connection status cached (consider Redis)

### Async Operations
- All Gmail API calls are async
- Email processing is sequential (not parallel)
- Consider worker queue for large scans

---

## Testing Considerations

### Unit Tests
- Email parser functions
- Brand matcher algorithms
- Encryption/decryption
- Token refresh logic

### Integration Tests
- OAuth flow (mock Google APIs)
- Email scanning (mock Gmail API)
- Brand matching (test database)
- Token encryption/decryption

### Manual Testing
- Complete OAuth flow with real Gmail
- Scan real inbox
- Verify brand matching accuracy
- Test token refresh
- Test disconnection

---

## Monitoring & Logging

### Key Metrics
- OAuth connection success rate
- Scan completion rate
- Brand match accuracy
- Auto-follow rate
- Token refresh failures

### Logs
- OAuth events (connect, disconnect, refresh)
- Scan start/complete with results
- Brand match results
- Errors with context

### Alerts
- Failed token refreshes
- High error rates during scanning
- Gmail API quota warnings

---

## Future Enhancements

### Scheduled Scans
- Cron job to scan periodically
- Background worker for async scanning
- User preferences for scan frequency

### Additional Providers
- Outlook integration
- Yahoo Mail integration
- IMAP fallback

### Improved Matching
- Machine learning for brand detection
- Custom training on historical data
- Manual confirmation workflow

### Analytics
- Brand discovery trends
- Most common brands by user segment
- Scan performance metrics

---

## Dependencies

### NPM Packages
- `googleapis` - Google APIs client library
- `pg` - PostgreSQL client
- `crypto` - Node.js crypto module (built-in)
- `joi` - Request validation
- `express` - Web framework

### PostgreSQL Extensions
- `pg_trgm` - Fuzzy text matching (optional)

---

## Environment Variables

```env
# Required
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
ENCRYPTION_KEY=...

# Database (existing)
DB_HOST=...
DB_PORT=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...

# Auth (existing)
JWT_SECRET=...
```

---

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... } // Development only
  }
}
```

---

**Last Updated:** 2026-02-02
