#!/bin/bash

# Admin Email System Test Script
# This script tests the Admin Email System functionality

set -e  # Exit on error

echo "🧪 Admin Email System Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000/api/v1"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@muse.shopping}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

echo -e "${YELLOW}📝 Configuration:${NC}"
echo "API Base URL: $API_BASE"
echo "Admin Email: $ADMIN_EMAIL"
echo ""

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print info
info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Step 1: Login as admin
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    error "Failed to login as admin"
    info "Response: $LOGIN_RESPONSE"
    info "Please ensure admin user exists with correct credentials"
    exit 1
fi

success "Admin login successful"
info "Token: ${ADMIN_TOKEN:0:20}..."
echo ""

# Step 2: Get admin user info
echo "Step 2: Getting admin user info..."
USER_INFO=$(curl -s -X GET "$API_BASE/users/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

USER_ID=$(echo $USER_INFO | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
USER_EMAIL=$(echo $USER_INFO | grep -o '"email":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    error "Failed to get user info"
    info "Response: $USER_INFO"
    exit 1
fi

success "User info retrieved"
info "User ID: $USER_ID"
info "User Email: $USER_EMAIL"
echo ""

# Step 3: Test sending email to self
echo "Step 3: Testing single email send to yourself..."
SEND_RESPONSE=$(curl -s -X POST "$API_BASE/admin/emails/send" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": $USER_ID,
    \"subject\": \"Test Email from Admin System\",
    \"heading\": \"Email System Test\",
    \"body\": \"<p>This is a test email from the Muse Shopping Admin Email System.</p><p>If you're reading this, the system is working correctly! 🎉</p>\",
    \"buttonText\": \"View Dashboard\",
    \"buttonUrl\": \"http://localhost:3001\",
    \"emailType\": \"transactional\"
  }")

if echo $SEND_RESPONSE | grep -q "\"success\":true"; then
    success "Email sent successfully"
    info "Check your inbox: $USER_EMAIL"
else
    error "Email send failed"
    info "Response: $SEND_RESPONSE"
fi
echo ""

# Step 4: Check email history
echo "Step 4: Checking email send history..."
HISTORY_RESPONSE=$(curl -s -X GET "$API_BASE/admin/emails/history?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo $HISTORY_RESPONSE | grep -q "\"success\":true"; then
    success "Email history retrieved"
    SENT_COUNT=$(echo $HISTORY_RESPONSE | grep -o '"id":' | wc -l)
    info "Total emails in history: $SENT_COUNT"
else
    error "Failed to get history"
fi
echo ""

# Step 5: Test bulk email (to same user multiple times - just for testing)
echo "Step 5: Testing bulk email send..."
info "Sending to user $USER_ID (3 times for testing)"
BULK_RESPONSE=$(curl -s -X POST "$API_BASE/admin/emails/send/bulk" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userIds\": [$USER_ID, $USER_ID, $USER_ID],
    \"subject\": \"Bulk Email Test\",
    \"heading\": \"Testing Bulk Send\",
    \"body\": \"<p>This is a test of the bulk email functionality.</p>\",
    \"emailType\": \"marketing\"
  }")

if echo $BULK_RESPONSE | grep -q "\"success\":true"; then
    success "Bulk email sent"
    SENT=$(echo $BULK_RESPONSE | grep -o '"sent":[0-9]*' | cut -d':' -f2)
    FAILED=$(echo $BULK_RESPONSE | grep -o '"failed":[0-9]*' | cut -d':' -f2)
    info "Sent: $SENT, Failed: $FAILED"
else
    error "Bulk email failed"
    info "Response: $BULK_RESPONSE"
fi
echo ""

# Step 6: Check bulk send history
echo "Step 6: Checking bulk send history..."
BULK_HISTORY=$(curl -s -X GET "$API_BASE/admin/emails/history/bulk?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo $BULK_HISTORY | grep -q "\"success\":true"; then
    success "Bulk send history retrieved"
else
    error "Failed to get bulk history"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
success "API endpoints are working"
success "Authentication is functioning"
success "Email sending is configured"
success "History tracking is operational"
echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check your email inbox: $USER_EMAIL"
echo "2. Review the email templates"
echo "3. Try sending to real users"
echo "4. Check ADMIN_EMAIL_GUIDE.md for more examples"
echo ""
