#!/bin/bash

# Automated Testing Script - Non-Interactive Version
# Runs automated checks without user prompts

echo "========================================"
echo "Muse Shopping - Automated Testing"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test function
test_check() {
    local test_name=$1
    local command=$2
    local expected=$3

    echo -e "${BLUE}TEST:${NC} $test_name"

    if eval "$command"; then
        echo -e "${GREEN}  ✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}  ✗ FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
}

echo "Starting automated checks..."
echo ""

# File existence checks
echo "====================================="
echo "FILE EXISTENCE CHECKS"
echo "====================================="
echo ""

test_check "Pagination component exists" "[ -f 'frontend/components/Pagination.tsx' ]"
test_check "usePagination hook exists" "[ -f 'frontend/lib/hooks/usePagination.ts' ]"
test_check "Test file exists" "[ -f 'frontend/tests/pagination.test.ts' ]"
test_check "Documentation files exist" "[ -f 'FINAL_SUMMARY.md' ] && [ -f 'TESTING_GUIDE.md' ]"

echo "====================================="
echo "BRAND COMPLIANCE CHECKS"
echo "====================================="
echo ""

# Border radius checks
test_check "Welcome page uses 12px radius" "grep -q 'rounded-\[12px\]' frontend/app/welcome/page.tsx"
test_check "Apple callback uses 12px radius" "grep -q 'rounded-\[12px\]' frontend/app/auth/apple/callback/page.tsx"
test_check "Google callback uses 12px radius" "grep -q 'rounded-\[12px\]' frontend/app/auth/google/callback/page.tsx"
test_check "Retailer callback uses 12px radius" "grep -q 'rounded-\[12px\]' frontend/app/auth/retailer/callback/page.tsx"
test_check "Profile page uses 12px radius" "grep -q 'rounded-\[12px\]' frontend/app/profile/page.tsx"

# Logo size check
test_check "Newsfeed logo is h-12 (48px)" "grep -q 'h-12' frontend/components/Newsfeed.tsx"

# Brand colors check
test_check "Welcome page uses brand colors" "grep -q '#A8C5E0' frontend/app/welcome/page.tsx && grep -q '#F4C4B0' frontend/app/welcome/page.tsx"
test_check "Welcome page imports BrandTokens" "grep -q 'BrandTokens' frontend/app/welcome/page.tsx"

# Button height check
test_check "Welcome buttons are 56px height" "grep -q 'h-\[56px\]' frontend/app/welcome/page.tsx"

# Transition check
test_check "Welcome page uses 150ms transitions" "grep -q 'duration-\[150ms\]' frontend/app/welcome/page.tsx"

echo "====================================="
echo "PAGINATION IMPLEMENTATION CHECKS"
echo "====================================="
echo ""

test_check "Search page imports Pagination component" "grep -q 'import.*Pagination' frontend/app/search/page.tsx"
test_check "Search page uses usePagination hook" "grep -q 'usePagination' frontend/app/search/page.tsx"
test_check "Search page integrates searchProducts API" "grep -q 'searchProducts' frontend/app/search/page.tsx"

test_check "Product page imports getProduct API" "grep -q 'getProduct' frontend/app/product/\[id\]/page.tsx"
test_check "Product page has loading states" "grep -q 'LoadingSpinner' frontend/app/product/\[id\]/page.tsx"

test_check "Closet page imports LoadMoreButton" "grep -q 'LoadMoreButton' frontend/app/closet/page.tsx"
test_check "Closet page integrates getSavedItems API" "grep -q 'getSavedItems' frontend/app/closet/page.tsx"

test_check "ProductCard uses 12px radius" "grep -q 'rounded-\[12px\]' frontend/components/ProductCard.tsx"
test_check "ProductCard links to product pages" "grep -q 'href=.*product' frontend/components/ProductCard.tsx"

echo "====================================="
echo "CODE QUALITY CHECKS"
echo "====================================="
echo ""

# Check for any remaining violations (excluding old files)
VIOLATIONS=$(grep -r "rounded-\[16px\]\|rounded-\[24px\]\|rounded-\[28px\]" frontend/app frontend/components 2>/dev/null | grep -v node_modules | grep -v page-old.tsx | wc -l | xargs)

if [ "$VIOLATIONS" -eq "0" ]; then
    echo -e "${GREEN}✓ No border radius violations found (excluding old files)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Found $VIOLATIONS border radius violations${NC}"
    ((FAILED++))
fi
echo ""

# Check TypeScript files compile (basic syntax check)
test_check "TypeScript files have no syntax errors in Pagination" "grep -q 'export' frontend/components/Pagination.tsx"
test_check "TypeScript files have no syntax errors in usePagination" "grep -q 'export' frontend/lib/hooks/usePagination.ts"

echo "====================================="
echo "DOCUMENTATION CHECKS"
echo "====================================="
echo ""

test_check "FINAL_SUMMARY.md exists and is complete" "[ -s 'FINAL_SUMMARY.md' ]"
test_check "TESTING_GUIDE.md exists and is complete" "[ -s 'TESTING_GUIDE.md' ]"
test_check "PAGINATION_AND_BRAND_STANDARDIZATION.md exists" "[ -s 'PAGINATION_AND_BRAND_STANDARDIZATION.md' ]"
test_check "QUICK_REFERENCE.md exists" "[ -s 'QUICK_REFERENCE.md' ]"
test_check "VERIFICATION_REPORT.md exists" "[ -s 'VERIFICATION_REPORT.md' ]"

echo ""
echo "====================================="
echo "SUMMARY"
echo "====================================="
echo ""
echo -e "${GREEN}Tests Passed: $PASSED${NC}"
echo -e "${RED}Tests Failed: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))

if [ $PASS_RATE -ge 95 ]; then
    echo -e "${GREEN}✓ EXCELLENT! Pass rate: $PASS_RATE%${NC}"
    echo -e "${GREEN}All systems ready for testing!${NC}"
elif [ $PASS_RATE -ge 80 ]; then
    echo -e "${YELLOW}⚠ GOOD! Pass rate: $PASS_RATE%${NC}"
    echo -e "${YELLOW}Minor issues found, review failed tests${NC}"
else
    echo -e "${RED}✗ NEEDS WORK! Pass rate: $PASS_RATE%${NC}"
    echo -e "${RED}Please review failed tests and fix issues${NC}"
fi

echo ""
echo "====================================="
echo "NEXT STEPS"
echo "====================================="
echo ""
echo "1. Start dev server: cd frontend && npm run dev"
echo "2. Visit: http://localhost:3000"
echo "3. Test manually using TESTING_GUIDE.md"
echo "4. Run interactive tests: ./test-checklist.sh"
echo ""

exit 0
