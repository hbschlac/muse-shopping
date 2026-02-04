#!/bin/bash

# Retailer Integration Test Script
# Tests all retailer API endpoints and frontend integration

BASE_URL="http://localhost:3000/api/v1"
FRONTEND_URL="http://localhost:3001"

echo "================================"
echo "Muse Shopping - Retailer API Integration Tests"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local method="${4:-GET}"
    local data="${5:-}"
    local auth_token="${6:-}"

    echo -n "Testing: $name... "

    local curl_cmd="curl -s -w '\\n%{http_code}' -X $method"

    if [ -n "$auth_token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_token'"
    fi

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    curl_cmd="$curl_cmd '$url'"

    response=$(eval $curl_cmd)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "  Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "1. Testing Backend Health"
echo "------------------------"
test_endpoint "Health Check" "$BASE_URL/health"
test_endpoint "Readiness Check" "$BASE_URL/health/ready"
echo ""

echo "2. Testing Authentication Endpoints"
echo "----------------------------------"
# Register test user
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-retailer-${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPassword123!"

REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\"}"
REGISTER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_DATA" "$BASE_URL/auth/register")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ User Registration${NC}"
    AUTH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"\(.*\)"/\1/')
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ User Registration Failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
    ((TESTS_FAILED++))
    AUTH_TOKEN=""
fi
echo ""

if [ -n "$AUTH_TOKEN" ]; then
    echo "3. Testing Product Catalog Endpoints"
    echo "-----------------------------------"

    # Test product stats (these should work even with no data)
    test_endpoint "Cache Statistics" "$BASE_URL/products/stats/cache?hours=24" 200 GET "" "$AUTH_TOKEN"
    test_endpoint "Cost Statistics" "$BASE_URL/products/stats/cost?days=7" 200 GET "" "$AUTH_TOKEN"
    test_endpoint "Batch Import Stats" "$BASE_URL/products/stats/batch-imports?days=7" 200 GET "" "$AUTH_TOKEN"

    echo ""

    echo "4. Testing Store Connection Endpoints"
    echo "------------------------------------"
    test_endpoint "Get Available Retailers" "$BASE_URL/store-connections/retailers" 200 GET "" ""
    test_endpoint "Get Connected Retailers" "$BASE_URL/store-connections" 200 GET "" "$AUTH_TOKEN"

    echo ""

    echo "5. Testing Brand Endpoints"
    echo "-------------------------"
    test_endpoint "Get All Brands" "$BASE_URL/brands" 200
    test_endpoint "Search Brands" "$BASE_URL/brands/search?q=nike" 200

    echo ""

    echo "6. Testing Newsfeed Endpoints"
    echo "----------------------------"
    test_endpoint "Get Newsfeed" "$BASE_URL/newsfeed" 200
    test_endpoint "Get Stories" "$BASE_URL/newsfeed/stories" 200

    echo ""

    echo "7. Testing Cart Endpoints"
    echo "------------------------"
    test_endpoint "Get Cart" "$BASE_URL/cart" 200 GET "" "$AUTH_TOKEN"

    echo ""

    echo "8. Testing Saves Endpoints"
    echo "-------------------------"
    test_endpoint "Get Saved Items" "$BASE_URL/items/saved" 200 GET "" "$AUTH_TOKEN"

    echo ""
fi

echo "9. Testing Frontend Pages"
echo "------------------------"
echo -n "Testing: Home Page... "
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/home")
if [ "$HOME_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Status: $HOME_STATUS)"
    ((TESTS_FAILED++))
fi

echo -n "Testing: Retailers Page... "
RETAILERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/retailers")
if [ "$RETAILERS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Status: $RETAILERS_STATUS)"
    ((TESTS_FAILED++))
fi

echo -n "Testing: Retailer Settings Page... "
SETTINGS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/settings/retailers")
if [ "$SETTINGS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Status: $SETTINGS_STATUS)"
    ((TESTS_FAILED++))
fi

echo ""

# Clean up test user if we have auth
if [ -n "$AUTH_TOKEN" ] && [ -n "$USER_ID" ]; then
    echo "Cleaning up test user..."
    curl -s -X DELETE -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/users/me" > /dev/null
    echo "Done."
    echo ""
fi

echo "================================"
echo "Test Results"
echo "================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "Total: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
