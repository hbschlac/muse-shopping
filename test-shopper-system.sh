#!/bin/bash

# Shopper Data System - Automated Test Suite
# Tests privacy consent, activity tracking, and recommendations

set -e  # Exit on error

echo "🧪 Shopper Data System - Automated Test Suite"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000/api"
TEST_USER_EMAIL="test_$(date +%s)@muse.test"
TEST_PASSWORD="TestPassword123!"

# Test results
PASSED=0
FAILED=0

# Helper function to print test results
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Database Tables Exist
echo "Test 1: Verify Database Tables"
echo "--------------------------------"

if psql $DATABASE_URL -c "SELECT 1 FROM shopper_activity LIMIT 1;" > /dev/null 2>&1; then
    pass "shopper_activity table exists"
else
    fail "shopper_activity table missing"
fi

if psql $DATABASE_URL -c "SELECT 1 FROM shopper_engagement_metrics LIMIT 1;" > /dev/null 2>&1; then
    pass "shopper_engagement_metrics table exists"
else
    fail "shopper_engagement_metrics table missing"
fi

if psql $DATABASE_URL -c "SELECT 1 FROM shopper_segments LIMIT 1;" > /dev/null 2>&1; then
    pass "shopper_segments table exists"
else
    fail "shopper_segments table missing"
fi

if psql $DATABASE_URL -c "SELECT 1 FROM privacy_consent_log LIMIT 1;" > /dev/null 2>&1; then
    pass "privacy_consent_log table exists"
else
    fail "privacy_consent_log table missing"
fi

echo ""

# Test 2: Default Segments Created
echo "Test 2: Verify Default Segments"
echo "--------------------------------"

SEGMENT_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM shopper_segments;")
SEGMENT_COUNT=$(echo $SEGMENT_COUNT | xargs)  # Trim whitespace

if [ "$SEGMENT_COUNT" -eq 8 ]; then
    pass "8 default segments created"
else
    fail "Expected 8 segments, found $SEGMENT_COUNT"
fi

echo ""

# Test 3: API Endpoints Available
echo "Test 3: Verify API Endpoints"
echo "-----------------------------"

# Check health endpoint
if curl -s "$API_URL/../health" | grep -q "healthy"; then
    pass "Health endpoint responding"
else
    fail "Health endpoint not responding"
fi

# Test 4: Create Test User and Get Token
echo ""
echo "Test 4: User Authentication"
echo "---------------------------"

# Register test user
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_USER_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"username\": \"testuser_$(date +%s)\"
    }")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    pass "User registration successful"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    info "Auth token obtained"
else
    # Try login if user already exists
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_USER_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }")

    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        pass "User login successful"
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        info "Auth token obtained"
    else
        fail "User authentication failed"
        info "Response: $REGISTER_RESPONSE"
        exit 1
    fi
fi

echo ""

# Test 5: Privacy Consent
echo "Test 5: Privacy Consent Management"
echo "-----------------------------------"

CONSENT_RESPONSE=$(curl -s -X POST "$API_URL/shopper/privacy/consent" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "data_collection": true,
        "personalization": true,
        "marketing": false,
        "analytics": true,
        "third_party_sharing": false
    }')

if echo "$CONSENT_RESPONSE" | grep -q "success"; then
    pass "Privacy consent updated"
else
    fail "Privacy consent update failed"
    info "Response: $CONSENT_RESPONSE"
fi

echo ""

# Test 6: Activity Tracking
echo "Test 6: Activity Tracking"
echo "-------------------------"

# Track page view
PAGE_VIEW_RESPONSE=$(curl -s -X POST "$API_URL/shopper/activity" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "activityType": "page_view",
        "activityCategory": "browsing",
        "pageType": "newsfeed",
        "pageUrl": "/muse",
        "viewportWidth": 1920,
        "viewportHeight": 1080
    }')

if echo "$PAGE_VIEW_RESPONSE" | grep -q "success"; then
    pass "Page view tracked"
else
    fail "Page view tracking failed"
    info "Response: $PAGE_VIEW_RESPONSE"
fi

# Track product view
PRODUCT_VIEW_RESPONSE=$(curl -s -X POST "$API_URL/shopper/activity" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "activityType": "product_view",
        "activityCategory": "browsing",
        "pageType": "product_detail",
        "productId": 1,
        "brandId": 1
    }')

if echo "$PRODUCT_VIEW_RESPONSE" | grep -q "success"; then
    pass "Product view tracked"
else
    fail "Product view tracking failed"
fi

# Track click with position
CLICK_RESPONSE=$(curl -s -X POST "$API_URL/shopper/activity" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "activityType": "click",
        "activityCategory": "engagement",
        "itemId": 2,
        "moduleId": 1,
        "positionInFeed": 3
    }')

if echo "$CLICK_RESPONSE" | grep -q "success"; then
    pass "Click with position tracked"
else
    fail "Click tracking failed"
fi

echo ""

# Test 7: Get Engagement Metrics
echo "Test 7: Engagement Metrics"
echo "--------------------------"

METRICS_RESPONSE=$(curl -s -X GET "$API_URL/shopper/metrics" \
    -H "Authorization: Bearer $TOKEN")

if echo "$METRICS_RESPONSE" | grep -q "success"; then
    pass "Engagement metrics retrieved"

    # Check if metrics include expected fields
    if echo "$METRICS_RESPONSE" | grep -q "total_page_views"; then
        pass "Metrics include page views"
    fi

    if echo "$METRICS_RESPONSE" | grep -q "engagement_score"; then
        pass "Engagement score calculated"
    fi
else
    fail "Failed to retrieve engagement metrics"
fi

echo ""

# Test 8: Shopper Segments
echo "Test 8: Shopper Segmentation"
echo "----------------------------"

SEGMENTS_RESPONSE=$(curl -s -X GET "$API_URL/shopper/segments" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SEGMENTS_RESPONSE" | grep -q "success"; then
    pass "Shopper segments retrieved"
else
    fail "Failed to retrieve segments"
fi

echo ""

# Test 9: Enhanced Recommendations
echo "Test 9: Enhanced Recommendations"
echo "--------------------------------"

RECS_RESPONSE=$(curl -s -X GET "$API_URL/v1/recommendations/personalized?limit=10&context=newsfeed" \
    -H "Authorization: Bearer $TOKEN")

if echo "$RECS_RESPONSE" | grep -q "success"; then
    pass "Personalized recommendations retrieved"

    if echo "$RECS_RESPONSE" | grep -q "metadata"; then
        pass "Recommendation metadata included"
    fi

    if echo "$RECS_RESPONSE" | grep -q "algorithm"; then
        pass "Algorithm information included"
    fi
else
    fail "Failed to get recommendations"
    info "Response: $RECS_RESPONSE"
fi

echo ""

# Test 10: Data Export (GDPR)
echo "Test 10: Data Export (GDPR)"
echo "---------------------------"

EXPORT_RESPONSE=$(curl -s -X GET "$API_URL/shopper/data/export" \
    -H "Authorization: Bearer $TOKEN")

if echo "$EXPORT_RESPONSE" | grep -q "user"; then
    pass "Data export successful"

    if echo "$EXPORT_RESPONSE" | grep -q "activityHistory"; then
        pass "Activity history included in export"
    fi

    if echo "$EXPORT_RESPONSE" | grep -q "engagementMetrics"; then
        pass "Engagement metrics included in export"
    fi
else
    fail "Data export failed"
fi

echo ""

# Test 11: Database Triggers
echo "Test 11: Database Triggers"
echo "--------------------------"

# Check if activity was logged
ACTIVITY_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM shopper_activity WHERE user_id = (SELECT id FROM users WHERE email = '$TEST_USER_EMAIL');")
ACTIVITY_COUNT=$(echo $ACTIVITY_COUNT | xargs)

if [ "$ACTIVITY_COUNT" -gt 0 ]; then
    pass "Activities logged to database ($ACTIVITY_COUNT records)"
else
    fail "No activities found in database"
fi

# Check if engagement metrics were created
METRICS_EXIST=$(psql $DATABASE_URL -t -c "SELECT EXISTS(SELECT 1 FROM shopper_engagement_metrics WHERE user_id = (SELECT id FROM users WHERE email = '$TEST_USER_EMAIL'));")
METRICS_EXIST=$(echo $METRICS_EXIST | xargs)

if [ "$METRICS_EXIST" = "t" ]; then
    pass "Engagement metrics auto-created"
else
    fail "Engagement metrics not created"
fi

echo ""

# Test 12: Privacy Compliance
echo "Test 12: Privacy Compliance"
echo "---------------------------"

# Check consent log
CONSENT_LOG_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM privacy_consent_log WHERE user_id = (SELECT id FROM users WHERE email = '$TEST_USER_EMAIL');")
CONSENT_LOG_COUNT=$(echo $CONSENT_LOG_COUNT | xargs)

if [ "$CONSENT_LOG_COUNT" -gt 0 ]; then
    pass "Privacy consent logged ($CONSENT_LOG_COUNT records)"
else
    fail "Privacy consent not logged"
fi

echo ""

# Summary
echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
