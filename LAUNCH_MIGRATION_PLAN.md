# Launch Migration Plan

## Goal
Run database migrations safely in staging and production with explicit go/no-go checks.

## Current Risks
- Duplicate numeric migration prefixes currently exist:
  - `013_create_cart_system.sql`, `013_create_product_catalog.sql`
  - `024_create_chat_system.sql`, `024_create_sponsored_content.sql`
  - `025_create_checkout_and_orders.sql`, `025_expand_style_profile_dimensions.sql`
  - `026_add_chat_admin_notes.sql`, `026_create_oauth_store_connections.sql`, `026_expand_to_100_dimensions.sql`
  - `062_create_collections.sql`, `062_create_promo_codes.sql`
- These still run in filename order and are tracked by full filename in `schema_migrations`, but increase operational error risk.

## Pre-Flight (Required)
1. Ensure env is valid:
```bash
npm run validate:env:strict
```
2. Check migration filename integrity:
```bash
npm run migrate:check
```
3. Confirm backup/snapshot exists for target DB.

## Staging Rollout
1. Run migrations:
```bash
npm run migrate
```
2. Verify migration ledger:
```sql
SELECT filename, executed_at
FROM schema_migrations
ORDER BY executed_at DESC
LIMIT 20;
```
3. Smoke test critical tables/features:
- auth + refresh tokens
- cart + checkout
- waitlist
- admin email
- product catalog realtime tables

## Production Rollout
1. Freeze deploys during migration window.
2. Re-run pre-flight checks (`validate:env:strict`, `migrate:check`).
3. Run migrations once:
```bash
npm run migrate
```
4. Verify `schema_migrations` and run health checks:
- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `GET /api/v1/health/detailed`

## Rollback Policy
- Schema changes are mostly forward-only; prefer restore-from-snapshot over manual down migrations.
- If migration fails mid-run:
  - script transaction will rollback current file
  - investigate failing migration SQL
  - patch and rerun `npm run migrate` (idempotent by filename)

## Follow-Up Cleanup (Post-Launch)
1. Rename duplicate-prefix migration files to unique ascending prefixes.
2. Keep `schema_migrations.filename` values immutable after production run.
3. Add `npm run migrate:check` to CI release gate.

