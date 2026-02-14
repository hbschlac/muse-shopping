#!/bin/bash

# Test script for Nordstrom Research System
# Verifies installation and runs basic tests

set -e

echo "=================================================="
echo "  Nordstrom System Test Suite"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Load environment - use grep to avoid sourcing problematic lines
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep "^DB_" | xargs 2>/dev/null)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Set defaults if not set
DB_NAME=${DB_NAME:-muse_shopping_dev}
DB_USER=${DB_USER:-$(whoami)}

# Test 1: Database tables exist
echo "Test 1: Checking database tables..."
TABLES=$(psql -d "$DB_NAME" -U "$DB_USER" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'nordstrom_%';" 2>/dev/null)

if [ "$TABLES" -ge 5 ]; then
    echo -e "${GREEN}✓ PASS: Found $TABLES Nordstrom tables${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL: Expected 5+ tables, found $TABLES${NC}"
    ((FAILED++))
fi

# Test 2: Service file exists
echo "Test 2: Checking service files..."
if [ -f "src/services/nordstromInventoryService.js" ]; then
    echo -e "${GREEN}✓ PASS: Service file exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL: Service file missing${NC}"
    ((FAILED++))
fi

# Test 3: Job files exist
echo "Test 3: Checking job files..."
if [ -f "src/jobs/nordstromInventoryJob.js" ] && [ -f "src/jobs/nordstromInventoryScheduler.js" ]; then
    echo -e "${GREEN}✓ PASS: Job files exist${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL: Job files missing${NC}"
    ((FAILED++))
fi

# Test 4: Route file exists
echo "Test 4: Checking route file..."
if [ -f "src/routes/nordstromInventoryRoutes.js" ]; then
    echo -e "${GREEN}✓ PASS: Route file exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL: Route file missing${NC}"
    ((FAILED++))
fi

# Test 5: Routes registered
echo "Test 5: Checking routes registration..."
if grep -q "nordstromInventoryRoutes" "src/routes/index.js"; then
    echo -e "${GREEN}✓ PASS: Routes registered${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL: Routes not registered${NC}"
    ((FAILED++))
fi

# Test 6: NPM scripts added
echo "Test 6: Checking NPM scripts..."
if grep -q "nordstrom:scrape" "package.json" && grep -q "nordstrom:scheduler" "package.json"; then
    echo -e "${GREEN}✓ PASS: NPM scripts configured${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL: NPM scripts missing${NC}"
    ((FAILED++))
fi

# Test 7: Can insert test data
echo "Test 7: Testing database write..."
psql -d "$DB_NAME" -U "$DB_USER" -c "
  INSERT INTO nordstrom_products (product_id, product_name, brand_name, current_price)
  VALUES ('TEST-001', 'Test Product', 'Test Brand', 99.99)
  ON CONFLICT (product_id) DO NOTHING;
" > /dev/null 2>&1

COUNT=$(psql -d "$DB_NAME" -U "$DB_USER" -t -c "SELECT COUNT(*) FROM nordstrom_products WHERE product_id = 'TEST-001';" 2>/dev/null)

if [ "$COUNT" -eq 1 ]; then
    echo -e "${GREEN}✓ PASS: Database write successful${NC}"
    ((PASSED++))
    # Clean up test data
    psql -d "$DB_NAME" -U "$DB_USER" -c "DELETE FROM nordstrom_products WHERE product_id = 'TEST-001';" > /dev/null 2>&1
else
    echo -e "${RED}✗ FAIL: Database write failed${NC}"
    ((FAILED++))
fi

# Test 8: Dependencies installed
echo "Test 8: Checking dependencies..."
if npm list puppeteer puppeteer-extra puppeteer-extra-plugin-stealth > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS: Dependencies installed${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING: Some dependencies may be missing${NC}"
    echo "  Run: npm install"
fi

echo ""
echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! System is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run nordstrom:scrape"
    echo "  2. Check: psql -d $DB_NAME -c 'SELECT COUNT(*) FROM nordstrom_products;'"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix issues before proceeding.${NC}"
    exit 1
fi
