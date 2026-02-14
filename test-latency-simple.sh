#!/bin/bash

# Simple Latency Testing Script
# Tests available endpoints and measures response times

set -e

echo "=========================================="
echo "🚀 PRE-DEPLOYMENT LATENCY TESTING"
echo "=========================================="
echo ""

API_URL="${API_URL:-http://localhost:3000/api/v1}"
NUM_TESTS=10

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo "Checking server status..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Server not running at $API_URL${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Function to test endpoint latency
test_endpoint() {
  local name=$1
  local url=$2
  local max_latency=$3

  echo -e "${BLUE}Testing: $name${NC}"
  echo "  Target: <${max_latency}ms"

  local total_time=0
  local min_time=99999
  local max_time=0
  local success_count=0

  for i in $(seq 1 $NUM_TESTS); do
    # Use curl's built-in timing
    result=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /dev/null "$url" 2>/dev/null || echo -e "\n000\n0")

    status=$(echo "$result" | sed -n '1p')
    time_sec=$(echo "$result" | sed -n '2p')

    # Convert to milliseconds (handle decimal)
    time_ms=$(echo "$time_sec * 1000" | bc -l | cut -d'.' -f1)

    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
      success_count=$((success_count + 1))
      total_time=$((total_time + time_ms))

      if [ $time_ms -lt $min_time ]; then
        min_time=$time_ms
      fi

      if [ $time_ms -gt $max_time ]; then
        max_time=$time_ms
      fi

      printf "    ."
    else
      printf "    ${RED}✗${NC}"
    fi
  done

  echo ""

  if [ $success_count -gt 0 ]; then
    avg_time=$((total_time / success_count))

    echo "  Results: $success_count/$NUM_TESTS succeeded"
    echo "    Min: ${min_time}ms"
    echo "    Avg: ${avg_time}ms"
    echo "    Max: ${max_time}ms"

    if [ $avg_time -le $max_latency ]; then
      echo -e "  ${GREEN}✓ PASS${NC} (${avg_time}ms <= ${max_latency}ms)"
      return 0
    else
      echo -e "  ${YELLOW}⚠ SLOW${NC} (${avg_time}ms > ${max_latency}ms)"
      return 1
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} - All requests failed"
    return 1
  fi

  echo ""
}

# ==========================================
# Test Suite
# ==========================================

PASSED=0
FAILED=0

echo "=========================================="
echo "RUNNING LATENCY TESTS"
echo "=========================================="
echo ""

# Test 1: Health Check (should be very fast)
if test_endpoint "Health Check" "$API_URL/health" 50; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Detailed Health Check
if test_endpoint "Detailed Health" "$API_URL/health/detailed" 200; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi
echo ""

# Try to create a test user for authenticated endpoints
echo "Setting up authentication..."
TEST_EMAIL="latency-test-$(date +%s)@test.com"
TEST_PASSWORD="TestPass123!"

signup_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Latency Test\"}" \
  "$API_URL/auth/signup" 2>/dev/null || echo "{}")

AUTH_TOKEN=$(echo "$signup_response" | grep -o '"token":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -n "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "" ]; then
  echo -e "${GREEN}✓ Test user created${NC}"
  echo ""

  # Test 3: User Profile
  if test_endpoint "User Profile" "$API_URL/users/me" 200; then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
  fi
  echo ""

  # Test 4: Preferences
  if test_endpoint "User Preferences" "$API_URL/preferences" 200; then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
  fi
  echo ""
else
  echo -e "${YELLOW}⚠ Could not create test user, skipping authenticated tests${NC}"
  echo ""
fi

# ==========================================
# Database Connection Test
# ==========================================

echo "=========================================="
echo "DATABASE STATUS"
echo "=========================================="
echo ""

# Try to check database indexes
if command -v psql &> /dev/null; then
  if [ -f .env ]; then
    source .env 2>/dev/null || true
  fi

  if [ -n "$DATABASE_URL" ]; then
    echo "Checking performance indexes..."
    index_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" 2>/dev/null | tr -d ' ' || echo "0")

    if [ "$index_count" -gt "20" ]; then
      echo -e "${GREEN}✓ Performance indexes exist${NC} ($index_count indexes)"
    elif [ "$index_count" -gt "0" ]; then
      echo -e "${YELLOW}⚠ Some indexes exist${NC} ($index_count indexes)"
      echo "  Expected: >20 indexes"
      echo "  Run: npm run migrate"
    else
      echo -e "${RED}✗ No performance indexes found${NC}"
      echo "  Run: npm run migrate"
    fi
  else
    echo -e "${YELLOW}⚠ DATABASE_URL not set${NC}"
  fi
else
  echo -e "${YELLOW}⚠ psql not available, cannot check database${NC}"
fi
echo ""

# ==========================================
# Summary
# ==========================================

echo "=========================================="
echo "RESULTS SUMMARY"
echo "=========================================="
echo ""
echo "Tests Run: $(($PASSED + $FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $PASSED -gt 0 ]; then
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}✓✓✓ ALL TESTS PASSED ✓✓✓${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo ""
  echo "Your application latency is GOOD!"
  echo ""
  echo "Next steps:"
  echo "1. ✓ Latency testing complete"
  echo "2. → Run database migrations"
  echo "3. → Proceed with deployment"
  echo ""
  exit 0
else
  echo -e "${YELLOW}════════════════════════════════════════${NC}"
  echo -e "${YELLOW}⚠ SOME TESTS HAD ISSUES ⚠${NC}"
  echo -e "${YELLOW}════════════════════════════════════════${NC}"
  echo ""

  if [ $PASSED -gt 0 ]; then
    echo "Basic endpoints are working, but some features need attention."
    echo ""
    echo "Recommendations:"
    echo "1. Check server logs for errors"
    echo "2. Verify database migrations are applied"
    echo "3. Check .env configuration"
    echo ""
    echo "You may still proceed with deployment if critical"
    echo "endpoints (health, auth) are working."
  else
    echo "Critical issues detected. Please fix before deploying:"
    echo "1. Ensure backend server is running"
    echo "2. Check database connection"
    echo "3. Review server logs for errors"
  fi
  echo ""
  exit 1
fi
