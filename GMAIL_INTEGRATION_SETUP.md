# Gmail API Integration Setup Guide

Complete guide for setting up the Gmail API integration for automatic brand discovery and following.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Google Cloud Setup](#google-cloud-setup)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running Migrations](#running-migrations)
7. [Testing the Integration](#testing-the-integration)
8. [API Endpoints](#api-endpoints)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This integration allows users to:
- Connect their Gmail account via OAuth 2.0
- Scan order confirmation emails automatically
- Extract brand names from emails
- Match brands to database records
- Auto-follow discovered brands

**Security Features:**
- Read-only Gmail access (`gmail.readonly` scope)
- Token encryption using AES-256-GCM
- No raw email content stored
- User-initiated scans only

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Gmail account for testing
- Google Cloud Platform account

---

## Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

### Step 2: Enable Gmail API

1. In the Cloud Console, navigate to **APIs & Services > Library**
2. Search for "Gmail API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (or Internal if using Google Workspace)
3. Fill in the required fields:
   - **App name:** Muse Shopping
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Click **Save and Continue**
7. Add test users (your Gmail account for testing)
8. Click **Save and Continue**

### Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Choose **Web application**
4. Configure:
   - **Name:** Muse Shopping Backend
   - **Authorized redirect URIs:** `http://localhost:3000/api/v1/email/callback`
   - For production, add your production callback URL
5. Click **Create**
6. **SAVE YOUR CLIENT ID AND CLIENT SECRET** - you'll need these!

### Step 5: Download Credentials (Optional)

You can download the credentials JSON file, but you only need:
- `client_id`
- `client_secret`
- `redirect_uris`

---

## Database Setup

### Step 1: Enable PostgreSQL Extensions

The integration uses `pg_trgm` for fuzzy text matching (optional but recommended):

```sql
-- Connect to your database
psql -U muse_admin -d muse_shopping_dev

-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

If you don't have superuser access or can't install `pg_trgm`, the system will fall back to exact matching.

### Step 2: Run the Migration

```bash
# From project root
npm run migrate
```

This will create the following tables:
- `email_connections` - OAuth tokens and connection status
- `brand_aliases` - Brand domain and name variations
- `email_scan_results` - Audit log of email scans
- `extracted_brands_queue` - Temporary processing queue

### Step 3: Seed Brand Aliases

```bash
# Connect to database
psql -U muse_admin -d muse_shopping_dev

# Run the seed file
\i src/db/seeds/brand_aliases.sql
```

This populates common brand email domains and variations for popular brands like:
- Zara, H&M, Nike, Adidas
- Nordstrom, Macy's, Target
- ASOS, Forever 21, Uniqlo
- And more...

**Note:** The seed file assumes brands exist in your `brands` table with matching names.

---

## Environment Configuration

### Step 1: Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This generates a secure 64-character hex string for encrypting OAuth tokens.

### Step 2: Update .env File

Copy `.env.example` to `.env` and update:

```env
# Gmail API Configuration
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/email/callback

# Encryption
ENCRYPTION_KEY=your_generated_64_char_hex_string_here
```

**Important:**
- Never commit `.env` file to git
- Use different credentials for development and production
- Keep `ENCRYPTION_KEY` secure - if lost, you cannot decrypt existing tokens

---

## Running Migrations

### Run All Migrations

```bash
npm run migrate
```

### Verify Migration

```bash
psql -U muse_admin -d muse_shopping_dev

# List tables
\dt

# Check email_connections table structure
\d email_connections

# Check brand_aliases table structure
\d brand_aliases
```

---

## Testing the Integration

### Step 1: Start the Server

```bash
npm run dev
```

### Step 2: Test OAuth Flow

**1. Initiate Connection (Get Auth URL):**

```bash
# Replace YOUR_JWT_TOKEN with actual auth token
curl -X GET http://localhost:3000/api/v1/email/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  },
  "message": "Please visit the authorization URL to connect your Gmail account"
}
```

**2. Visit the Auth URL in Browser:**
- Copy the `authUrl` from the response
- Paste in browser and visit
- Sign in with your Google account
- Grant permissions
- You'll be redirected to the callback URL
- Copy the `code` parameter from the URL

Example callback URL:
```
http://localhost:3000/api/v1/email/callback?code=4/0AY0e-g7...&scope=...
```

**3. Complete Connection:**

```bash
curl -X POST http://localhost:3000/api/v1/email/callback \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "4/0AY0e-g7..."}'
```

Response:
```json
{
  "success": true,
  "data": {
    "connectionId": 1,
    "provider": "gmail",
    "emailAddress": "user@gmail.com",
    "isActive": true,
    "createdAt": "2026-02-02T..."
  },
  "message": "Gmail account connected successfully"
}
```

### Step 3: Check Connection Status

```bash
curl -X GET http://localhost:3000/api/v1/email/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Trigger Email Scan

```bash
curl -X POST http://localhost:3000/api/v1/email/scan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "scanId": 1,
    "emailsScanned": 156,
    "brandsFound": 23,
    "brandsMatched": 18,
    "brandsAutoFollowed": 12,
    "durationMs": 45230,
    "details": {
      "matchedBrands": [...],
      "followedBrandIds": [1, 5, 12, ...]
    }
  },
  "message": "Email scan completed. Found 18 brands, auto-followed 12."
}
```

### Step 5: View Scan History

```bash
curl -X GET http://localhost:3000/api/v1/email/scans?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 6: Disconnect

```bash
curl -X DELETE http://localhost:3000/api/v1/email/disconnect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## API Endpoints

### GET /api/v1/email/connect
Get Gmail OAuth authorization URL.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

---

### POST /api/v1/email/callback
Complete OAuth connection with authorization code.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "code": "4/0AY0e-g7..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connectionId": 1,
    "provider": "gmail",
    "emailAddress": "user@gmail.com",
    "isActive": true
  }
}
```

---

### POST /api/v1/email/scan
Trigger email scan for order confirmations.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "emailsScanned": 156,
    "brandsMatched": 18,
    "brandsAutoFollowed": 12,
    "durationMs": 45230
  }
}
```

---

### GET /api/v1/email/status
Get connection status and last scan info.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "emailAddress": "user@gmail.com",
    "lastScannedAt": "2026-02-02T...",
    "lastScanResult": {
      "emailsScanned": 156,
      "brandsMatched": 18
    }
  }
}
```

---

### DELETE /api/v1/email/disconnect
Disconnect Gmail account.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Gmail account disconnected successfully"
}
```

---

### GET /api/v1/email/scans
Get scan history.

**Headers:** `Authorization: Bearer {token}`

**Query Params:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "scans": [...],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

## Security Considerations

### Token Encryption

All OAuth tokens are encrypted using AES-256-GCM before storage:
- Unique salt per encryption
- Authentication tag for integrity
- PBKDF2 key derivation with 100,000 iterations

### Gmail API Scopes

Only minimal scopes are requested:
- `gmail.readonly` - Read-only access to emails
- `userinfo.email` - Get user's email address

**Never store:**
- Raw email content
- Email bodies (only snippets for processing)
- Sensitive user data from emails

### Auto-Follow Confidence Threshold

Brands are only auto-followed if confidence score >= 80:
- Exact domain match: 100% confidence
- Exact alias match: 100% confidence
- Fuzzy name match: 70-95% confidence (if above threshold)

### Privacy Best Practices

1. Clear user consent before scanning
2. Show what data will be accessed
3. Allow users to disconnect anytime
4. Don't share scan results with other users
5. Audit log all scans

---

## Troubleshooting

### Error: "Missing required environment variables"

**Solution:** Ensure all required env vars are set in `.env`:
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
ENCRYPTION_KEY=...
```

### Error: "Invalid or expired authorization code"

**Causes:**
- Authorization code was already used
- Code expired (10 minutes)
- Wrong redirect URI

**Solution:** Request a new authorization code by visiting the auth URL again.

### Error: "Failed to refresh access token"

**Causes:**
- Refresh token was revoked
- User revoked app permissions
- Token encryption key changed

**Solution:** User must reconnect their Gmail account.

### No Brands Matched

**Causes:**
- No order confirmation emails found
- Brand aliases not seeded
- Brands don't exist in database

**Solutions:**
1. Check if user has order emails in Gmail
2. Run brand aliases seed script
3. Add brands to database first
4. Add custom aliases for specific brands

### Fuzzy Matching Not Working

**Cause:** `pg_trgm` extension not installed

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Or the system will fall back to exact matching only.

### Token Decryption Fails

**Cause:** `ENCRYPTION_KEY` changed

**Critical:** If you lose the encryption key, existing tokens cannot be decrypted. Users must reconnect.

**Solution:**
- Never change `ENCRYPTION_KEY` in production
- Backup the key securely
- Use a key management service for production

---

## Adding Custom Brand Aliases

To add aliases for a new brand:

```sql
-- Get the brand ID
SELECT id FROM brands WHERE name = 'CustomBrand';

-- Add email domain alias
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
VALUES (123, 'email_domain', 'custombrand.com', 100);

-- Add order email alias
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
VALUES (123, 'email_domain', 'orders@custombrand.com', 100);

-- Add store name variation
INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
VALUES (123, 'store_name', 'Custom Brand', 100);
```

---

## Production Deployment Checklist

- [ ] Use production Google OAuth credentials
- [ ] Update `GOOGLE_REDIRECT_URI` to production URL
- [ ] Add production redirect URI to Google Cloud Console
- [ ] Use secure `ENCRYPTION_KEY` (stored in secrets manager)
- [ ] Enable SSL/HTTPS for callback endpoint
- [ ] Set up monitoring for failed token refreshes
- [ ] Configure rate limiting on scan endpoint
- [ ] Review and adjust `MAX_EMAILS_TO_SCAN` limit
- [ ] Set up error alerting
- [ ] Test token refresh flow
- [ ] Document user privacy policy
- [ ] Add user consent flow in frontend
- [ ] Test account disconnection flow

---

## Next Steps

1. **Frontend Integration:**
   - Add "Connect Gmail" button
   - Handle OAuth redirect flow
   - Display scan results
   - Show discovered brands

2. **Enhancements:**
   - Schedule automatic scans
   - Add more email providers (Outlook, Yahoo)
   - Improve brand matching algorithm
   - Add manual brand confirmation UI
   - Support for multiple email accounts

3. **Analytics:**
   - Track scan success rates
   - Monitor brand match accuracy
   - Measure auto-follow conversion

---

## Support

For issues or questions:
1. Check this documentation
2. Review server logs in `logs/` directory
3. Check Gmail API quotas in Google Cloud Console
4. Verify database migrations ran successfully

---

**Last Updated:** 2026-02-02
