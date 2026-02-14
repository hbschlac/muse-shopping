#!/bin/bash

# Frontend Pages Comprehensive Test Script
# Tests all pages, routes, and critical functionality

set -e

FRONTEND_URL="http://localhost:3001"
BACKEND_URL="http://localhost:3000/api/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "FRONTEND PAGES TEST SUITE"
echo "================================"
echo ""

test_count=0
pass_count=0
fail_count=0

# Function to test if page loads with 200 status
test_page() {
    local path=$1
    local name=$2

    test_count=$((test_count + 1))

    echo -n "Testing $name ($path)... "

    status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$path" 2>&1)

    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        pass_count=$((pass_count + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL (HTTP $status)${NC}"
        fail_count=$((fail_count + 1))
        return 1
    fi
}

# Function to test backend endpoint
test_backend() {
    local path=$1
    local name=$2

    test_count=$((test_count + 1))

    echo -n "Testing backend $name ($path)... "

    response=$(curl -s "$BACKEND_URL$path" 2>&1)

    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        pass_count=$((pass_count + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        fail_count=$((fail_count + 1))
        return 1
    fi
}

echo "=== AUTHENTICATION PAGES ==="
test_page "/welcome" "Welcome Page"
test_page "/welcome/email" "Email Signup Page"
test_page "/auth/login" "Login Page"
test_page "/auth/forgot-password" "Forgot Password Page"

echo ""
echo "=== ONBOARDING PAGES ==="
test_page "/onboarding/intro" "Onboarding Intro"
test_page "/onboarding/start" "Onboarding Start"

echo ""
echo "=== MAIN APP PAGES ==="
test_page "/home" "Home/Feed Page"
test_page "/discover" "Discover Page"
test_page "/chat" "Chat/Muse Page"
test_page "/inspire" "Inspire Page"
test_page "/cart" "Cart Page"

echo ""
echo "=== PROFILE & SETTINGS ==="
test_page "/profile" "Profile Page"
test_page "/profile/privacy" "Privacy Settings"

echo ""
echo "=== OTHER PAGES ==="
test_page "/closet" "Closet Page"
test_page "/saves" "Saved Items Page"
test_page "/search" "Search Page"
test_page "/retailers" "Retailers Page"
test_page "/terms" "Terms of Service"
test_page "/offline" "Offline Page"

echo ""
echo "=== BACKEND API HEALTH ==="
test_backend "/health" "Health Check"

echo ""
echo "================================"
echo "TEST RESULTS"
echo "================================"
echo -e "Total Tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
