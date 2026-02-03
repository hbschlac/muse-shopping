# Get Gmail Credentials - 5 Minute Guide

## You Need 2 Things:
1. **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
2. **Client Secret** (looks like: `GOCSPX-...`)

---

## Quick Steps (Already at console.cloud.google.com):

### 1. Enable Gmail API (1 min)
- Click "APIs & Services" in left sidebar
- Click "Library"
- Search: `Gmail API`
- Click "Enable" (if not already enabled)

### 2. Create OAuth Credentials (3 min)
- Click "Credentials" in left sidebar
- Click "+ CREATE CREDENTIALS" button at top
- Select "OAuth client ID"
- If prompted about consent screen:
  - Click "CONFIGURE CONSENT SCREEN"
  - Select "External"
  - App name: `Muse Shopping`
  - Your email in both fields
  - Click "SAVE AND CONTINUE" 3 times
  - Click "BACK TO DASHBOARD"
  - Go back to Credentials → Create OAuth client ID

- **Application type:** Web application
- **Name:** Muse Shopping
- **Authorized redirect URIs:**
  - Click "+ ADD URI"
  - Enter: `http://localhost:3000/api/v1/email/callback`
  - Click "CREATE"

### 3. Copy Your Credentials (1 min)
- Popup shows Client ID and Client Secret
- **COPY BOTH**
- Tell me when you have them!

---

## I'll Need You To:
Paste them here in chat like this:
```
Client ID: [paste here]
Client Secret: [paste here]
```

Then I'll:
1. Add them to your .env file
2. Restart the server
3. Test the Gmail connection
4. Scan your email for brands!

---

## Ready?
Let me know when you have the credentials! 🚀
