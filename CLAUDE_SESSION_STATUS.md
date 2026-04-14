# Muse Shopping — Claude Session Status
**Last updated:** 2026-03-25
**Commit:** `4318cc4` — Fix broken CTAs, deploy Next.js frontend, clean up prod for shareable launch
**Live site:** https://www.muse.shopping

---

## What Was Broken (Now Fixed)

### 1. Next.js Frontend Was Never Deployed
- **Root cause:** `vercel.json` only had the Express API builder — the Next.js app was never built or served
- **Fix:** Updated `vercel.json` with 2 builders + 3 routes:
  - `/` → Express (`api/index.js`) serves `public/index.html`
  - `/api/v1/*` → Express
  - `/*` → Next.js (`frontend/`)
- **DO NOT revert vercel.json** — the previous version broke all app routes

### 2. All 3 Landing Page Buttons Were Broken
- Were pointing to `/demo.html` (non-existent)
- Fixed in `public/index.html`:
  - "Sign In" → `/auth/login`
  - "Get Started" → `/welcome`
  - "Start Shopping" → `/home`

### 3. API Calls Failed in Production (11 files)
- All had hardcoded `http://localhost:3000/api/v1` fallbacks
- Fixed to use relative `/api/v1` path
- Affected files: `bloomingdales`, `nordstrom`, `scoop`, `ruelala`, `feedback`, `oauth/callback`, `welcome/email`, `profile/settings/password`, `profile/settings/delete-account`, `onboarding/start`, `lib/api/client.ts`

### 4. Google OAuth Credentials Were Committed to Git
- Old client secret `GOCSPX-swT6z...` was in `OAUTH_AUTHENTICATION_SUMMARY.md` (commit `e60ca54`)
- GitHub secret scanning blocked the push
- **Fix:** Rewrote git history to redact secrets, force-pushed clean history
- **New credentials rotated and deployed** — old client deleted from Google Cloud Console
- Current client ID: `625483598545-o476236e7h1p1es19l092v5ufu352s4t.apps.googleusercontent.com`

### 5. Jest Pre-commit Hook Was Hanging Indefinitely
- **Root cause:** Database connection pool staying open after tests — Jest never exited
- **Fix:** Added `--forceExit` to `package.json` test script
- Current: `"test": "jest --testEnvironment=node --passWithNoTests --runInBand --forceExit"`
- **DO NOT remove `--forceExit` or `--runInBand`** — tests will hang or have DB contention

### 6. Frontend Tests Were Failing (3 issues)
- `BottomNav` missing Cart tab → added to `frontend/components/BottomNav.tsx`
- `PageHeader` dropdown missing Settings link → added to `frontend/components/PageHeader.tsx`
- `CartPage` empty state missing `<PageHeader>` → fixed in `frontend/app/cart/page.tsx`

### 7. Playwright E2E Tests Were Being Run by Jest
- `__tests__/e2e/` tests use `@playwright/test` (not installed for Jest)
- Fix: Added `__tests__/e2e/` to `testPathIgnorePatterns` in `frontend/jest.config.js`

### 8. `public/auth.html` Had Old Branding
- Was using Dancing Script font and coral gradient buttons
- Rewritten with SVG wordmark logo and blue gradient buttons

---

## Current Test State
- **Backend:** 11 suites, 166 tests — all passing
- **Frontend:** 4 suites, 63 tests — all passing
- Pre-commit hook: runs backend (`--runInBand --forceExit`) + frontend tests
- Pre-push hook: runs `test:ci` (with coverage) + frontend — all passing

---

## Deployment

- **Platform:** Vercel (hobby plan)
- **Team:** `hannah-schlacters-projects`
- **Project ID:** `prj_svLAzeaQncoGCr1UyXfz2lX4TTAV`
- **Production URL:** https://www.muse.shopping
- **Auto-deploy:** NOT configured — must run `vercel --prod` manually from project root
- **Last deploy:** 2026-03-25, commit `4318cc4`

---

## Environment Variables

All credentials live in `.env` (backend) and `frontend/.env.local` (frontend).
Vercel production env vars are synced and up to date as of 2026-03-25.

**DO NOT commit `.env` or `frontend/.env.local`** — they are in `.gitignore`.
`OAUTH_AUTHENTICATION_SUMMARY.md` has been redacted — real values are in `.env` only.

---

## Architecture

```
muse-shopping/
├── api/index.js          # Express API — serves public/ static files + /api/v1/* routes
├── public/               # Static files served by Vercel CDN (index.html, auth.html, SVGs)
├── frontend/             # Next.js 16 app (React 19, TypeScript, Tailwind CSS 4)
│   ├── app/              # App router pages
│   ├── components/       # Shared components (BottomNav, PageHeader, etc.)
│   └── lib/api/          # API client — uses relative /api/v1 paths (NOT localhost)
├── src/                  # Express backend source
├── tests/                # Backend Jest tests (integration, uses real PostgreSQL)
└── vercel.json           # 2-builder config: @vercel/next + @vercel/node
```

---

## Known Gotchas — DO NOT Break These

| Thing | Why |
|-------|-----|
| `vercel.json` 2-builder config | Reverts to Express-only deploy if changed back |
| `--forceExit` in test script | Jest hangs forever without it (open DB handles) |
| `--runInBand` in test script | Parallel runs cause DB contention and flaky failures |
| Relative `/api/v1` paths in frontend | `localhost:3000` fallbacks silently fail in production |
| `testPathIgnorePatterns` in `frontend/jest.config.js` | Playwright tests break Jest if included |
| `PageHeader` in CartPage empty state | Header-consistency test fails without it |

---

## What Still Works / Was Not Touched

- PostgreSQL database (Neon) — fully connected, all migrations applied
- All 250+ brand/retailer data and product catalog
- Email auth (register, login, forgot password, reset)
- Apple Sign In
- Waitlist system
- Admin panel
- Cart, Newsfeed, Discover, Inspire pages
