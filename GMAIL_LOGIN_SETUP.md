# "Sign in with Google" Setup Complete! 🎉

## ✅ What's Been Built

### 1. Database Schema
- Added `google_id` column to users table (for linking Google accounts)
- Added `first_name` and `last_name` columns
- Added `last_login_at` timestamp
- Made `password_hash` nullable (Google users don't need passwords)

### 2. Services
**File:** `src/services/googleAuthService.js`
- `getSignInUrl()` - Generates Google OAuth URL
- `getUserFromCode()` - Exchanges auth code for user info
- `findOrCreateUser()` - Creates new user or links existing account
- `handleGoogleAuth()` - Complete OAuth flow

### 3. Controllers
**File:** `src/controllers/googleAuthController.js`
- `initiateGoogleAuth()` - Returns Google auth URL to frontend
- `handleGoogleCallback()` - Processes callback, creates/updates user, returns JWT tokens

### 4. Routes
**File:** `src/routes/googleAuthRoutes.js`
- `GET /api/v1/auth/google` - Get auth URL
- `GET /api/v1/auth/google/callback` - Handle Google callback

### 5. Integration
- Routes registered in `src/routes/index.js`
- Auto-follows default brands for new Google users
- Links existing email/password accounts when same email is used

---

## 🔧 Setup Required

### Google Cloud Console Setup

**⚠️ IMPORTANT: Add this redirect URI to Google Cloud Console**

1. Go to https://console.cloud.google.com/apis/credentials?project=muse-shop-app
2. Click on your OAuth 2.0 Client ID (625483598545-davdccmv5n5676296ltmtv0gjahidfkm)
3. Under "Authorized redirect URIs", **ADD**:
   ```
   http://localhost:3001/auth/google/callback
   ```
4. Click **Save**

**Current redirect URIs:**
- ✅ `http://localhost:3000/api/v1/email/callback` (for Gmail scanning)
- 🆕 `http://localhost:3001/auth/google/callback` (for user login)

---

## 🎯 How It Works

### User Flow

1. **User clicks "Sign in with Google" on frontend**
   ```javascript
   // Frontend makes request
   fetch('http://localhost:3000/api/v1/auth/google')
     .then(res => res.json())
     .then(data => {
       window.location.href = data.data.authUrl; // Redirect to Google
     });
   ```

2. **User authorizes on Google**
   - Selects Google account
   - Grants permission to Muse

3. **Google redirects to callback**
   - URL: `http://localhost:3001/auth/google/callback?code=...`
   - Callback page runs JavaScript to:
     - Store JWT tokens in localStorage
     - Store user info in localStorage
     - Redirect to `/feed` (existing user) or `/onboarding` (new user)

4. **User is logged in!**
   - JWT token stored for API calls
   - User profile available in localStorage

### Backend Flow

```
Client Request → Google Auth URL
                       ↓
User Authorizes → Google Callback
                       ↓
Exchange Code → Get User Info
                       ↓
Find/Create User → Generate JWT
                       ↓
Return Success Page → Auto-redirect
```

---

## 📝 API Endpoints

### 1. Get Google Auth URL

**Request:**
```bash
curl http://localhost:3000/api/v1/auth/google
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "web_auth_1738123456789"
  },
  "message": "Visit the authorization URL to sign in with Google"
}
```

### 2. Google Callback (Handled Automatically)

**Request:** (Made by Google)
```
GET http://localhost:3001/auth/google/callback?code=4/0AXXXyyy&state=web_auth_123
```

**Response:** HTML page with:
- Success message
- Profile picture (if available)
- Welcome message
- Auto-stores tokens in localStorage
- Auto-redirects to app

---

## 🔐 Security Features

### 1. User Account Linking
- If user signs up with email/password first, then uses Google Sign-In with same email → accounts are linked
- `google_id` is added to existing user record
- User can now log in with either method

### 2. New User Creation
- Google users created with `google_id`
- No password required (`password_hash` is NULL)
- Email pre-verified (from Google)
- Auto-follows 10 default brands

### 3. Token Management
- JWT access token (1 hour expiry)
- Refresh token (7 days expiry)
- Stored in localStorage (frontend)
- Used for all API requests

---

## 🎨 Frontend Integration

### React/Next.js Example

```javascript
// components/GoogleSignInButton.jsx
import { useState } from 'react';

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/google');
      const data = await response.json();

      if (data.success) {
        // Redirect to Google
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      console.error('Error initiating Google sign-in:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="google-signin-btn"
    >
      {loading ? (
        'Redirecting...'
      ) : (
        <>
          <img src="/google-icon.svg" alt="Google" />
          Sign in with Google
        </>
      )}
    </button>
  );
}
```

### Callback Page (`pages/auth/google/callback.tsx`)

This page is actually not needed! The backend callback returns an HTML page that:
1. Stores tokens in localStorage
2. Redirects to `/feed` or `/onboarding`

But if you want a React page for better UX:

```javascript
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    // Check if tokens are in localStorage
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      const userData = JSON.parse(user);

      // Redirect based on whether new user
      if (userData.isNewUser) {
        router.push('/onboarding');
      } else {
        router.push('/feed');
      }
    }
  }, [router]);

  return (
    <div className="loading-screen">
      <h1>Signing you in...</h1>
    </div>
  );
}
```

---

## 🧪 Testing

### Manual Test Flow

1. **Start the backend:**
   ```bash
   cd /Users/hannahschlacter/Desktop/muse-shopping
   npm start
   ```

2. **Test the auth URL endpoint:**
   ```bash
   curl http://localhost:3000/api/v1/auth/google
   ```

3. **Copy the `authUrl` from response and open in browser**

4. **Sign in with Google** (use hbschlac@gmail.com since it's a test user)

5. **Should redirect to callback page and show:**
   - "Welcome, Hannah!"
   - Profile picture
   - "Redirecting to Muse..."
   - Auto-redirect after 2 seconds

6. **Check browser localStorage:**
   - `token` - JWT access token
   - `refreshToken` - Refresh token
   - `user` - User object with id, email, name, isNewUser

7. **Check database:**
   ```sql
   SELECT id, email, google_id, first_name, last_name, is_active
   FROM users
   WHERE email = 'hbschlac@gmail.com';
   ```

---

## 🎁 Bonus Features

### Auto-Follow Default Brands
When a new user signs up via Google, they automatically follow 10 default brands:
- Zara
- H&M
- Nike
- Lululemon
- Nordstrom
- ASOS
- Madewell
- Everlane
- Uniqlo
- Target

### Profile Picture Support
- Google profile pictures are available in callback
- Stored in `googleData.profilePicture`
- Can be saved to `profile_image_url` in users table if needed

### Existing Account Linking
- User signs up with email: hannah@example.com + password
- Later, user clicks "Sign in with Google" with hannah@example.com
- System links accounts:
  - Adds `google_id` to existing user
  - User can now log in with either method
  - Password still works if they want to use it

---

## 🚀 Next Steps

1. ✅ **Add redirect URI to Google Cloud Console** (see Setup Required section)
2. Test the flow manually
3. Build frontend login/register UI with Google button
4. Add "Sign in with Google" to both login and register pages
5. Optional: Add more OAuth providers (Facebook, Apple, etc.)

---

## 📊 User Data Stored

When a user signs in with Google, we store:

```javascript
{
  id: 123,
  email: "hannah@gmail.com",
  first_name: "Hannah",
  last_name: "Schlacter",
  google_id: "1234567890",
  is_verified: true, // Email verified by Google
  is_active: true,
  created_at: "2026-02-02T...",
  last_login_at: "2026-02-02T..."
}
```

We DO NOT store:
- Google access tokens (not needed for login, only for Gmail scanning)
- Google passwords (Google handles auth)
- Google profile pictures (available but not persisted yet)

---

## 🎯 Success!

You now have a complete "Sign in with Google" implementation that:
- ✅ Creates new users from Google accounts
- ✅ Links existing accounts with same email
- ✅ Generates JWT tokens for API access
- ✅ Auto-follows default brands for new users
- ✅ Redirects to appropriate page (/feed vs /onboarding)
- ✅ Works alongside traditional email/password login

**All that's left is adding the redirect URI to Google Cloud Console and building the frontend UI!**
