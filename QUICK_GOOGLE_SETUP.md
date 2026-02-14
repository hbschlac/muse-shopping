# Quick Google OAuth Setup

You're seeing the error because Google OAuth isn't configured yet. Here's how to fix it in 5 minutes:

## Step 1: Get Google Credentials (3 minutes)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. If prompted, configure OAuth consent screen:
   - App name: **Muse Shopping**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through all steps

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **Muse Shopping Web**
   - Authorized JavaScript origins:
     - `http://localhost:3001`
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback`
     - `http://localhost:3000/api/v1/auth/google/callback`
   - Click **CREATE**

5. Copy the **Client ID** and **Client Secret**

## Step 2: Add to Environment (1 minute)

Run this command and paste your credentials when prompted:

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
./setup-google-oauth.sh
```

Or manually add to `.env`:

```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
```

And add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

## Step 3: Restart Servers (1 minute)

```bash
# Kill current servers (Ctrl+C in both terminals)

# Restart backend
npm start

# Restart frontend (in new terminal)
cd frontend
npm run dev
```

## Step 4: Test

1. Go to http://localhost:3001/welcome
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected to /home

---

**That's it!** Google OAuth will now work. 🎉

Need help? The error you saw is normal - it just means the Google Client ID isn't configured yet.
