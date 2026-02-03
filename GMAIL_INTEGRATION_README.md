# Gmail API Integration - Complete System

## Overview

The Gmail API integration allows users to connect their Gmail account to automatically discover brands they shop from and follow them on the platform. The system scans order confirmation emails, extracts brand information, matches brands to the database, and auto-follows high-confidence matches.

## Key Features

- **OAuth 2.0 Authentication** - Secure Gmail connection via Google OAuth
- **Email Scanning** - Automated scanning of order confirmation emails
- **Brand Extraction** - Intelligent extraction of brand names from emails
- **Fuzzy Matching** - Advanced brand matching with confidence scoring
- **Auto-Following** - Automatic brand following for high confidence matches
- **Token Encryption** - AES-256-GCM encryption for OAuth tokens
- **Privacy First** - Read-only access, no email content stored

## Documentation

### For Quick Setup
📄 **[GMAIL_API_QUICK_START.md](./GMAIL_API_QUICK_START.md)**
- 5-minute setup guide
- Quick test instructions
- Common issues and solutions

### For Complete Setup
📄 **[GMAIL_INTEGRATION_SETUP.md](./GMAIL_INTEGRATION_SETUP.md)**
- Detailed Google Cloud setup
- Database configuration
- Environment variables
- Testing procedures
- Production deployment checklist

### For Technical Details
📄 **[GMAIL_INTEGRATION_TECHNICAL.md](./GMAIL_INTEGRATION_TECHNICAL.md)**
- Architecture overview
- Database schema
- Service layer documentation
- Security measures
- Performance considerations

## Files Created

### Configuration
- `/src/config/googleAuth.js` - Google OAuth 2.0 setup

### Controllers
- `/src/controllers/emailConnectionController.js` - HTTP request handlers

### Routes
- `/src/routes/emailConnectionRoutes.js` - API endpoint definitions
- `/src/routes/index.js` - Updated with email routes

### Services
- `/src/services/emailScannerService.js` - Email scanning logic
- `/src/services/brandMatcherService.js` - Brand matching algorithms

### Utilities
- `/src/utils/emailParser.js` - Email parsing functions
- `/src/utils/encryption.js` - Token encryption/decryption

### Database
- `/src/db/migrations/007_email_connections.sql` - Schema migration
- `/src/db/seeds/brand_aliases.sql` - Brand alias seed data

### Scripts
- `/scripts/test-encryption.js` - Encryption utility tests

### Documentation
- `GMAIL_INTEGRATION_README.md` - This file
- `GMAIL_INTEGRATION_SETUP.md` - Setup guide
- `GMAIL_INTEGRATION_TECHNICAL.md` - Technical documentation
- `GMAIL_API_QUICK_START.md` - Quick start guide

## Quick Start

### 1. Prerequisites
```bash
# Install dependencies
npm install

# Verify encryption utility
npm run test:encryption
```

### 2. Google Cloud Configuration
1. Create project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Configure consent screen
5. Add redirect URI: `http://localhost:3000/api/v1/email/callback`

### 3. Environment Setup
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/email/callback
ENCRYPTION_KEY=your_generated_key
```

### 4. Database Setup
```bash
# Run migration
npm run migrate

# Seed brand aliases
psql -U muse_admin -d muse_shopping_dev -f src/db/seeds/brand_aliases.sql

# Optional: Enable fuzzy matching
psql -U muse_admin -d muse_shopping_dev -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### 5. Start Server
```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/email/connect` | Get OAuth authorization URL |
| POST | `/api/v1/email/callback` | Complete OAuth connection |
| POST | `/api/v1/email/scan` | Trigger email scan |
| GET | `/api/v1/email/status` | Get connection status |
| DELETE | `/api/v1/email/disconnect` | Disconnect Gmail |
| GET | `/api/v1/email/scans` | Get scan history |

All endpoints require authentication (`Authorization: Bearer {token}`).

## Usage Flow

```
1. User clicks "Connect Gmail" in frontend
     ↓
2. Backend returns OAuth authorization URL
     ↓
3. User visits URL and grants permissions
     ↓
4. Google redirects back with authorization code
     ↓
5. Frontend sends code to backend
     ↓
6. Backend exchanges code for tokens and stores encrypted
     ↓
7. User triggers email scan
     ↓
8. Backend scans last 12 months of order emails
     ↓
9. Extracts brand names from emails
     ↓
10. Matches brands to database (with confidence scores)
     ↓
11. Auto-follows high confidence matches (≥80%)
     ↓
12. Returns scan results to user
```

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         │ HTTP Requests
         ↓
┌─────────────────────────────────────────┐
│         Express API Server               │
│  ┌────────────────────────────────────┐ │
│  │  emailConnectionController.js      │ │
│  └──────────┬─────────────────────────┘ │
│             │                            │
│  ┌──────────▼──────────────────────┐    │
│  │  emailScannerService.js         │    │
│  │  - OAuth flow management        │    │
│  │  - Email scanning               │    │
│  │  - Token refresh                │    │
│  └──────────┬──────────────────────┘    │
│             │                            │
│  ┌──────────▼──────────────────────┐    │
│  │  brandMatcherService.js         │    │
│  │  - Brand identification         │    │
│  │  - Confidence scoring           │    │
│  │  - Auto-follow logic            │    │
│  └──────────┬──────────────────────┘    │
│             │                            │
│  ┌──────────▼──────────────────────┐    │
│  │  emailParser.js                 │    │
│  │  - Domain extraction            │    │
│  │  - Brand name parsing           │    │
│  │  - Pattern matching             │    │
│  └─────────────────────────────────┘    │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│         PostgreSQL Database              │
│  - email_connections (encrypted tokens) │
│  - brand_aliases (domain mappings)      │
│  - email_scan_results (audit log)       │
│  - user_brand_follows (relationships)   │
└─────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│         Gmail API (Google)               │
│  - OAuth 2.0 authentication             │
│  - Email listing and retrieval          │
│  - Read-only access                     │
└─────────────────────────────────────────┘
```

## Security Features

### Token Encryption
- AES-256-GCM encryption algorithm
- Unique salt per encryption (64 bytes)
- Random IV per encryption (16 bytes)
- PBKDF2 key derivation (100,000 iterations)
- Authentication tag for integrity verification

### OAuth Security
- Read-only Gmail access (`gmail.readonly`)
- Offline access for token refresh
- Consent screen for user approval
- Secure token storage

### Privacy Protection
- No raw email content stored
- Only brand identifiers extracted
- User can disconnect anytime
- Audit trail of all scans

## Brand Matching Algorithm

### Matching Priority
1. **Email Domain Match** (100% confidence)
   - Exact match: `orders@zara.com` → Zara
   - Common patterns: `noreply@`, `email@`, etc.

2. **Alias Exact Match** (100% confidence)
   - Pre-defined brand aliases
   - Store name variations

3. **Fuzzy Name Match** (70-95% confidence)
   - PostgreSQL `pg_trgm` similarity
   - Handles typos and variations

4. **Fallback Exact Match** (100% confidence)
   - Case-insensitive exact match
   - Used when pg_trgm unavailable

### Auto-Follow Threshold
- Only brands with confidence ≥ 80% are auto-followed
- User can always manually follow/unfollow
- Scan results show all matches for review

## Configuration

### Environment Variables
```env
# Gmail API (Required)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/email/callback

# Encryption (Required)
ENCRYPTION_KEY=64_char_hex_string

# Database (Existing)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=muse_shopping_dev
DB_USER=muse_admin
DB_PASSWORD=your_password

# JWT (Existing)
JWT_SECRET=your_jwt_secret
```

### Scanning Parameters
```javascript
MAX_EMAILS_TO_SCAN = 500      // Max emails per scan
MONTHS_TO_SCAN_BACK = 12      // How far back to scan
BATCH_SIZE = 50               // Process in batches
CONFIDENCE_THRESHOLD = 80     // Auto-follow threshold
```

## Testing

### Test Encryption
```bash
npm run test:encryption
```

### Manual Testing
1. Get auth URL: `GET /api/v1/email/connect`
2. Visit URL and grant permissions
3. Complete connection: `POST /api/v1/email/callback`
4. Trigger scan: `POST /api/v1/email/scan`
5. Check results: `GET /api/v1/email/status`

### Test with Postman
Import the API endpoints and test the complete flow.

## Monitoring

### Key Metrics to Track
- OAuth connection success rate
- Email scan completion rate
- Brand match accuracy
- Auto-follow conversion rate
- Token refresh failures
- API error rates

### Log Files
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

## Troubleshooting

### Common Issues

**1. Missing environment variables**
```bash
# Verify .env has all required variables
cat .env | grep GOOGLE
cat .env | grep ENCRYPTION_KEY
```

**2. Invalid authorization code**
- Code expires in 10 minutes
- Can only be used once
- Get new code by visiting auth URL again

**3. No brands matched**
- Verify brands exist in database
- Run brand aliases seed script
- Check scan results for extracted brands

**4. Token refresh fails**
- User must reconnect Gmail account
- Check if user revoked permissions
- Verify refresh token is valid

**5. Encryption errors**
- Never change ENCRYPTION_KEY after use
- If key changes, existing tokens cannot be decrypted
- Users must reconnect

## Production Considerations

### Before Deployment
- [ ] Use production OAuth credentials
- [ ] Update redirect URI to production URL
- [ ] Enable SSL/HTTPS for all endpoints
- [ ] Store ENCRYPTION_KEY in secrets manager
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Review Gmail API quotas
- [ ] Test token refresh flow
- [ ] Document privacy policy
- [ ] Add user consent flow
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Set up log aggregation
- [ ] Configure backup for encryption key

### Gmail API Quotas
- 1 billion quota units per day
- Each API call costs quota units
- Monitor usage in Google Cloud Console
- Implement rate limiting if needed

## Future Enhancements

### Planned Features
- [ ] Scheduled automatic scans
- [ ] Multiple email provider support (Outlook, Yahoo)
- [ ] Manual brand confirmation workflow
- [ ] Scan history analytics
- [ ] Brand discovery trends
- [ ] Machine learning for better matching
- [ ] Email preview before scanning
- [ ] Scan progress indicators
- [ ] Export scan results

### Optimization Ideas
- [ ] Cache brand aliases in Redis
- [ ] Background worker for async scanning
- [ ] Parallel email processing
- [ ] Incremental scans (only new emails)
- [ ] Smart retry for failed matches
- [ ] User preferences for scan settings

## Support & Resources

### Documentation
- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Reference](https://developers.google.com/gmail/api)
- [PostgreSQL Text Search](https://www.postgresql.org/docs/current/textsearch.html)

### Internal Docs
- Setup Guide: `GMAIL_INTEGRATION_SETUP.md`
- Technical Docs: `GMAIL_INTEGRATION_TECHNICAL.md`
- Quick Start: `GMAIL_API_QUICK_START.md`

### Getting Help
1. Check documentation files
2. Review server logs
3. Test encryption utility
4. Verify database migrations
5. Check Google Cloud Console

## License

Same as parent project.

---

**Version:** 1.0.0
**Last Updated:** 2026-02-02
**Maintained by:** Development Team
