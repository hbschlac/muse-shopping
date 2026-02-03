# Gmail Setup - Using Existing Google Cloud Project 🚀

## Your Situation

You have an existing Google Cloud project from your "Bigger Than Run" project (2020). We'll update it for Muse Shopping instead of creating a new one.

---

## Quick Setup (10 minutes)

### Step 1: Select Your Existing Project (1 min)

1. **You're already at:** https://console.cloud.google.com
2. **Click the project dropdown** at the top (next to "Google Cloud")
3. **Select your existing project** (likely "Bigger Than Run" or similar)
4. You're now in your project!

---

### Step 2: Enable Gmail API (2 min)

1. **Go to API Library:**
   - In the left sidebar, click "APIs & Services" → "Library"
   - Or go directly: https://console.cloud.google.com/apis/library

2. **Search and Enable Gmail API:**
   - In the search box, type: `Gmail API`
   - Click on "Gmail API"
   - If not already enabled, click the blue "Enable" button
   - If already enabled, you'll see "Manage" - that's fine, continue!

---

### Step 3: Update OAuth Consent Screen (3 min)

1. **Go to OAuth Consent Screen:**
   - Left sidebar → "OAuth consent screen"
   - Or: https://console.cloud.google.com/apis/credentials/consent

2. **Check Your Settings:**
   - You likely already have a consent screen configured
   - If it says "External" - perfect!
   - If it says "Internal" - click "Edit App" and change to "External"

3. **Update App Information:**
   - **App name:** Change to `Muse Shopping` (or keep it if you prefer)
   - **User support email:** Your email
   - **Developer contact:** Your email
   - Click "Save and Continue"

4. **Update Scopes:**
   - Click "Edit" or "Add or Remove Scopes"
   - Search for: `gmail.readonly`
   - Make sure `.../auth/gmail.readonly` is checked
   - Click "Update" then "Save and Continue"

5. **Add Yourself as Test User:**
   - Under "Test users", click "Add Users"
   - Enter **your Gmail address** (the one you want to scan)
   - Click "Add"
   - Click "Save and Continue"

6. **Complete:**
   - Click through to "Summary"
   - Click "Back to Dashboard"

---

### Step 4: Create New OAuth Credentials for Muse (3 min)

Since you're repurposing the project, we need new OAuth credentials for Muse Shopping.

1. **Go to Credentials:**
   - Left sidebar → "Credentials"
   - Or: https://console.cloud.google.com/apis/credentials

2. **Create New OAuth Client:**
   - Click "+ Create Credentials" at the top
   - Select "OAuth client ID"

3. **Configure:**
   - **Application type:** Web application
   - **Name:** `Muse Shopping Web Client`

4. **Add Redirect URI:**
   - Under "Authorized redirect URIs"
   - Click "+ Add URI"
   - Enter exactly: `http://localhost:3000/api/v1/email/callback`
   - Click "Create"

5. **Save Your Credentials:**
   - A popup appears with your credentials
   - **Copy the Client ID** (looks like: `123456-abc...apps.googleusercontent.com`)
   - **Copy the Client Secret** (looks like: `GOCSPX-...`)
   - Keep this popup open or download the JSON

---

### Step 5: Update Your .env File (1 min)

Open your `.env` file and replace the placeholder values:

**Current (placeholders):**
```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

**Replace with your actual credentials:**
```bash
GOOGLE_CLIENT_ID=paste-your-actual-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-actual-client-secret-here
```

**Save the file!**

---

### Step 6: Restart Your Server (1 min)

The server needs to reload the new environment variables:

```bash
# Stop the server if running (Ctrl+C)
# Then start it again:
npm start
```

---

## 🧪 Test Gmail Connection

Once your server is running:

### Quick Test Flow

1. **Register/Login:**
   - Go to: http://localhost:8080/demo.html
   - Sign up or log in

2. **Get Your Access Token:**
   - After login, open browser DevTools (F12)
   - Go to Console tab
   - Type: `localStorage.getItem('access_token')`
   - Copy the token (without quotes)

3. **Connect Gmail:**
   ```bash
   # Replace YOUR_TOKEN with the token from step 2
   curl http://localhost:3000/api/v1/email/connect \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **You'll Get a Response Like:**
   ```json
   {
     "success": true,
     "data": {
       "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
     }
   }
   ```

5. **Authorize:**
   - Copy the `authUrl` from the response
   - Paste it in a browser tab
   - Sign in with your Gmail
   - You'll see "Google hasn't verified this app" - click "Advanced" → "Continue"
   - Click "Allow" to grant read-only access
   - You'll be redirected back

6. **Trigger Email Scan:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/email/scan \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

7. **Watch the Magic:**
   - The system scans your Gmail
   - Finds order confirmations
   - Extracts brand names
   - Auto-follows brands
   - Refresh your newsfeed to see results!

---

## 🎯 What to Expect

The email scanner will:

1. **Search your Gmail** (last 12 months, max 500 emails)
2. **Find order confirmations** containing keywords like:
   - "order confirmation"
   - "your order"
   - "order receipt"
   - "thank you for your purchase"

3. **Extract brands from:**
   - Email sender: `orders@zara.com` → Zara
   - Subject: "Your H&M Order #12345" → H&M
   - Body: "Thanks for shopping at Nike" → Nike

4. **Match to database** using:
   - 59 pre-loaded brand aliases
   - Fuzzy matching for variations
   - Confidence scoring

5. **Auto-follow brands** with confidence ≥ 80%

---

## 🔐 Privacy Notes

- ✅ **Read-only access** - Cannot send or modify emails
- ✅ **Scopes limited** - Only gmail.readonly requested
- ✅ **No storage** - Email content immediately discarded
- ✅ **Only brand names** - Stored brand identifiers, nothing else
- ✅ **Encrypted tokens** - OAuth tokens encrypted with AES-256-GCM
- ✅ **Audit trail** - All scans logged for transparency
- ✅ **Disconnect anytime** - Full control via API

---

## ❓ Troubleshooting

### "Access blocked: This app hasn't been verified"

**This is normal for development!**

1. Click "Advanced" (small link at bottom)
2. Click "Go to Muse Shopping (unsafe)"
3. This appears because the app isn't published
4. Your data is safe - you control the code

### "Redirect URI mismatch"

- Make sure you entered: `http://localhost:3000/api/v1/email/callback`
- Check spelling: http (not https), localhost (not 127.0.0.1)
- No trailing slash at the end
- Restart server after changes

### "Invalid client"

- Double-check you copied Client ID correctly
- Check for extra spaces in .env file
- Make sure values aren't wrapped in quotes
- Restart server after changing .env

### Server won't start

```bash
# Check if port 3000 is in use
lsof -ti:3000

# Kill existing process if needed
kill -9 $(lsof -ti:3000)

# Try again
npm start
```

### No brands found

- Normal if you don't have many shopping emails
- Check Gmail for: "order confirmation"
- Scanner looks at last 12 months only
- You can still follow brands manually!

---

## 📊 Expected Results

Based on typical Gmail shopping patterns:

- **10-30 brands discovered** from receipts
- **Common brands:** Amazon, Target, Nike, Zara, H&M, etc.
- **Auto-followed** with confidence > 80%
- **Immediate newsfeed** from your actual shopping habits

---

## 🎉 You're Set!

**Already done:**
- ✅ Database ready
- ✅ Encryption configured
- ✅ Dependencies installed
- ✅ Code complete

**Your checklist:**
- [ ] Enable Gmail API in your project
- [ ] Update OAuth consent screen
- [ ] Create OAuth credentials for Muse
- [ ] Copy Client ID & Secret to .env
- [ ] Restart server
- [ ] Test connection!

**Once credentials are in .env and server is restarted, you're ready to scan your Gmail!** 🚀

---

## 🔗 Direct Links (will open in your project)

- Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
- OAuth Consent: https://console.cloud.google.com/apis/credentials/consent
- Credentials: https://console.cloud.google.com/apis/credentials

---

**Need help? Each step above is detailed with screenshots in `GMAIL_INTEGRATION_SETUP.md`**
