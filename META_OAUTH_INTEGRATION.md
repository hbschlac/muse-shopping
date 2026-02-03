# Meta (Instagram/Facebook) OAuth Integration 🔗

## Overview

This integration allows Muse users to connect their Instagram and Facebook accounts to their Muse profile using Meta's OAuth 2.0 flow. Once connected, users can sync their social media data, preferences, and potentially use it for enhanced personalization.

---

## Features

✅ **Instagram Business/Creator Account Connection**
- Connect Instagram Business or Creator accounts
- Fetch username, display name, profile picture
- Access follower count and media count
- Secure OAuth 2.0 flow with encrypted token storage

✅ **Facebook Account Connection**
- Connect Facebook personal accounts
- Fetch name, email, profile picture
- Access to Facebook Pages
- Secure OAuth 2.0 flow with encrypted token storage

✅ **Secure Token Management**
- All OAuth tokens are encrypted at rest
- Token expiration tracking
- Automatic token validation
- Secure disconnection flow

✅ **Multi-Platform Support**
- Single callback endpoint handles both Instagram and Facebook
- Extensible architecture for adding TikTok, Twitter, etc.
- User can connect multiple platforms simultaneously

---

## Architecture

### Database Schema

**Table: `social_connections`**
```sql
social_connections (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  provider VARCHAR(50), -- 'instagram', 'facebook'
  provider_user_id VARCHAR(255), -- User's ID on platform
  username VARCHAR(255), -- @username
  display_name VARCHAR(255), -- Full name
  profile_picture_url TEXT,
  access_token_encrypted TEXT, -- Encrypted token
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  scopes TEXT[], -- Permissions granted
  is_active BOOLEAN,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, provider)
)
```

### Files Created

1. **Service Layer** (`src/services/metaAuthService.js`)
   - Core OAuth logic
   - Token exchange
   - Account info fetching
   - Database operations

2. **Controller** (`src/controllers/metaAuthController.js`)
   - HTTP request handlers
   - OAuth flow coordination
   - Success/error page rendering

3. **Routes** (`src/routes/socialConnectionRoutes.js`)
   - API endpoint definitions
   - Auth middleware integration

4. **Migration** (`migrations/017_create_social_connections.sql`)
   - Database schema creation
   - Indexes and constraints

---

## Setup Instructions

### 1. Create Meta App

**Go to Meta for Developers:**
1. Visit [https://developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" app type
4. Fill in app details (name, email)

**Add Products:**
1. **For Instagram:**
   - Add "Instagram Basic Display" product
   - Configure OAuth Redirect URI: `http://localhost:3000/api/v1/social/meta/callback`
   - Add Instagram testers (Settings → Basic Display → Instagram Testers)

2. **For Facebook:**
   - Add "Facebook Login" product
   - Configure Valid OAuth Redirect URIs: `http://localhost:3000/api/v1/social/meta/callback`

**Get Credentials:**
1. Go to Settings → Basic
2. Copy your **App ID**
3. Copy your **App Secret**

### 2. Configure Environment Variables

Update `.env` file:
```bash
# Meta (Instagram/Facebook) OAuth Configuration
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
META_REDIRECT_URI=http://localhost:3000/api/v1/social/meta/callback
```

### 3. Run Migration

```bash
psql -h localhost -p 5432 -U muse_admin -d muse_shopping_dev -f migrations/017_create_social_connections.sql
```

### 4. Restart Server

```bash
npm start
```

---

## API Endpoints

### Connect Instagram

**Request:**
```http
GET /api/v1/social/instagram/connect
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?...",
    "state": "instagram_123_1234567890",
    "provider": "instagram"
  },
  "message": "Visit the authorization URL to connect your Instagram account"
}
```

**Flow:**
1. User clicks "Connect Instagram" in frontend
2. Frontend calls this endpoint
3. User is redirected to `authUrl`
4. User authorizes app on Instagram
5. Meta redirects to callback endpoint
6. Success page is shown
7. User is redirected back to app settings

---

### Connect Facebook

**Request:**
```http
GET /api/v1/social/facebook/connect
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?...",
    "state": "facebook_123_1234567890",
    "provider": "facebook"
  },
  "message": "Visit the authorization URL to connect your Facebook account"
}
```

---

### OAuth Callback (Handled by Meta)

**Endpoint:**
```http
GET /api/v1/social/meta/callback?code=<code>&state=<state>
```

This endpoint is called automatically by Meta after user authorization. It:
1. Extracts userId and provider from state parameter
2. Exchanges authorization code for access token
3. Fetches user profile from Instagram/Facebook
4. Encrypts and stores access token in database
5. Shows success page with profile info
6. Auto-redirects to app settings page

---

### Get Connected Accounts

**Request:**
```http
GET /api/v1/social/connections
Authorization: Bearer <jwt_token>
```

**Optional Query Parameters:**
- `provider` - Filter by provider (instagram, facebook)

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": 1,
        "user_id": 123,
        "provider": "instagram",
        "username": "fashionista_muse",
        "display_name": "Fashion Muse",
        "profile_picture_url": "https://...",
        "is_active": true,
        "last_synced_at": "2026-02-03T12:00:00Z",
        "created_at": "2026-01-15T10:30:00Z",
        "token_expires_at": "2026-04-03T12:00:00Z"
      },
      {
        "id": 2,
        "user_id": 123,
        "provider": "facebook",
        "username": null,
        "display_name": "Hannah Smith",
        "profile_picture_url": "https://...",
        "is_active": true,
        "created_at": "2026-01-20T14:00:00Z"
      }
    ],
    "count": 2
  },
  "message": "Social connections retrieved successfully"
}
```

---

### Disconnect Account

**Request:**
```http
DELETE /api/v1/social/:provider/disconnect
Authorization: Bearer <jwt_token>
```

**Example:**
```http
DELETE /api/v1/social/instagram/disconnect
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "instagram",
    "disconnected": true
  },
  "message": "Instagram account disconnected successfully"
}
```

---

## Usage Examples

### Frontend Integration

**React Example:**

```javascript
// Connect Instagram
const connectInstagram = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/social/instagram/connect', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const data = await response.json();

    // Redirect user to Instagram OAuth
    window.location.href = data.data.authUrl;
  } catch (error) {
    console.error('Failed to connect Instagram:', error);
  }
};

// Get connected accounts
const getConnections = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/social/connections', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const data = await response.json();
    setConnections(data.data.connections);
  } catch (error) {
    console.error('Failed to fetch connections:', error);
  }
};

// Disconnect Instagram
const disconnectInstagram = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/social/instagram/disconnect', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const data = await response.json();
    console.log('Disconnected:', data);
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
};
```

---

## Security Features

### Token Encryption

All OAuth tokens are encrypted before storage using AES-256-CBC:

```javascript
const { encrypt, decrypt } = require('../utils/encryption');

// Encrypting token
const encryptedToken = encrypt(accessToken);

// Decrypting token
const decryptedToken = decrypt(encryptedToken);
```

### State Parameter (CSRF Protection)

State parameter format: `{provider}_{userId}_{timestamp}`

Example: `instagram_123_1707834567890`

This prevents CSRF attacks by:
1. Embedding user ID in state
2. Verifying state on callback
3. Ensuring request originated from our app

### Unique Constraints

Database enforces:
- One connection per user per provider: `UNIQUE(user_id, provider)`
- One provider account per connection: `UNIQUE(provider, provider_user_id)`

---

## Instagram Business Account Requirements

⚠️ **Important:** Instagram Basic Display API requires:

1. **Instagram Business or Creator Account**
   - Personal accounts won't work
   - Convert to Business/Creator in Instagram app settings

2. **Linked to Facebook Page**
   - Instagram account must be linked to a Facebook Page
   - Link in Instagram → Settings → Account → Linked Accounts

3. **App Review (for Production)**
   - For development: Add Instagram testers in Meta App settings
   - For production: Submit app for Instagram Basic Display review

---

## Error Handling

### Common Errors

**1. "No Instagram Business Account found"**
- User connected personal Instagram account
- Solution: Convert to Business/Creator account and link to Facebook Page

**2. "Invalid or expired authorization code"**
- Authorization code already used or expired
- Solution: Start OAuth flow again

**3. "Meta OAuth credentials not configured"**
- Missing META_APP_ID or META_APP_SECRET
- Solution: Add credentials to .env file

**4. "Authentication required"**
- User not logged in
- Solution: Provide valid JWT token in Authorization header

---

## Testing

### Test Instagram Connection

1. **Setup test account:**
   - Create Instagram Business account
   - Link to Facebook Page
   - Add as tester in Meta App settings

2. **Test flow:**
   ```bash
   # Get auth URL (replace with your JWT token)
   curl -X GET http://localhost:3000/api/v1/social/instagram/connect \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

   # Visit the authUrl in browser
   # Authorize the app
   # You'll be redirected to callback

   # Check connections
   curl -X GET http://localhost:3000/api/v1/social/connections \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Test Facebook Connection

```bash
# Get auth URL
curl -X GET http://localhost:3000/api/v1/social/facebook/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Visit authUrl, authorize, then check connections
curl -X GET http://localhost:3000/api/v1/social/connections?provider=facebook \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Future Enhancements

### Phase 2 - Data Sync
- Sync Instagram posts and engagement metrics
- Sync Facebook interests and pages followed
- Analyze style preferences from social media content
- Use social data for personalized recommendations

### Phase 3 - Additional Platforms
- TikTok OAuth integration
- Pinterest OAuth integration
- Twitter/X OAuth integration
- Extensible architecture already supports this

### Phase 4 - Advanced Features
- Auto-refresh expired tokens
- Scheduled data syncing
- Social media analytics dashboard
- Cross-platform style insights

---

## OAuth Scopes Reference

### Instagram Scopes
- `instagram_basic` - Access basic profile info
- `instagram_content_publish` - Publish content (future)
- `pages_show_list` - View Facebook Pages
- `pages_read_engagement` - Read page insights

### Facebook Scopes
- `public_profile` - Access public profile
- `email` - Access email address
- `pages_show_list` - View Facebook Pages
- `pages_read_engagement` - Read page insights
- `instagram_basic` - Access Instagram account
- `instagram_manage_insights` - View Instagram insights

---

## Troubleshooting

### Issue: Callback URL Mismatch

**Error:** "URL Blocked: This redirect failed because the redirect URI is not whitelisted"

**Solution:**
1. Go to Meta App → Facebook Login → Settings
2. Add callback URL: `http://localhost:3000/api/v1/social/meta/callback`
3. Save changes

### Issue: App Not in Development Mode

**Error:** "The app is not in development mode"

**Solution:**
1. Go to Meta App → Settings → Basic
2. Set App Mode to "Development"
3. Add testers in Roles → Testers

### Issue: Instagram Account Not Found

**Error:** "No Instagram Business Account found"

**Solution:**
1. Convert Instagram to Business/Creator account
2. Link Instagram to Facebook Page
3. Ensure Page has admin access
4. Try connecting again

---

## Database Queries

### Get all active connections for a user
```sql
SELECT * FROM social_connections
WHERE user_id = 123 AND is_active = true;
```

### Check token expiration
```sql
SELECT
  username,
  provider,
  token_expires_at,
  CASE
    WHEN token_expires_at < NOW() THEN 'expired'
    WHEN token_expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as token_status
FROM social_connections
WHERE user_id = 123;
```

### Count connections by provider
```sql
SELECT
  provider,
  COUNT(*) as connection_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM social_connections
GROUP BY provider;
```

---

## Success! 🎉

Your Meta OAuth integration is now complete and ready to use. Users can:

✅ Connect Instagram Business/Creator accounts
✅ Connect Facebook accounts
✅ View all their connected accounts
✅ Disconnect accounts securely
✅ Benefit from encrypted token storage

The foundation is set for future features like social media data sync and enhanced personalization based on social media preferences!

---

**Status:** Meta OAuth Integration Complete! 🚀
**Last Updated:** February 3, 2026
