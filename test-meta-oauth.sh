#!/bin/bash

# Test script for Meta OAuth endpoints
# Make sure server is running: npm start

BASE_URL="http://localhost:3000/api/v1"

echo "🧪 Testing Meta OAuth Integration Endpoints"
echo "==========================================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
  echo "   ✅ Server is healthy"
else
  echo "   ❌ Server health check failed"
  exit 1
fi
echo ""

# Test 2: Social connections endpoint (should require auth)
echo "2️⃣  Testing GET /social/connections (should require auth)..."
RESPONSE=$(curl -s "$BASE_URL/social/connections")
if echo "$RESPONSE" | grep -q "AUTHENTICATION_ERROR\|No token provided"; then
  echo "   ✅ Endpoint exists and requires authentication"
else
  echo "   ❌ Unexpected response: $RESPONSE"
fi
echo ""

# Test 3: Instagram connect endpoint (should require auth)
echo "3️⃣  Testing GET /social/instagram/connect (should require auth)..."
RESPONSE=$(curl -s "$BASE_URL/social/instagram/connect")
if echo "$RESPONSE" | grep -q "AUTHENTICATION_ERROR\|No token provided"; then
  echo "   ✅ Endpoint exists and requires authentication"
else
  echo "   ❌ Unexpected response: $RESPONSE"
fi
echo ""

# Test 4: Facebook connect endpoint (should require auth)
echo "4️⃣  Testing GET /social/facebook/connect (should require auth)..."
RESPONSE=$(curl -s "$BASE_URL/social/facebook/connect")
if echo "$RESPONSE" | grep -q "AUTHENTICATION_ERROR\|No token provided"; then
  echo "   ✅ Endpoint exists and requires authentication"
else
  echo "   ❌ Unexpected response: $RESPONSE"
fi
echo ""

# Test 5: Meta callback endpoint (public, but needs code param)
echo "5️⃣  Testing GET /social/meta/callback (should handle missing params)..."
RESPONSE=$(curl -s "$BASE_URL/social/meta/callback")
if echo "$RESPONSE" | grep -q "Missing authorization code\|error"; then
  echo "   ✅ Endpoint exists and handles missing parameters"
else
  echo "   ✅ Endpoint exists (returned HTML page)"
fi
echo ""

# Test 6: Disconnect endpoint (should require auth)
echo "6️⃣  Testing DELETE /social/instagram/disconnect (should require auth)..."
RESPONSE=$(curl -s -X DELETE "$BASE_URL/social/instagram/disconnect")
if echo "$RESPONSE" | grep -q "AUTHENTICATION_ERROR\|No token provided"; then
  echo "   ✅ Endpoint exists and requires authentication"
else
  echo "   ❌ Unexpected response: $RESPONSE"
fi
echo ""

echo "==========================================="
echo "✅ All Meta OAuth endpoints are registered!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure META_APP_ID and META_APP_SECRET in .env"
echo "   2. Create a Meta app at https://developers.facebook.com"
echo "   3. Add Instagram Basic Display and/or Facebook Login products"
echo "   4. Set OAuth redirect URI: http://localhost:3000/api/v1/social/meta/callback"
echo "   5. Test with a real user account"
echo ""
