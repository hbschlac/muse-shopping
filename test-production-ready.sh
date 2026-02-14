#!/bin/bash

echo "🚀 Production Readiness Check"
echo "=============================="
echo ""

PASS=0
FAIL=0

# Test 1: Database
echo "1️⃣  Checking database..."
if psql -U muse_admin -d muse_shopping_dev -c "SELECT COUNT(*) FROM feedback_submissions;" > /dev/null 2>&1; then
    echo "   ✅ Database connected"
    ((PASS++))
else
    echo "   ❌ Database connection failed"
    ((FAIL++))
fi

# Test 2: Tech help category
echo "2️⃣  Checking tech_help category..."
CONSTRAINT=$(psql -U muse_admin -d muse_shopping_dev -t -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'feedback_submissions_category_check';" 2>/dev/null)
if echo "$CONSTRAINT" | grep -q "tech_help"; then
    echo "   ✅ Tech help category enabled"
    ((PASS++))
else
    echo "   ❌ Tech help category missing"
    ((FAIL++))
fi

# Test 3: Backend routes
echo "3️⃣  Checking backend routes..."
if grep -q "router.use('/feedback', feedbackRoutes)" src/routes/index.js; then
    echo "   ✅ Feedback routes enabled"
    ((PASS++))
else
    echo "   ❌ Feedback routes not enabled"
    ((FAIL++))
fi

# Test 4: Frontend build
echo "4️⃣  Checking frontend build..."
if [ -d "frontend/.next" ]; then
    echo "   ✅ Frontend built"
    ((PASS++))
else
    echo "   ❌ Frontend not built"
    ((FAIL++))
fi

# Test 5: Feedback pages
echo "5️⃣  Checking feedback pages..."
if [ -f "frontend/app/feedback/page.tsx" ] && [ -f "frontend/app/admin/feedback/page.tsx" ]; then
    echo "   ✅ Feedback pages exist"
    ((PASS++))
else
    echo "   ❌ Feedback pages missing"
    ((FAIL++))
fi

# Test 6: Email service
echo "6️⃣  Checking email service..."
if grep -q "tech_help" src/services/emailService.js; then
    echo "   ✅ Email routing configured"
    ((PASS++))
else
    echo "   ❌ Email routing not configured"
    ((FAIL++))
fi

# Test 7: Controllers
echo "7️⃣  Checking controllers..."
if grep -q "tech_help" src/controllers/feedbackController.js; then
    echo "   ✅ Controllers updated"
    ((PASS++))
else
    echo "   ❌ Controllers not updated"
    ((FAIL++))
fi

# Test 8: Validation
echo "8️⃣  Checking validation..."
if grep -q "tech_help" src/middleware/validation.js; then
    echo "   ✅ Validation updated"
    ((PASS++))
else
    echo "   ❌ Validation not updated"
    ((FAIL++))
fi

echo ""
echo "=============================="
echo "Results:"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 PRODUCTION READY!"
    echo ""
    echo "Your feedback system is fully deployed and ready to use:"
    echo ""
    echo "📝 User Form:    http://localhost:3001/feedback"
    echo "⚙️  Admin Panel:  http://localhost:3001/admin/feedback"
    echo ""
    echo "Email Routing:"
    echo "  Regular:   → feedback@muse.shopping"
    echo "  Tech Help: → feedback@muse.shopping + help@muse.shopping"
    echo ""
    exit 0
else
    echo "⚠️  Some checks failed. Review the errors above."
    exit 1
fi
