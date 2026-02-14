#!/bin/bash

# Production Deployment Script for Muse Shopping
# Deploys both backend and frontend to Vercel

set -e

echo "=========================================="
echo "🚀 DEPLOYING MUSE SHOPPING TO PRODUCTION"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: Must run from project root${NC}"
  exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo -e "${RED}❌ Error: Vercel CLI not installed${NC}"
  echo "Install with: npm install -g vercel"
  exit 1
fi

echo -e "${BLUE}📦 Step 1: Deploying Backend...${NC}"
echo ""

# Deploy backend
vercel --prod
BACKEND_EXIT=$?

if [ $BACKEND_EXIT -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ Backend deployment failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
echo ""

# Get backend URL
BACKEND_URL=$(vercel ls --prod 2>/dev/null | grep "muse-shopping" | head -1 | awk '{print $2}' || echo "")

if [ -n "$BACKEND_URL" ]; then
  echo -e "${BLUE}Backend URL: https://$BACKEND_URL${NC}"
  echo ""
fi

echo -e "${BLUE}📦 Step 2: Deploying Frontend...${NC}"
echo ""

# Deploy frontend
cd frontend
vercel --prod
FRONTEND_EXIT=$?

if [ $FRONTEND_EXIT -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ Frontend deployment failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo ""

# Get frontend URL
FRONTEND_URL=$(vercel ls --prod 2>/dev/null | grep "frontend" | head -1 | awk '{print $2}' || echo "")

if [ -n "$FRONTEND_URL" ]; then
  echo -e "${BLUE}Frontend URL: https://$FRONTEND_URL${NC}"
  echo ""
fi

cd ..

echo "=========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. Set environment variables in Vercel dashboard:"
echo "   - Backend: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY"
echo "   - Frontend: NEXT_PUBLIC_API_URL"
echo ""
echo "2. Test your backend:"
if [ -n "$BACKEND_URL" ]; then
  echo "   curl https://$BACKEND_URL/api/v1/health"
else
  echo "   curl https://your-backend.vercel.app/api/v1/health"
fi
echo ""
echo "3. Update frontend NEXT_PUBLIC_API_URL to:"
if [ -n "$BACKEND_URL" ]; then
  echo "   https://$BACKEND_URL/api/v1"
else
  echo "   https://your-backend.vercel.app/api/v1"
fi
echo ""
echo "4. Redeploy frontend after setting NEXT_PUBLIC_API_URL"
echo ""

echo "📖 Full instructions: DEPLOY_TO_VERCEL.md"
echo ""

exit 0
