# Debug Google OAuth Flow

## Step 1: Check What URL Google Returns

When you click "Sign in with Google" and authorize the app, Google redirects you back to:
```
https://app.muse.shopping/auth/google/callback?code=XXXXX&state=XXXXX
```

**Please try signing in and then copy the FULL URL from your browser address bar when you see the error.**

The URL should look like:
```
https://app.muse.shopping/auth/google/callback?code=4/0AanRRrt...&state=web_auth_...
```

## Step 2: Check Browser Console

While on the error page:
1. Press F12 to open Developer Tools
2. Click the "Console" tab
3. Look for any red error messages
4. Copy any error messages you see

## Step 3: Check Network Tab

1. In Developer Tools, click "Network" tab
2. Try signing in with Google again
3. After the error, look for a request to `/auth/google/callback`
4. Click on it
5. Look at the "Response" tab - what does it say?

---

Please share:
1. The full callback URL (with the code parameter)
2. Any console errors
3. The response from /auth/google/callback
