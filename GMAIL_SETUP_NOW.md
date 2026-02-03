# Gmail Setup - Ready to Complete! 🚀

## ✅ Already Done (Automatic)

1. ✅ **Dependencies installed** - googleapis library ready
2. ✅ **Database migrated** - All tables created (email_connections, brand_aliases, etc.)
3. ✅ **Brand aliases loaded** - 59 aliases for 15+ brands
4. ✅ **Encryption key generated** - Added to .env file
5. ✅ **.env configured** - Placeholders ready for your credentials

---

## 📋 What You Need to Do (15 minutes)

### Step 1: Create Google Cloud Project (5 min)

1. **Go to Google Cloud Console:**
   - Open: https://console.cloud.google.com
   - Sign in with your Gmail account

2. **Create New Project:**
   - Click "Select a project" dropdown at top
   - Click "New Project"
   - Name: `Muse Shopping` (or any name you like)
   - Click "Create"
   - Wait for project creation (30 seconds)

3. **Select Your Project:**
   - Click the project dropdown again
   - Select "Muse Shopping" project

---

### Step 2: Enable Gmail API (2 min)

1. **Open APIs & Services:**
   - In left sidebar, click "APIs & Services" → "Library"
   - Or go directly to: https://console.cloud.google.com/apis/library

2. **Search for Gmail API:**
   - In the search box, type "Gmail API"
   - Click on "Gmail API" in results

3. **Enable the API:**
   - Click the blue "Enable" button
   - Wait for it to enable (10 seconds)

---

### Step 3: Configure OAuth Consent Screen (5 min)

1. **Go to OAuth Consent:**
   - Left sidebar → "OAuth consent screen"
   - Or: https://console.cloud.google.com/apis/credentials/consent

2. **Configure Consent Screen:**
   - User Type: Select **"External"**
   - Click "Create"

3. **Fill in App Information:**
   - **App name:** `Muse Shopping`
   - **User support email:** Your email address
   - **Developer contact:** Your email address
   - Leave other fields empty for now
   - Click "Save and Continue"

4. **Configure Scopes:**
   - Click "Add or Remove Scopes"
   - Search for: `gmail.readonly`
   - Check the box for: `.../auth/gmail.readonly`
   - Click "Update"
   - Click "Save and Continue"

5. **Add Test Users:**
   - Click "Add Users"
   - Enter **YOUR Gmail address** (the one you want to scan)
   - Click "Add"
   - Click "Save and Continue"

6. **Review:**
   - Review your settings
   - Click "Back to Dashboard"

---

### Step 4: Create OAuth Credentials (3 min)

1. **Go to Credentials:**
   - Left sidebar → "Credentials"
   - Or: https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client ID:**
   - Click "+ Create Credentials" at top
   - Select "OAuth client ID"

3. **Configure Application:**
   - Application type: **"Web application"**
   - Name: `Muse Shopping Web Client`

4. **Add Authorized Redirect URIs:**
   - Under "Authorized redirect URIs"
   - Click "+ Add URI"
   - Enter: `http://localhost:3000/api/v1/email/callback`
   - Click "Create"

5. **Copy Your Credentials:**
   - A popup will show your credentials
   - **Copy the Client ID** (starts with something like `123456789-abc...apps.googleusercontent.com`)
   - **Copy the Client Secret** (random string like `GOCSPX-...`)
   - Click "OK"

---

### Step 5: Update Your .env File (1 min)

Open `/Users/hannahschlacter/Desktop/muse-shopping/.env` and replace:

```bash
# Replace these two lines with your actual credentials:
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

With:
```bash
GOOGLE_CLIENT_ID=paste-your-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
```

**Save the file!**

---

### Step 6: Restart Your Server (1 min)

The server needs to load the new environment variables:

```bash
# Stop the current server (Ctrl+C if running)
# Then restart:
npm start
```

---

## 🧪 Test the Gmail Connection

Once your server is running with the new credentials:

### Option A: Test via Browser

1. **Start the Connection:**
   - Open your browser
   - Navigate to: `http://localhost:3000/api/v1/email/connect`
   - You'll get a JSON response with an `authUrl`

2. **Authorize the App:**
   - Copy the `authUrl` from the JSON
   - Paste it in a new browser tab
   - Sign in with your Gmail account
   - You'll see a warning "Google hasn't verified this app" - click "Continue"
   - Click "Allow" to grant read-only Gmail access
   - You'll be redirected back to localhost

3. **Verify Connection:**
   - You should see: `{"success": true, "message": "Email connected successfully"}`
   - Your Gmail is now connected!

### Option B: Test via API Call

```bash
# 1. Get auth URL (replace YOUR_USER_ID with actual user ID from registration)
curl http://localhost:3000/api/v1/email/connect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 2. Follow the authUrl in browser

# 3. Trigger email scan
curl -X POST http://localhost:3000/api/v1/email/scan \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Check results
curl http://localhost:3000/api/v1/email/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🎯 What Will Happen

When you trigger an email scan:

1. **Scans your Gmail** (last 12 months, up to 500 emails)
2. **Finds order confirmations** from stores/brands
3. **Extracts brand names** from:
   - Email sender (orders@zara.com → Zara)
   - Subject line ("Your H&M order" → H&M)
   - Email body ("Thank you for shopping at Nike" → Nike)
4. **Matches to database** using 59 brand aliases
5. **Auto-follows brands** you already shop at
6. **Shows in newsfeed** immediately

---

## 🔐 Privacy & Security

- ✅ **Read-only access** - Can't send emails or modify anything
- ✅ **No email storage** - Only extracts brand names, deletes everything else
- ✅ **Encrypted tokens** - OAuth tokens stored with AES-256-GCM
- ✅ **You control it** - Disconnect anytime via UI or API
- ✅ **Audit trail** - All scans logged in email_scan_results table

---

## 📊 Expected Results

Based on typical Gmail shopping patterns, you might see:

- **15-30 brands discovered** from order confirmations
- **Auto-followed brands** like: Zara, H&M, Nike, Amazon Fashion, Target, etc.
- **Immediate newsfeed content** from brands you actually shop at
- **Personalized experience** without manual brand selection

---

## ❓ Troubleshooting

### "Google hasn't verified this app"
- **Normal for development!** Click "Advanced" → "Go to Muse Shopping (unsafe)"
- This warning only appears because the app isn't published to Google's App Store
- Your data is safe - you control the code

### "Redirect URI mismatch"
- Make sure you added: `http://localhost:3000/api/v1/email/callback`
- Check for typos (http not https, localhost not 127.0.0.1)
- Restart server after changing .env

### "Invalid credentials"
- Double-check Client ID and Secret in .env
- Make sure there are no spaces or quotes around the values
- Restart server after changes

### "No brands found"
- Check if you have order confirmation emails in Gmail
- Look for emails from last 12 months
- Search Gmail for: "order confirmation" or "receipt"
- If none, that's okay - you can still follow brands manually!

---

## 🎉 You're Almost There!

**What's ready:**
- ✅ Code is complete
- ✅ Database is set up
- ✅ Encryption is configured
- ✅ Dependencies installed

**What you need:**
- 📋 Google Cloud credentials (15 min setup above)
- 📋 Update .env with credentials
- 📋 Restart server
- 📋 Test the connection

**After that, you can scan your Gmail and auto-follow brands you actually shop at!**

---

## 🔗 Quick Links

- Google Cloud Console: https://console.cloud.google.com
- Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
- OAuth Consent: https://console.cloud.google.com/apis/credentials/consent
- Credentials: https://console.cloud.google.com/apis/credentials

---

**Ready to get started? Follow Step 1 above! 🚀**
