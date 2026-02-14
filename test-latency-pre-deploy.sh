#!/bin/bash

# Pre-Deployment Latency Testing Script
# Tests all critical API endpoints and measures response times
# Target: Most endpoints <500ms, Chat <2000ms

set -e

echo "=========================================="
echo "🚀 PRE-DEPLOYMENT LATENCY TESTING"
echo "=========================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
NUM_REQUESTS=5
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to measure latency
measure_latency() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-}
  local auth_token=${4:-}
  local max_latency=${5:-500}

  echo "Testing: $method $endpoint"
  echo "  Max allowed latency: ${max_latency}ms"

  local total_time=0
  local min_time=999999
  local max_time=0
  local success_count=0

  for i in $(seq 1 $NUM_REQUESTS); do
    # Use curl's time_total for accurate timing (in seconds, convert to ms)
    if [ -n "$auth_token" ]; then
      if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $auth_token" \
          -d "$data" \
          "$API_URL$endpoint" 2>/dev/null || echo -e "\n000\n0")
      else
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" \
          -H "Authorization: Bearer $auth_token" \
          "$API_URL$endpoint" 2>/dev/null || echo -e "\n000\n0")
      fi
    else
      if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" \
          -H "Content-Type: application/json" \
          -d "$data" \
          "$API_URL$endpoint" 2>/dev/null || echo -e "\n000\n0")
      else
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" \
          "$API_URL$endpoint" 2>/dev/null || echo -e "\n000\n0")
      fi
    fi

    # Extract status code and time (last two lines)
    local status_code=$(echo "$response" | tail -n 2 | head -n 1)
    local time_seconds=$(echo "$response" | tail -n 1)
    local duration=$(echo "$time_seconds * 1000 / 1" | bc)

    if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
      success_count=$((success_count + 1))
      total_time=$((total_time + duration))

      if [ $duration -lt $min_time ]; then
        min_time=$duration
      fi

      if [ $duration -gt $max_time ]; then
        max_time=$duration
      fi

      echo "    Request $i: ${duration}ms (${status_code})"
    else
      echo "    Request $i: FAILED (${status_code})"
    fi

    # Brief pause between requests
    sleep 0.2
  done

  if [ $success_count -gt 0 ]; then
    local avg_time=$((total_time / success_count))

    echo "  Results:"
    echo "    Success: $success_count/$NUM_REQUESTS"
    echo "    Min: ${min_time}ms"
    echo "    Avg: ${avg_time}ms"
    echo "    Max: ${max_time}ms"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ $avg_time -le $max_latency ]; then
      echo -e "  ${GREEN}✓ PASS${NC} (avg ${avg_time}ms <= ${max_latency}ms)"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} (avg ${avg_time}ms > ${max_latency}ms)"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} - All requests failed"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  echo ""
}

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Server is not running at $API_URL${NC}"
  echo "Please start the server with: npm run dev"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Create test user and get auth token
echo "Setting up test user..."
TEST_EMAIL="latency-test-$(date +%s)@test.com"
TEST_PASSWORD="TestPass123!"

# Signup
signup_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Latency Test\"}" \
  "$API_URL/auth/signup" 2>/dev/null || echo "{}")

AUTH_TOKEN=$(echo "$signup_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}Warning: Could not create test user, will skip authenticated tests${NC}"
else
  echo -e "${GREEN}✓ Test user created${NC}"
fi
echo ""

# ==========================================
# Test Suite
# ==========================================

echo "=========================================="
echo "LATENCY TEST SUITE"
echo "=========================================="
echo ""

# 1. Health Check (should be very fast)
measure_latency "/health" "GET" "" "" 100

# 2. Items List (with cache)
measure_latency "/items?limit=20" "GET" "" "$AUTH_TOKEN" 500

# 3. Items Search (with filters)
measure_latency "/items?brand=Nike&limit=10" "GET" "" "$AUTH_TOKEN" 500

# 4. Item Detail
if [ -n "$AUTH_TOKEN" ]; then
  # Get first item ID
  items_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/items?limit=1")
  ITEM_ID=$(echo "$items_response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

  if [ -n "$ITEM_ID" ]; then
    measure_latency "/items/$ITEM_ID" "GET" "" "$AUTH_TOKEN" 300
  fi
fi

# 5. User Profile
if [ -n "$AUTH_TOKEN" ]; then
  measure_latency "/users/me" "GET" "" "$AUTH_TOKEN" 300
fi

# 6. Preferences
if [ -n "$AUTH_TOKEN" ]; then
  measure_latency "/preferences" "GET" "" "$AUTH_TOKEN" 300
fi

# 7. Cart View
if [ -n "$AUTH_TOKEN" ]; then
  measure_latency "/cart" "GET" "" "$AUTH_TOKEN" 400
fi

# 8. Newsfeed
if [ -n "$AUTH_TOKEN" ]; then
  measure_latency "/newsfeed?limit=10" "GET" "" "$AUTH_TOKEN" 600
fi

# 9. Recommendations
if [ -n "$AUTH_TOKEN" ]; then
  measure_latency "/recommendations?limit=10" "GET" "" "$AUTH_TOKEN" 800
fi

# 10. Chat (most expensive operation)
if [ -n "$AUTH_TOKEN" ]; then
  chat_data='{"message":"Show me running shoes","sessionId":null}'
  measure_latency "/chat" "POST" "$chat_data" "$AUTH_TOKEN" 2000
fi

# ==========================================
# Cache Performance Check
# ==========================================

echo "=========================================="
echo "CACHE PERFORMANCE"
echo "=========================================="
echo ""

if [ -n "$AUTH_TOKEN" ]; then
  echo "Testing cache effectiveness (same query multiple times)..."

  # First request (cache miss)
  time1=$(curl -s -w "%{time_total}" -o /dev/null -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/items?brand=Nike&limit=10")
  first_duration=$(echo "$time1 * 1000 / 1" | bc)
  echo "  First request (cache miss): ${first_duration}ms"

  # Second request (should be cache hit)
  time2=$(curl -s -w "%{time_total}" -o /dev/null -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/items?brand=Nike&limit=10")
  second_duration=$(echo "$time2 * 1000 / 1" | bc)
  echo "  Second request (cache hit): ${second_duration}ms"

  if [ $second_duration -lt $first_duration ]; then
    improvement=$((100 - (second_duration * 100 / first_duration)))
    echo -e "  ${GREEN}✓ Cache working${NC} (${improvement}% faster)"
  else
    echo -e "  ${YELLOW}⚠ Cache may not be working${NC}"
  fi
  echo ""
fi

# ==========================================
# Database Index Check
# ==========================================

echo "=========================================="
echo "DATABASE PERFORMANCE"
echo "=========================================="
echo ""

echo "Checking if performance indexes exist..."

# Check if we can connect to database
if command -v psql &> /dev/null; then
  if [ -f .env ]; then
    source .env 2>/dev/null || true
  fi

  if [ -n "$DATABASE_URL" ]; then
    index_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" 2>/dev/null || echo "0")
    index_count=$(echo $index_count | tr -d ' ')

    if [ "$index_count" -gt "20" ]; then
      echo -e "${GREEN}✓ Performance indexes exist${NC} ($index_count indexes found)"
    else
      echo -e "${YELLOW}⚠ Performance indexes may be missing${NC} (only $index_count found)"
      echo "  Run: npm run migrate"
    fi
  else
    echo -e "${YELLOW}⚠ DATABASE_URL not found, skipping index check${NC}"
  fi
else
  echo -e "${YELLOW}⚠ psql not installed, skipping index check${NC}"
fi
echo ""

# ==========================================
# Results Summary
# ==========================================

echo "=========================================="
echo "TEST RESULTS SUMMARY"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓✓✓ ALL TESTS PASSED ✓✓✓${NC}"
  echo ""
  echo "Your application is ready for deployment!"
  echo ""
  echo "Recommended next steps:"
  echo "1. Run database migrations: npm run migrate"
  echo "2. Review environment variables"
  echo "3. Proceed with Vercel deployment"
  exit 0
else
  echo -e "${RED}✗✗✗ SOME TESTS FAILED ✗✗✗${NC}"
  echo ""
  echo "Please investigate failed tests before deploying."
  echo ""
  echo "Common fixes:"
  echo "1. Ensure database migrations are applied: npm run migrate"
  echo "2. Check environment variables in .env"
  echo "3. Verify cache services are enabled"
  echo "4. Review latency optimization documentation"
  exit 1
fi
