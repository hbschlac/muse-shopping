#!/bin/bash
# Waitlist & Referral System - Complete Test Suite

set -e
API_URL="http://localhost:3000/api/v1"

echo "=== TEST 1: User Signup ==="
curl -s -X POST $API_URL/waitlist/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@test.com","first_name":"Alice","favorite_brands":["Nike"]}' | head -5

echo ""
echo "=== TEST 2: Check Status ==="
curl -s "$API_URL/waitlist/status?email=alice@test.com" | head -5

echo ""
echo "=== TEST 3: Database Check ==="
psql postgresql://muse_admin:SecurePassword123!@localhost:5432/muse_shopping_dev -c "SELECT email, my_referral_code, created_at FROM waitlist_signups ORDER BY created_at DESC LIMIT 3;"

echo ""
echo "✓ Tests complete!"
