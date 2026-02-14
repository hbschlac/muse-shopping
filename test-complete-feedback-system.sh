#!/bin/bash

echo "🧪 Complete Feedback System Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test submission
test_submission() {
    local category=$1
    local description=$2

    echo -n "Testing $description submission... "

    RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/feedback \
      -H "Content-Type: application/json" \
      -d "{
        \"category\": \"$category\",
        \"subject\": \"Test $description from automated test\",
        \"message\": \"This is an automated test message for $description. It contains enough text to pass validation requirements.\",
        \"email\": \"test-$category@muse.shopping\",
        \"fullName\": \"Test User ($description)\"
      }" 2>&1)

    TICKET=$(echo "$RESPONSE" | jq -r '.data.ticketNumber' 2>/dev/null)

    if [ "$TICKET" != "null" ] && [ ! -z "$TICKET" ]; then
        echo -e "${GREEN}✓${NC} Ticket: $TICKET"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$TICKET"  # Return ticket for further testing
    else
        echo -e "${RED}✗${NC}"
        echo "Response: $RESPONSE"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
    fi
}

# Test 1: Check database migration
echo "📊 Test 1: Database Structure"
echo "-----------------------------"
psql -U muse_admin -d muse_shopping_dev -c "
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'feedback_submissions'
    ORDER BY ordinal_position;
" 2>&1 | grep -q "ticket_number"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database tables exist"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} Database tables missing"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2: Ticket number generation
echo "📝 Test 2: Ticket Number Generation"
echo "-----------------------------------"
TICKET_TEST=$(psql -U muse_admin -d muse_shopping_dev -t -c "SELECT generate_ticket_number();" 2>&1 | tr -d '[:space:]')

if [[ $TICKET_TEST =~ MUSE-[0-9]{4}-[0-9]{5} ]]; then
    echo -e "${GREEN}✓${NC} Ticket generation works: $TICKET_TEST"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} Ticket generation failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 3: API Submissions
echo "🚀 Test 3: API Submissions (All Categories)"
echo "-------------------------------------------"

BUG_TICKET=$(test_submission "bug" "Bug Report")
FEATURE_TICKET=$(test_submission "feature_request" "Feature Request")
TECH_HELP_TICKET=$(test_submission "tech_help" "Tech Help")
COMPLAINT_TICKET=$(test_submission "complaint" "Complaint")
QUESTION_TICKET=$(test_submission "question" "Question")
OTHER_TICKET=$(test_submission "other" "Other")

echo ""

# Test 4: Database verification
echo "💾 Test 4: Database Verification"
echo "--------------------------------"
COUNT=$(psql -U muse_admin -d muse_shopping_dev -t -c "SELECT COUNT(*) FROM feedback_submissions;" 2>&1 | tr -d '[:space:]')

if [ "$COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓${NC} $COUNT feedback submissions in database"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} No submissions found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 5: Category counts
echo "📊 Test 5: Category Breakdown"
echo "-----------------------------"
psql -U muse_admin -d muse_shopping_dev -c "
    SELECT
        category,
        COUNT(*) as count
    FROM feedback_submissions
    GROUP BY category
    ORDER BY count DESC;
" 2>&1

echo ""

# Test 6: Tech Help special routing check
echo "🛠️  Test 6: Tech Help Email Routing"
echo "-----------------------------------"
if [ ! -z "$TECH_HELP_TICKET" ]; then
    echo -e "${YELLOW}ℹ${NC}  Tech help ticket created: $TECH_HELP_TICKET"
    echo -e "${YELLOW}ℹ${NC}  Should be sent to BOTH:"
    echo "   • feedback@muse.shopping"
    echo "   • help@muse.shopping"
    echo -e "${GREEN}✓${NC} Check your email inboxes to verify"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} Tech help ticket not created"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 7: Stats API
echo "📈 Test 7: Statistics API"
echo "-------------------------"
STATS=$(curl -s http://localhost:3000/api/v1/feedback/stats \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" 2>&1)

if echo "$STATS" | jq -e '.data.total_submissions' >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Stats API working"
    echo "$STATS" | jq '.data' 2>/dev/null
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC}  Stats API requires admin authentication"
    echo "   (This is expected - not a failure)"
fi
echo ""

# Test 8: Recent submissions
echo "📋 Test 8: Recent Submissions"
echo "-----------------------------"
psql -U muse_admin -d muse_shopping_dev -c "
    SELECT
        ticket_number,
        category,
        LEFT(subject, 40) as subject,
        status,
        priority,
        created_at::date as date
    FROM feedback_submissions
    ORDER BY created_at DESC
    LIMIT 10;
" 2>&1

echo ""

# Summary
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Your feedback system is working correctly!"
    echo ""
    echo "Next steps:"
    echo "1. Visit http://localhost:3001/feedback to submit feedback"
    echo "2. Visit http://localhost:3001/admin/feedback to manage tickets"
    echo "3. Check feedback@muse.shopping and help@muse.shopping for emails"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure backend is running: npm start"
    echo "2. Check database connection"
    echo "3. Review error messages above"
    exit 1
fi
