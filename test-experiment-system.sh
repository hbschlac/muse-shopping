#!/bin/bash

# Test Experimentation System
# Tests basic experiment creation, assignment, and tracking

set -e

BASE_URL="http://localhost:3000/api/v1"
ADMIN_TOKEN="test_admin_token"  # Replace with real token

echo "🧪 Testing Experimentation System"
echo "=================================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing server health..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
  echo "   ✅ Server is healthy"
else
  echo "   ❌ Server not responding"
  exit 1
fi
echo ""

# Test 2: Create experiment
echo "2️⃣  Creating test experiment..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/experiments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Module Order Experiment",
    "description": "Test changing module order for users",
    "experimentType": "ab_test",
    "target": "newsfeed",
    "trafficAllocation": 100,
    "primaryMetric": "add_to_cart_rate"
  }' 2>&1)

if echo "$CREATE_RESPONSE" | grep -q "success"; then
  EXP_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id' 2>/dev/null || echo "1")
  echo "   ✅ Experiment created (ID: $EXP_ID)"
else
  echo "   ❌ Failed to create experiment"
  echo "   Response: $CREATE_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Add control variant
echo "3️⃣  Adding control variant..."
CONTROL_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/experiments/$EXP_ID/variants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "control",
    "description": "Original module order",
    "isControl": true,
    "trafficWeight": 1,
    "config": {
      "moduleOrdering": [1, 2, 3, 4, 5]
    }
  }')

if echo "$CONTROL_RESPONSE" | grep -q "success"; then
  echo "   ✅ Control variant added"
else
  echo "   ❌ Failed to add control variant"
  echo "   Response: $CONTROL_RESPONSE"
fi
echo ""

# Test 4: Add treatment variant
echo "4️⃣  Adding treatment variant..."
TREATMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/experiments/$EXP_ID/variants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "treatment_reversed",
    "description": "Reversed module order",
    "trafficWeight": 1,
    "config": {
      "moduleOrdering": [5, 4, 3, 2, 1]
    }
  }')

if echo "$TREATMENT_RESPONSE" | grep -q "success"; then
  VARIANT_ID=$(echo "$TREATMENT_RESPONSE" | jq -r '.data.id' 2>/dev/null || echo "2")
  echo "   ✅ Treatment variant added (ID: $VARIANT_ID)"
else
  echo "   ❌ Failed to add treatment variant"
fi
echo ""

# Test 5: Start experiment
echo "5️⃣  Starting experiment..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/experiments/$EXP_ID/start" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$START_RESPONSE" | grep -q "success"; then
  echo "   ✅ Experiment started"
else
  echo "   ❌ Failed to start experiment"
  echo "   Response: $START_RESPONSE"
fi
echo ""

# Test 6: Test user assignment
echo "6️⃣  Testing user assignment..."
for i in {1..5}; do
  ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/experiments/assign" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"test_user_$i\",
      \"session_id\": \"test_session_$i\",
      \"context\": {
        \"page_type\": \"feed\",
        \"placement\": \"newsfeed\"
      }
    }")

  VARIANT=$(echo "$ASSIGN_RESPONSE" | jq -r '.variant' 2>/dev/null || echo "unknown")
  echo "   User $i assigned to: $VARIANT"
done
echo ""

# Test 7: Track events
echo "7️⃣  Testing event tracking..."
TRACK_RESPONSE=$(curl -s -X POST "$BASE_URL/experiments/track-add-to-cart" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"test_user_1\",
    \"session_id\": \"test_session_1\",
    \"experiment_id\": $EXP_ID,
    \"variant_id\": $VARIANT_ID,
    \"item_id\": 1,
    \"position\": 3,
    \"value\": 5000
  }")

if echo "$TRACK_RESPONSE" | grep -q "success"; then
  echo "   ✅ Event tracked successfully"
else
  echo "   ⚠️  Event tracking response: $TRACK_RESPONSE"
fi
echo ""

# Test 8: Check experiment performance
echo "8️⃣  Checking experiment performance..."
PERF_RESPONSE=$(curl -s "$BASE_URL/admin/experiments/$EXP_ID/performance" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$PERF_RESPONSE" | grep -q "success"; then
  echo "   ✅ Performance data retrieved"
else
  echo "   ⚠️  Performance response: $PERF_RESPONSE"
fi
echo ""

echo "=================================="
echo "✅ Basic tests completed!"
echo ""
echo "📊 Next steps:"
echo "   1. Check database: SELECT * FROM experiments WHERE id = $EXP_ID;"
echo "   2. View assignments: SELECT * FROM user_experiment_assignments WHERE experiment_id = $EXP_ID;"
echo "   3. View events: SELECT * FROM experiment_events WHERE experiment_id = $EXP_ID;"
echo ""
