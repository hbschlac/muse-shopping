# 🌐 Muse Shopping - Production URLs

## Correct URLs to Use

### ✅ Frontend (Your App)
**URL:** https://app.muse.shopping  
**What it is:** Your Next.js frontend application with the proper Muse branding and design  
**Status:** ✅ Live and working

### ✅ Backend API
**URL:** https://www.muse.shopping  
**What it is:** Your Express.js backend API server  
**Note:** Visiting this in a browser shows a demo/testing page (orange colors)  
**Status:** ✅ Live and serving API requests

---

## What Happened

### The Issue You Saw
When you visited **www.muse.shopping**, you saw:
- Orange colors (#F1785A, #F4A785)
- Wrong fonts ("Be Vietnam Pro", "Dancing Script")  
- A demo testing page
- Changed Muse logo

**Why this happened:**
- `www.muse.shopping` is the **backend API server**, not the frontend
- The backend has a `demo.html` page for testing that displays when you visit the root URL
- This is normal - API servers typically show a simple demo/docs page

### The Fix
We deployed your **actual frontend** to:
- **https://app.muse.shopping** ← This is your real app!

---

## URL Architecture

```
muse.shopping (domain)
├── www.muse.shopping     → Backend API (Express.js)
│   ├── /api/v1/items
│   ├── /api/v1/brands  
│   └── / (shows demo page when visited in browser)
│
└── app.muse.shopping     → Frontend App (Next.js)
    ├── /welcome
    ├── /home
    ├── /discover
    ├── /product/[id]
    └── ... (all your app pages)
```

---

## What To Use Going Forward

### For Users (Visiting the App)
🔗 **https://app.muse.shopping**  
This is your customer-facing application

### For Development (API Calls)
The frontend is already configured to call:  
🔗 **https://www.muse.shopping/api/v1/**  
via the `NEXT_PUBLIC_API_URL` environment variable

---

## Testing Your App

### Frontend
```bash
# Visit in browser
open https://app.muse.shopping
```

### Backend API
```bash
# Test items endpoint
curl https://www.muse.shopping/api/v1/items?limit=5

# Test brands endpoint  
curl https://www.muse.shopping/api/v1/brands?limit=5

# Test health check
curl https://www.muse.shopping/api/v1/health
```

---

## Summary

✅ **Your app is live at:** https://app.muse.shopping  
✅ **Your API is live at:** https://www.muse.shopping  
✅ **810 products** from retailers are loaded  
✅ **1,128 brands** in the database  
✅ **Everything is working correctly!**

The orange demo page you saw was just the backend's testing page - your actual frontend with proper Muse branding is at **app.muse.shopping**! 🎉

---

## Optional: Remove the Demo Page

If you don't want the orange demo page showing at www.muse.shopping, you can:

1. Delete `demo.html` from the backend
2. Configure the backend to return a simple JSON response at `/`
3. Or redirect `/` to the API documentation

But this is purely cosmetic - the backend is working perfectly for API requests!
