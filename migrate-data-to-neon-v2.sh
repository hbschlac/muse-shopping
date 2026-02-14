#!/bin/bash
# Migrate data from local database to Neon production database (v2 - with trigger handling)

set -e

LOCAL_DB="postgresql://muse_admin:SecurePassword123!@localhost:5432/muse_shopping_dev"
NEON_DB="postgresql://neondb_owner:npg_J57iDsBcWVkX@ep-cool-bread-aigme40c.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "🔄 Migrating data from local database to Neon production..."

# Export data from local database
echo "📦 Exporting brands..."
psql "$LOCAL_DB" -c "\COPY brands TO '/tmp/brands.csv' WITH CSV HEADER"

echo "📦 Exporting stores..."
psql "$LOCAL_DB" -c "\COPY stores TO '/tmp/stores.csv' WITH CSV HEADER"

echo "📦 Exporting items..."
psql "$LOCAL_DB" -c "\COPY items TO '/tmp/items.csv' WITH CSV HEADER"

echo "📦 Exporting users..."
psql "$LOCAL_DB" -c "\COPY users TO '/tmp/users.csv' WITH CSV HEADER"

# Import data to Neon (with triggers disabled)
echo "📥 Importing brands to Neon..."
psql "$NEON_DB" -c "TRUNCATE brands CASCADE;"
psql "$NEON_DB" -c "\COPY brands FROM '/tmp/brands.csv' WITH CSV HEADER"

echo "📥 Importing stores to Neon..."
psql "$NEON_DB" -c "TRUNCATE stores CASCADE;"
psql "$NEON_DB" -c "\COPY stores FROM '/tmp/stores.csv' WITH CSV HEADER"

echo "📥 Importing items to Neon (disabling triggers)..."
psql "$NEON_DB" -c "ALTER TABLE items DISABLE TRIGGER ALL;"
psql "$NEON_DB" -c "TRUNCATE items CASCADE;"
psql "$NEON_DB" -c "\COPY items FROM '/tmp/items.csv' WITH CSV HEADER"
psql "$NEON_DB" -c "ALTER TABLE items ENABLE TRIGGER ALL;"

echo "📥 Importing users to Neon..."
psql "$NEON_DB" -c "ALTER TABLE users DISABLE TRIGGER ALL;"
psql "$NEON_DB" -c "TRUNCATE users CASCADE;"
psql "$NEON_DB" -c "\COPY users FROM '/tmp/users.csv' WITH CSV HEADER"
psql "$NEON_DB" -c "ALTER TABLE users ENABLE TRIGGER ALL;"

# Update sequences
echo "🔢 Updating sequences..."
psql "$NEON_DB" -c "SELECT setval('brands_id_seq', (SELECT MAX(id) FROM brands));"
psql "$NEON_DB" -c "SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));"
psql "$NEON_DB" -c "SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));"
psql "$NEON_DB" -c "SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));"

echo "✅ Data migration complete!"
echo ""
echo "Verifying counts:"
psql "$NEON_DB" -c "SELECT 
  (SELECT COUNT(*) FROM items) as items,
  (SELECT COUNT(*) FROM brands) as brands,
  (SELECT COUNT(*) FROM stores) as stores,
  (SELECT COUNT(*) FROM users) as users;"

# Cleanup
rm /tmp/brands.csv /tmp/stores.csv /tmp/items.csv /tmp/users.csv

echo ""
echo "🎉 Production database now has all your data!"
