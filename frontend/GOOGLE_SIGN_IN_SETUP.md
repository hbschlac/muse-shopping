# Google Sign-In Configuration ✅

## Status: Almost Ready!

Google Sign-In is now configured in your production app. You just need to complete one final step in Google Cloud Console.

---

## What Was Done

### ✅ Backend Configuration
- Added `GOOGLE_CLIENT_ID` to Vercel production environment
- Added `GOOGLE_CLIENT_SECRET` to Vercel production environment  
- Added `CORS_ORIGIN=https://app.muse.shopping` to Vercel
- Updated CORS to allow `app.muse.shopping` origin
- Google OAuth routes are live at:
  - `GET /api/v1/auth/google` - Initiate sign-in
  - `POST /api/v1/auth/google/callback` - Complete sign-in

### ✅ Frontend Configuration
- Created callback page at `/auth/google/callback`
- Frontend calls `initiateGoogleAuth()` to start OAuth flow
- Google redirects back to `https://app.muse.shopping/auth/google/callback`
- Callback page sends code to backend to complete auth
- User is redirected to `/home` or `/onboarding` based on status

---

## ⚠️ FINAL STEP REQUIRED

You need to add the OAuth redirect URI in Google Cloud Console:

### How to Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Select your project (the one with your Google Client ID)

3. Navigate to: **APIs & Services** → **Credentials**

4. Click on your **OAuth 2.0 Client ID**

5. Under **Authorized redirect URIs**, add:
   ```
   https://app.muse.shopping/auth/google/callback
   ```

6. Click **Save**

---

## How Google Sign-In Works Now

### Flow:
1. User clicks "Sign in with Google" on your app
2. Frontend calls `/api/v1/auth/google` → gets authorization URL
3. User is redirected to Google's consent screen
4. User authorizes your app
5. Google redirects to: `https://app.muse.shopping/auth/google/callback?code=...`
6. Frontend callback page extracts the code
7. Frontend posts code to `/api/v1/auth/google/callback`
8. Backend exchanges code for user info and tokens
9. Backend creates/updates user in database
10. Backend returns JWT tokens
11. Frontend saves tokens and redirects to `/home` or `/onboarding`

---

## Testing Google Sign-In

Once you've added the redirect URI to Google Cloud Console:

1. Visit: **https://app.muse.shopping/login**
2. Click "Sign in with Google"
3. Select your Google account
4. Grant permissions
5. You should be redirected back and signed in!

---

## Environment Variables Set

### Backend (www.muse.shopping)
- ✅ `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- ✅ `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
- ✅ `CORS_ORIGIN` - https://app.muse.shopping

### Redirect URI
- **Callback URL:** https://app.muse.shopping/auth/google/callback

---

## Troubleshooting

### If you get "redirect_uri_mismatch" error:
- Double-check the redirect URI in Google Cloud Console matches exactly:
  - `https://app.muse.shopping/auth/google/callback`
- Make sure there are no trailing slashes
- It can take a few minutes for changes to propagate

### If sign-in fails:
- Check browser console for errors
- Check Vercel logs: `vercel logs https://www.muse.shopping`
- Verify environment variables are set: `vercel env ls`

### If OAuth consent screen needs configuration:
- In Google Cloud Console, go to **OAuth consent screen**
- Add your email as a test user
- Or publish the app for production use

---

## Summary

✅ **Backend:** Configured and deployed  
✅ **Frontend:** Callback page created and deployed  
✅ **Environment Variables:** All set  
⏳ **Google Cloud Console:** Needs redirect URI added (final step!)

After you add the redirect URI in Google Cloud Console, Google Sign-In will be fully functional! 🎉
