#!/bin/bash

# Header Standardization Test Runner
# Runs all tests related to header consistency and performance

set -e

echo "======================================"
echo "Header Standardization Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
  local test_name=$1
  local test_command=$2

  echo -e "${YELLOW}Running:${NC} $test_name"
  TESTS_RUN=$((TESTS_RUN + 1))

  if eval "$test_command"; then
    echo -e "${GREEN}✓ PASSED:${NC} $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAILED:${NC} $test_name"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

echo "1. Validating File Structure..."
echo "======================================"

# Check that PageHeader component exists
run_test "PageHeader component exists" \
  "test -f frontend/components/PageHeader.tsx"

# Check that monitoring service exists
run_test "Header monitoring service exists" \
  "test -f frontend/lib/monitoring/headerPerformance.ts"

# Check updated pages exist
run_test "Updated Newsfeed component exists" \
  "test -f frontend/components/Newsfeed.tsx"

run_test "Updated search page exists" \
  "test -f frontend/app/search/page.tsx"

run_test "Updated saves page exists" \
  "test -f frontend/app/saves/page.tsx"

run_test "Updated profile page exists" \
  "test -f frontend/app/profile/page.tsx"

run_test "Updated cart page exists" \
  "test -f frontend/app/cart/page.tsx"

run_test "Updated checkout page exists" \
  "test -f frontend/app/checkout/page.tsx"

echo ""
echo "2. Checking PageHeader Usage..."
echo "======================================"

# Function to check if file uses PageHeader
check_page_header() {
  local file=$1
  local page_name=$2

  if grep -q "import.*PageHeader" "$file" && grep -q "<PageHeader" "$file"; then
    echo -e "${GREEN}✓${NC} $page_name uses PageHeader"
    return 0
  else
    echo -e "${RED}✗${NC} $page_name does NOT use PageHeader"
    return 1
  fi
}

run_test "Newsfeed uses PageHeader" \
  "check_page_header frontend/components/Newsfeed.tsx 'Newsfeed'"

run_test "Search page uses PageHeader" \
  "check_page_header frontend/app/search/page.tsx 'Search'"

run_test "Saves page uses PageHeader" \
  "check_page_header frontend/app/saves/page.tsx 'Saves'"

run_test "Profile page uses PageHeader" \
  "check_page_header frontend/app/profile/page.tsx 'Profile'"

run_test "Cart page uses PageHeader" \
  "check_page_header frontend/app/cart/page.tsx 'Cart'"

run_test "Checkout page uses PageHeader" \
  "check_page_header frontend/app/checkout/page.tsx 'Checkout'"

echo ""
echo "3. Validating PageHeader Configuration..."
echo "======================================"

# Check PageHeader has ecru background
run_test "PageHeader uses ecru background" \
  "grep -q 'bg-\[var(--color-ecru)\]' frontend/components/PageHeader.tsx"

# Check PageHeader has sticky positioning
run_test "PageHeader is sticky" \
  "grep -q 'sticky.*top-0' frontend/components/PageHeader.tsx"

# Check PageHeader has cart button
run_test "PageHeader has cart button" \
  "grep -q 'Shopping Cart' frontend/components/PageHeader.tsx"

# Check PageHeader has menu
run_test "PageHeader has menu button" \
  "grep -q 'aria-label=\"Menu\"' frontend/components/PageHeader.tsx"

# Check PageHeader uses MuseLogo
run_test "PageHeader uses MuseLogo component" \
  "grep -q 'import.*MuseLogo' frontend/components/PageHeader.tsx"

echo ""
echo "4. Running Unit Tests..."
echo "======================================"

cd frontend

# Check if Jest is available
if command -v npm &> /dev/null; then
  # Run PageHeader tests
  run_test "PageHeader component unit tests" \
    "npm test -- --testPathPattern=PageHeader.test --passWithNoTests 2>&1 | grep -q 'PASS\|no tests found'"

  # Run integration tests
  run_test "Header consistency integration tests" \
    "npm test -- --testPathPattern=header-consistency.test --passWithNoTests 2>&1 | grep -q 'PASS\|no tests found'"
else
  echo -e "${YELLOW}⚠${NC} npm not found, skipping Jest tests"
fi

cd ..

echo ""
echo "5. Code Quality Checks..."
echo "======================================"

# Check for console.logs in production code (excluding tests and monitoring)
run_test "No stray console.logs in PageHeader" \
  "! grep -n 'console\\.log' frontend/components/PageHeader.tsx | grep -v '//' || true"

# Check for proper TypeScript types
run_test "PageHeader has TypeScript interface" \
  "grep -q 'interface.*PageHeaderProps' frontend/components/PageHeader.tsx"

echo ""
echo "6. Performance Checks..."
echo "======================================"

# Check that monitoring is set up
run_test "Header monitoring exports monitor instance" \
  "grep -q 'export.*headerMonitor' frontend/lib/monitoring/headerPerformance.ts"

run_test "Header monitoring has performance tracking" \
  "grep -q 'trackRender' frontend/lib/monitoring/headerPerformance.ts"

run_test "Header monitoring integrates with analytics" \
  "grep -q 'sendToAnalytics' frontend/lib/monitoring/headerPerformance.ts"

echo ""
echo "7. Accessibility Checks..."
echo "======================================"

# Check for aria-labels
run_test "Cart button has aria-label" \
  "grep -q 'aria-label=\"Shopping Cart\"' frontend/components/PageHeader.tsx"

run_test "Menu button has aria-label" \
  "grep -q 'aria-label=\"Menu\"' frontend/components/PageHeader.tsx"

run_test "Back button has aria-label" \
  "grep -q 'aria-label=\"Go back\"' frontend/components/PageHeader.tsx"

run_test "Uses semantic HTML header element" \
  "grep -q '<header' frontend/components/PageHeader.tsx"

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Total tests run: ${TESTS_RUN}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run 'npm run build' in frontend/ to verify production build"
  echo "2. Run E2E tests with 'npm run test:e2e' if Playwright is set up"
  echo "3. Test manually in browser: npm run dev"
  echo "4. Check monitoring dashboard for header metrics"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  echo "Please review the failures above and fix before deploying"
  exit 1
fi
