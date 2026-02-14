#!/bin/bash

echo "=========================================="
echo "100D System - Production Migration Script"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$PROD_DATABASE_URL" ]; then
  echo "⚠️  PROD_DATABASE_URL environment variable not set"
  echo ""
  echo "To set it:"
  echo "1. Go to: https://vercel.com/hannah-schlacters-projects/muse-shopping/settings/environment-variables"
  echo "2. Copy the DATABASE_URL value"
  echo "3. Run: export PROD_DATABASE_URL='your_database_url_here'"
  echo "4. Run this script again"
  echo ""
  exit 1
fi

echo "✅ Database URL found"
echo ""

# Confirm before proceeding
echo "This will run migrations on your PRODUCTION database."
echo "This will add 100 dimension columns to the style_profiles table."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Migration cancelled."
  exit 0
fi

echo ""
echo "=========================================="
echo "Running Migration 025 (4D → 16D)"
echo "=========================================="
echo ""

psql "$PROD_DATABASE_URL" -f migrations/025_expand_style_profile_dimensions.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration 025 completed successfully"
else
  echo ""
  echo "❌ Migration 025 failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "Running Migration 026 (16D → 100D)"
echo "=========================================="
echo ""

psql "$PROD_DATABASE_URL" -f migrations/026_expand_to_100_dimensions.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration 026 completed successfully"
else
  echo ""
  echo "❌ Migration 026 failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "Verifying Installation"
echo "=========================================="
echo ""

# Check column count
COLUMN_COUNT=$(psql "$PROD_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name LIKE '%_layers';")

echo "Dimension columns found: $COLUMN_COUNT"

if [ "$COLUMN_COUNT" -eq 100 ]; then
  echo "✅ All 100 dimension columns verified!"
else
  echo "⚠️  Expected 100 columns, found $COLUMN_COUNT"
fi

echo ""
echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo ""
echo "🎉 100D System is now FULLY OPERATIONAL in production!"
echo ""
echo "Production URL: https://www.muse.shopping"
echo ""
echo "Test endpoints:"
echo "  GET  https://www.muse.shopping/api/v1/newsfeed?userId=1"
echo "  POST https://www.muse.shopping/api/v1/chat/message"
echo "  GET  https://www.muse.shopping/api/v1/users/1/profile"
echo ""
echo "Next steps:"
echo "  1. Test the API endpoints above"
echo "  2. Monitor user profiles populating"
echo "  3. Track recommendation CTR improvement"
echo "  4. Celebrate! 🎊"
echo ""
