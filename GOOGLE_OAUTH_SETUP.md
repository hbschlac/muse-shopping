# Google OAuth Setup Guide

## Error: "The OAuth client was not found" (Error 401: invalid_client)

This error occurs because the Google Client ID is not configured. Follow these steps to fix it:

## Quick Fix for Development

### Option 1: Use Email Sign-In Instead
For now, you can use the **Email** button on the welcome page, which doesn't require Google OAuth setup.

### Option 2: Set Up Google OAuth (Recommended for Production)

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Muse Shopping" and click "Create"

#### Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

#### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **Muse Shopping**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through all steps

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **Muse Shopping Web Client**
   - Authorized JavaScript origins:
     - `http://localhost:3001`
     - `http://localhost:3000`
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback`
     - `http://localhost:3000/api/v1/auth/google/callback`
   - Click **Create**

5. Copy the **Client ID** and **Client Secret**

#### Step 4: Configure Environment Variables

##### Backend (.env)
Add to `/Users/hannahschlacter/Desktop/muse-shopping/.env`:

```bash
# Google OAuth (for both Gmail integration and Sign in with Google)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
```

##### Frontend (.env.local)
Add to `/Users/hannahschlacter/Desktop/muse-shopping/frontend/.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

**Important:** Use the SAME Client ID for both backend and frontend!

#### Step 5: Restart Servers

```bash
# Stop all running servers (Ctrl+C)

# Restart backend
npm start

# Restart frontend (in another terminal)
cd frontend
npm run dev
```

#### Step 6: Test Google Sign-In

1. Go to http://localhost:3001/welcome
2. Click "Continue with Google"
3. You should see the Google sign-in page
4. Select your Google account
5. You'll be redirected back to the app and signed in

## Apple Sign-In Setup

Apple Sign-In requires:
1. Apple Developer Account ($99/year)
2. App ID configured in Apple Developer Portal
3. Service ID for web authentication
4. Private key for authentication

Add to `.env`:
```bash
APPLE_CLIENT_ID=com.muse.shopping
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXX.p8
```

Add to `frontend/.env.local`:
```bash
NEXT_PUBLIC_APPLE_CLIENT_ID=com.muse.shopping
```

## For Production Deployment

When deploying to production (e.g., Vercel):

1. Update Authorized Redirect URIs in Google Cloud Console:
   - Add your production URL: `https://yourdomain.com/auth/google/callback`

2. Set environment variables in Vercel:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_ID` (backend)
   - `GOOGLE_CLIENT_SECRET` (backend)

3. Update `CORS_ORIGIN` in backend `.env` to include production URL

## Troubleshooting

### "Error 401: invalid_client"
- **Cause:** Google Client ID not set or incorrect
- **Fix:** Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in `frontend/.env.local`

### "Redirect URI mismatch"
- **Cause:** The callback URL doesn't match what's configured in Google Cloud Console
- **Fix:** Add the exact redirect URI to Authorized redirect URIs in Google Cloud Console

### "Access blocked: This app's request is invalid"
- **Cause:** OAuth consent screen not configured
- **Fix:** Complete the OAuth consent screen configuration in Google Cloud Console

## Development Mode (Bypass OAuth)

If you just want to test the app without setting up OAuth:

1. Use **Email** sign-in on the welcome page
2. Or click **Browse as guest** to explore without authentication
