#!/bin/bash

# Google OAuth Flow Test Script
# Tests the complete Google authentication flow

echo "🔐 Google OAuth Authentication Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check environment variables
echo "1️⃣  Checking environment variables..."
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo -e "${RED}❌ GOOGLE_CLIENT_ID not set in backend .env${NC}"
    exit 1
else
    echo -e "${GREEN}✅ GOOGLE_CLIENT_ID configured${NC}"
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ GOOGLE_CLIENT_SECRET not set in backend .env${NC}"
    exit 1
else
    echo -e "${GREEN}✅ GOOGLE_CLIENT_SECRET configured${NC}"
fi

# Check frontend env
if [ -f "frontend/.env.local" ]; then
    FRONTEND_CLIENT_ID=$(grep NEXT_PUBLIC_GOOGLE_CLIENT_ID frontend/.env.local | cut -d '=' -f2)
    if [ -z "$FRONTEND_CLIENT_ID" ]; then
        echo -e "${RED}❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID not set in frontend/.env.local${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID configured${NC}"
    fi
else
    echo -e "${RED}❌ frontend/.env.local not found${NC}"
    exit 1
fi

echo ""

# Test 2: Check if backend is running
echo "2️⃣  Checking if backend is running..."
BACKEND_HEALTH=$(curl -s http://localhost:3000/api/v1/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running. Start with: npm start${NC}"
    exit 1
fi

echo ""

# Test 3: Test Google auth initiation endpoint
echo "3️⃣  Testing Google auth initiation..."
GOOGLE_AUTH_RESPONSE=$(curl -s http://localhost:3000/api/v1/auth/google)
AUTH_URL=$(echo $GOOGLE_AUTH_RESPONSE | jq -r '.data.authUrl')

if [ "$AUTH_URL" != "null" ] && [ ! -z "$AUTH_URL" ]; then
    echo -e "${GREEN}✅ Google auth URL generated successfully${NC}"
    echo ""
    echo "   Auth URL: $AUTH_URL"
    echo ""
else
    echo -e "${RED}❌ Failed to generate Google auth URL${NC}"
    echo "   Response: $GOOGLE_AUTH_RESPONSE"
    exit 1
fi

echo ""

# Test 4: Check redirect URI
echo "4️⃣  Checking redirect URI configuration..."
if echo "$AUTH_URL" | grep -q "redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fgoogle%2Fcallback"; then
    echo -e "${GREEN}✅ Redirect URI is correct: http://localhost:3001/auth/google/callback${NC}"
else
    echo -e "${RED}❌ Redirect URI is incorrect${NC}"
    exit 1
fi

echo ""

# Test 5: Check if frontend is running
echo "5️⃣  Checking if frontend is running..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_RESPONSE" -eq 200 ] || [ "$FRONTEND_RESPONSE" -eq 307 ]; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running. Start with: cd frontend && npm run dev${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Ensure Google Cloud Console has the redirect URI configured:"
echo "      → http://localhost:3001/auth/google/callback"
echo ""
echo "   2. Open your browser and go to: http://localhost:3001/welcome"
echo ""
echo "   3. Click 'Sign in with Google' and test the flow"
echo ""
echo "   4. Check the logs for any errors during authentication"
echo ""
