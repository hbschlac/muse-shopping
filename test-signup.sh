#!/bin/bash

# Test Signup Flow Demo
echo "================================================"
echo "MUSE SHOPPING - SIGNUP FLOW TEST"
echo "================================================"
echo ""

# Generate random email to avoid conflicts
RANDOM_ID=$(date +%s)
TEST_EMAIL="demo${RANDOM_ID}@example.com"
TEST_PASSWORD="DemoPass123"
TEST_NAME="Demo User"

echo "📝 Testing signup with:"
echo "   Email: $TEST_EMAIL"
echo "   Password: $TEST_PASSWORD"
echo "   Name: $TEST_NAME"
echo ""

# Test the registration endpoint
echo "🚀 Sending registration request..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"$TEST_NAME\"}" \
  -w "\n%{http_code}")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
JSON_RESPONSE=$(echo "$RESPONSE" | head -n-1)

echo ""
echo "📊 Response:"
echo "   HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ SUCCESS! Account created successfully!"
  echo ""
  echo "Response data:"
  echo "$JSON_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$JSON_RESPONSE"
  echo ""
  echo "================================================"
  echo "✨ Signup is working perfectly!"
  echo "================================================"
else
  echo "❌ FAILED! Registration failed"
  echo ""
  echo "Response:"
  echo "$JSON_RESPONSE"
  echo ""
  echo "================================================"
  echo "⚠️  Signup encountered an error"
  echo "================================================"
fi

echo ""
echo "You can now test the frontend at: http://localhost:3001/welcome/email"
