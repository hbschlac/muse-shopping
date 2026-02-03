# Gmail Integration - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/v1/email/callback`
5. Save Client ID and Client Secret

### 3. Configure Environment
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/email/callback
ENCRYPTION_KEY=generated_key_here
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Seed Brand Aliases
```bash
psql -U muse_admin -d muse_shopping_dev -f src/db/seeds/brand_aliases.sql
```

### 6. Start Server
```bash
npm run dev
```

---

## Quick Test

### Step 1: Get Auth URL
```bash
curl -X GET http://localhost:3000/api/v1/email/connect \
  -H "Authorization: Bearer YOUR_JWT"
```

### Step 2: Visit Auth URL
Copy the `authUrl` from response and visit in browser. Grant permissions.

### Step 3: Complete Connection
After redirect, copy the `code` parameter from URL:
```bash
curl -X POST http://localhost:3000/api/v1/email/callback \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"code": "PASTE_CODE_HERE"}'
```

### Step 4: Scan Emails
```bash
curl -X POST http://localhost:3000/api/v1/email/scan \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/email/connect` | Get OAuth URL |
| POST | `/api/v1/email/callback` | Complete OAuth |
| POST | `/api/v1/email/scan` | Scan emails |
| GET | `/api/v1/email/status` | Connection status |
| DELETE | `/api/v1/email/disconnect` | Disconnect |
| GET | `/api/v1/email/scans` | Scan history |

---

## Common Issues

**Error: Missing environment variables**
- Check `.env` file has all required variables

**Error: Invalid authorization code**
- Code expires in 10 minutes
- Get a new code by visiting auth URL again

**No brands matched**
- Run brand aliases seed script
- Check if brands exist in database

**Token decryption fails**
- Never change `ENCRYPTION_KEY` after storing tokens
- Users must reconnect if key changes

---

## File Structure Created

```
src/
├── config/googleAuth.js
├── controllers/emailConnectionController.js
├── routes/emailConnectionRoutes.js
├── services/
│   ├── emailScannerService.js
│   └── brandMatcherService.js
└── utils/
    ├── emailParser.js
    └── encryption.js

db/
├── migrations/007_email_connections.sql
└── seeds/brand_aliases.sql
```

---

## Next Steps

1. Test with your own Gmail account
2. Add more brand aliases as needed
3. Integrate with frontend
4. Set up monitoring and logging
5. Deploy to production

For detailed documentation, see:
- `GMAIL_INTEGRATION_SETUP.md` - Complete setup guide
- `GMAIL_INTEGRATION_TECHNICAL.md` - Technical details

---

**Need Help?**
- Check server logs in `logs/` directory
- Verify migrations ran: `\dt` in psql
- Test encryption: Run encryption tests
- Check Google Cloud Console for API quotas
