#!/bin/bash

# Automated Vercel Environment Variable Setup
# This script sets production environment variables for both backend and frontend

set -e

echo "=========================================="
echo "🔐 VERCEL ENVIRONMENT VARIABLE SETUP"
echo "=========================================="
echo ""

# Load local .env
if [ -f .env ]; then
  source .env
else
  echo "❌ Error: .env file not found"
  exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Error: Vercel CLI not installed"
  exit 1
fi

echo "Setting up BACKEND environment variables..."
echo ""

# Set backend environment variables
echo "1️⃣ Setting NODE_ENV..."
echo "production" | vercel env add NODE_ENV production --yes 2>/dev/null || echo "   (may already exist)"

echo "2️⃣ Setting JWT_SECRET..."
echo "$JWT_SECRET" | vercel env add JWT_SECRET production --yes 2>/dev/null || echo "   (may already exist)"

echo "3️⃣ Setting JWT_REFRESH_SECRET..."
echo "$JWT_REFRESH_SECRET" | vercel env add JWT_REFRESH_SECRET production --yes 2>/dev/null || echo "   (may already exist)"

echo "4️⃣ Setting OPENAI_API_KEY..."
echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production --yes 2>/dev/null || echo "   (may already exist)"

echo ""
echo "⚠️  DATABASE_URL Setup Required"
echo ""
echo "I need your PRODUCTION database URL."
echo ""
echo "Options:"
echo "  A) Use the same local database (NOT recommended for production)"
echo "  B) Enter your production database URL"
echo "  C) Skip for now and set manually later"
echo ""
read -p "Choose option (A/B/C): " db_option

case $db_option in
  [Aa])
    # Build DATABASE_URL from local config
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo "$DATABASE_URL" | vercel env add DATABASE_URL production --yes
    echo "✓ Set DATABASE_URL to local database"
    ;;
  [Bb])
    read -p "Enter production DATABASE_URL: " prod_db_url
    echo "$prod_db_url" | vercel env add DATABASE_URL production --yes
    echo "✓ Set DATABASE_URL to production database"
    ;;
  [Cc])
    echo "⚠️  Skipped DATABASE_URL - you'll need to set it manually"
    ;;
  *)
    echo "❌ Invalid option"
    exit 1
    ;;
esac

echo ""
echo "Setting up FRONTEND environment variables..."
echo ""

cd frontend

echo "5️⃣ Setting NEXT_PUBLIC_API_URL..."
echo "https://www.muse.shopping/api/v1" | vercel env add NEXT_PUBLIC_API_URL production --yes 2>/dev/null || echo "   (may already exist)"

cd ..

echo ""
echo "=========================================="
echo "✅ ENVIRONMENT VARIABLES SET!"
echo "=========================================="
echo ""
echo "Variables set:"
echo "  ✓ NODE_ENV=production"
echo "  ✓ JWT_SECRET"
echo "  ✓ JWT_REFRESH_SECRET"
echo "  ✓ OPENAI_API_KEY"
if [ "$db_option" != "C" ] && [ "$db_option" != "c" ]; then
  echo "  ✓ DATABASE_URL"
fi
echo "  ✓ NEXT_PUBLIC_API_URL"
echo ""
echo "Next step: Redeploy both projects"
echo ""
echo "Run:"
echo "  vercel --prod              # Redeploy backend"
echo "  cd frontend && vercel --prod   # Redeploy frontend"
echo ""
