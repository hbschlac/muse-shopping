# Test Environment Checklist (Desktop Source of Truth)

Use this checklist before running backend tests in `/Users/hannahschlacter/Desktop/muse-shopping`.

## 1) Local test networking

- Supertest now binds to `127.0.0.1` in Jest via `tests/jest.setup.js`.
- If your environment still blocks local bind, run tests in a shell/runtime that allows loopback listen sockets.

## 2) Database connectivity

- Ensure Postgres is running and reachable from app env variables.
- Required env vars in `.env` or `.env.local`:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
- Quick check:
  - `node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool(); p.query('select 1').then(()=>{console.log('db ok'); return p.end();}).catch(e=>{console.error(e.message); process.exit(1);});"`

## 3) Run migrations for test-covered tables

- Run:
  - `npm run migrate`
- Confirm these tables/features exist (used by failing suites):
  - `users`, `stores`, `brands`, `product_catalog`, `product_match_groups`
  - `product_user_interactions`, `product_realtime_cache`, `product_price_history`
  - `cart_items`, `password_reset_tokens`

## 4) Known failure signatures

- `listen EPERM: operation not permitted 0.0.0.0`:
  - Environment bind restriction (should be mitigated by localhost shim).
- `AggregateError` from `pg-pool` during first `pool.query(...)`:
  - Database unreachable/misconfigured for current test runtime.

## 5) Suggested verification order

- `CI=1 npx jest tests/appleAuth.test.js --runInBand`
- `CI=1 npx jest tests/cart.test.js tests/forgot-password.test.js --runInBand`
- `CI=1 npx jest tests/productMatching.test.js tests/services/productCatalog.test.js --runInBand`
