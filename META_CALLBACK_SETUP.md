# Meta Data Deletion Callback Setup Guide

**Time Required:** 30 minutes
**Status:** ✅ Endpoint Created - Just Need Configuration

---

## What This Is

Meta/Facebook requires apps that access user data to provide a **Data Deletion Callback URL**. When a user deletes their Facebook/Instagram account or revokes your app's permissions, Meta will send a signed request to your callback URL, and you must delete all their data.

We've already built the endpoint - you just need to configure it in Meta's dashboard!

---

## Step 1: Set Environment Variables (5 minutes)

Add these to your `.env` file (already in `.env.example`):

```bash
# Meta/Facebook/Instagram
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
INSTAGRAM_CLIENT_ID=your_instagram_client_id_here
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret_here

# App URL (production)
APP_URL=https://yourdomain.com
```

**Where to Find These Values:**

1. Go to https://developers.facebook.com/apps
2. Select your app
3. Go to Settings → Basic
4. Copy:
   - **App ID** → `FACEBOOK_APP_ID`
   - **App Secret** (click "Show") → `FACEBOOK_APP_SECRET`

For Instagram:
- Instagram Client ID is usually the same as Facebook App ID
- Instagram Client Secret is usually the same as Facebook App Secret

---

## Step 2: Deploy Your App (if not already deployed)

Make sure your Muse backend is deployed and accessible at your production URL.

**Callback Endpoint:**
```
https://yourdomain.com/api/v1/data-deletion-callback
```

**Status Page:**
```
https://yourdomain.com/api/v1/deletion-status?id=<confirmation_code>
```

---

## Step 3: Configure Meta Dashboard (10 minutes)

### A. Add Data Deletion Callback URL

1. Go to https://developers.facebook.com/apps
2. Select your app
3. Go to **App Settings** → **Basic**
4. Scroll down to **Data Deletion Instructions URL**
5. Enter your callback URL:
   ```
   https://yourdomain.com/api/v1/data-deletion-callback
   ```
6. Click **Save Changes**

### B. (Optional) Test the Callback

Meta provides a debugger to test your callback:

1. Go to https://developers.facebook.com/tools/debug/
2. Select your app
3. Click **Test Data Deletion Callback**
4. Meta will send a test request
5. Verify you receive it and return proper response

---

## Step 4: Verify It Works (5 minutes)

### Test with cURL (Local Testing)

```bash
# 1. Generate a test signed request (this is complex, use Meta's tools instead)

# 2. Send to your endpoint
curl -X POST https://yourdomain.com/api/v1/data-deletion-callback \
  -H "Content-Type: application/json" \
  -d '{"signed_request": "META_SIGNED_REQUEST_HERE"}'

# Expected response:
# {
#   "url": "https://yourdomain.com/api/v1/deletion-status?id=abc123...",
#   "confirmation_code": "abc123..."
# }
```

### Check Audit Logs

```sql
-- Verify deletion requests are being logged
SELECT *
FROM audit_logs
WHERE action = 'data_deletion_request'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Deletion Status Page

Visit the confirmation URL in your browser:
```
https://yourdomain.com/api/v1/deletion-status?id=<confirmation_code>
```

You should see an HTML page with deletion status.

---

## Step 5: Update Privacy Policy URLs (5 minutes)

While you're in the Meta dashboard:

1. Go to **App Settings** → **Basic**
2. Add **Privacy Policy URL**:
   ```
   https://yourdomain.com/api/v1/privacy
   ```
3. Add **Terms of Service URL**:
   ```
   https://yourdomain.com/api/v1/terms
   ```
4. Click **Save Changes**

---

## What Happens When Data Deletion is Triggered

### 1. User Action
- User deletes their Facebook/Instagram account, OR
- User revokes your app's permissions

### 2. Meta Sends Request
Meta sends a POST request to your callback:
```json
{
  "signed_request": "ENCODED_SIGNATURE.ENCODED_PAYLOAD"
}
```

### 3. Your Endpoint Processes It

The endpoint (`src/routes/dataDeletionRoutes.js`) automatically:
1. Verifies the signature (HMAC-SHA256)
2. Extracts the user_id from the signed request
3. Finds the user in your database
4. Deletes all Instagram data:
   - `instagram_style_insights`
   - `user_instagram_follows`
   - `social_connections` (Instagram)
5. Creates audit log entry
6. Returns confirmation URL

### 4. Confirmation Response
```json
{
  "url": "https://yourdomain.com/api/v1/deletion-status?id=abc123",
  "confirmation_code": "abc123"
}
```

### 5. Status Page
Meta can visit the confirmation URL to verify deletion occurred.

---

## Troubleshooting

### Error: "Invalid signature"

**Problem:** Meta's signature verification failed

**Solutions:**
1. Check `FACEBOOK_APP_SECRET` is correct
2. Make sure you're not modifying the `signed_request` parameter
3. Verify environment variable is loaded

```bash
# Check env var is set
node -e "console.log(process.env.FACEBOOK_APP_SECRET)"
```

### Error: "Missing signed_request parameter"

**Problem:** Meta didn't send the signed request

**Solutions:**
1. Verify endpoint URL is correct in Meta dashboard
2. Check your server is reachable from Meta's servers
3. Verify you're accepting POST requests

### Error: "User not found"

**Problem:** User already deleted or never connected Instagram

**Solutions:**
- This is OK! The endpoint still returns success
- Logs a warning but doesn't error
- Meta just needs confirmation you handled it

### Check Logs

```bash
# View server logs for data deletion requests
tail -f /var/log/muse/server.log | grep "Data deletion"
```

Or check database:
```sql
SELECT * FROM audit_logs
WHERE action = 'data_deletion_request'
ORDER BY created_at DESC;
```

---

## Security Notes

✅ **Already Implemented:**
- Signature verification (HMAC-SHA256)
- Timing-safe comparison
- Audit logging
- Transaction safety
- Error handling

⚠️ **Important:**
- Never disable signature verification
- Always use HTTPS in production
- Monitor audit logs for deletion requests
- Keep `FACEBOOK_APP_SECRET` secret

---

## Testing Checklist

Before going live:

- [ ] Environment variables set (`FACEBOOK_APP_SECRET`, `APP_URL`)
- [ ] Callback URL added to Meta dashboard
- [ ] Privacy Policy URL added to Meta dashboard
- [ ] Terms of Service URL added to Meta dashboard
- [ ] Tested with Meta's callback debugger
- [ ] Verified signature verification works
- [ ] Checked audit logs record deletions
- [ ] Tested deletion status page loads
- [ ] Verified Instagram data is actually deleted

---

## Quick Reference

**Callback Endpoint:**
```
POST https://yourdomain.com/api/v1/data-deletion-callback
```

**Status Page:**
```
GET https://yourdomain.com/api/v1/deletion-status?id=<code>
```

**Privacy Policy:**
```
GET https://yourdomain.com/api/v1/privacy
```

**Terms of Service:**
```
GET https://yourdomain.com/api/v1/terms
```

**Meta Dashboard:**
- https://developers.facebook.com/apps
- Settings → Basic → Data Deletion Instructions URL

**Test Debugger:**
- https://developers.facebook.com/tools/debug/

---

## Summary

✅ **What's Done:**
- Data deletion endpoint created
- Signature verification implemented
- Instagram data deletion logic built
- Audit logging configured
- Status page created
- Privacy policy created
- Terms of service created
- Routes registered

⚠️ **What You Need to Do:**
1. Set environment variables (5 min)
2. Add callback URL to Meta dashboard (5 min)
3. Add Privacy Policy & ToS URLs (2 min)
4. Test with Meta's debugger (5 min)

**Total Time:** ~20-30 minutes

**Then you're 100% compliant with Meta's requirements!** 🎉
