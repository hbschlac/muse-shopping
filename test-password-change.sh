#!/bin/bash

echo "🧪 Testing Admin Password Change Functionality"
echo ""

# Step 1: Login as admin
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hannah@muse.shopping", "password": "MuseAdmin2024!"}')

echo "$LOGIN_RESPONSE" | jq . > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Login failed - invalid JSON response"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
FULL_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.full_name')
EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.email')

echo "✅ Login successful"
echo "   User: $FULL_NAME"
echo "   Email: $EMAIL"
echo ""

# Step 2: Update password
echo "Step 2: Updating password..."
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/v1/users/me/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"full_name\": \"$FULL_NAME\", \"password\": \"NewTestPassword123!\"}")

echo "Response:"
echo "$UPDATE_RESPONSE" | jq .

UPDATE_SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success')
if [ "$UPDATE_SUCCESS" != "true" ]; then
  echo "❌ Password update failed"
  exit 1
fi

echo "✅ Password updated successfully!"
echo ""

# Step 3: Test login with new password
echo "Step 3: Testing login with new password..."
NEW_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hannah@muse.shopping", "password": "NewTestPassword123!"}')

NEW_SUCCESS=$(echo "$NEW_LOGIN_RESPONSE" | jq -r '.success')
if [ "$NEW_SUCCESS" != "true" ]; then
  echo "❌ Login with new password failed"
  echo "$NEW_LOGIN_RESPONSE" | jq .
  exit 1
fi

NEW_TOKEN=$(echo "$NEW_LOGIN_RESPONSE" | jq -r '.data.token')
echo "✅ Login with new password successful!"
echo ""

# Step 4: Reset password back to original
echo "Step 4: Resetting password to original..."
RESET_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/v1/users/me/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -d "{\"full_name\": \"$FULL_NAME\", \"password\": \"MuseAdmin2024!\"}")

RESET_SUCCESS=$(echo "$RESET_RESPONSE" | jq -r '.success')
if [ "$RESET_SUCCESS" != "true" ]; then
  echo "❌ Password reset failed"
  exit 1
fi

echo "✅ Password reset to original"
echo ""

# Step 5: Verify original password works
echo "Step 5: Verifying original password..."
FINAL_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hannah@muse.shopping", "password": "MuseAdmin2024!"}')

FINAL_SUCCESS=$(echo "$FINAL_LOGIN_RESPONSE" | jq -r '.success')
if [ "$FINAL_SUCCESS" != "true" ]; then
  echo "❌ Final login verification failed"
  exit 1
fi

echo "✅ Original password verified"
echo ""

echo "============================================================"
echo "🎉 ALL TESTS PASSED!"
echo "============================================================"
echo ""
echo "✅ Password change functionality is working correctly!"
echo "✅ The 'Save Changes' button in the admin UI will work."
echo ""
echo "Next steps:"
echo "1. Hard refresh the admin page (Cmd+Shift+R or Ctrl+Shift+R)"
echo "2. Open browser console (F12)"
echo "3. Click Account → Manage My Account"
echo "4. Enter a new password and click 'Save Changes'"
echo "5. You should see success message and modal will close"
