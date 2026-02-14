#!/bin/bash

# Post-Migration Setup Script
# Run this after the migration completes at 6pm PST
# This script adds recommended environment variables to .env

echo "================================================"
echo "Post-Migration Setup - Latency Optimizations"
echo "================================================"
echo ""

ENV_FILE=".env"
BACKUP_FILE=".env.backup-$(date +%Y%m%d-%H%M%S)"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found!"
    echo "Please create .env file first."
    exit 1
fi

# Create backup
echo "Creating backup: $BACKUP_FILE"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "✓ Backup created"
echo ""

# Environment variables to add
read -r -d '' NEW_VARS << 'EOF'

# ================================================
# Latency Optimization Settings
# Added: $(date)
# ================================================

# Database Performance
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_MAX_SERVERLESS=2
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=20000

# Cache Configuration
PERSONALIZATION_CACHE_SIZE=1000
PERSONALIZATION_CACHE_TTL=300000
ITEM_CACHE_SIZE=500
ITEM_CACHE_TTL=180000

# Performance Monitoring
SLOW_REQUEST_THRESHOLD_MS=2000
CRITICAL_SLOW_THRESHOLD_MS=5000

EOF

# Check if variables already exist
if grep -q "DB_POOL_MIN" "$ENV_FILE"; then
    echo "⚠️  Some optimization variables already exist in .env"
    read -p "Do you want to update them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env update. Your existing values will be preserved."
        exit 0
    fi

    # Remove old optimization section if it exists
    sed -i.tmp '/# Latency Optimization Settings/,/^$/d' "$ENV_FILE"
    rm -f "${ENV_FILE}.tmp"
fi

# Add new variables
echo "$NEW_VARS" >> "$ENV_FILE"

echo "✓ Environment variables added to .env"
echo ""
echo "Added variables:"
echo "  - DB_POOL_MIN=5"
echo "  - DB_POOL_MAX=20"
echo "  - DB_POOL_MAX_SERVERLESS=2"
echo "  - DB_STATEMENT_TIMEOUT=30000"
echo "  - DB_QUERY_TIMEOUT=20000"
echo "  - PERSONALIZATION_CACHE_SIZE=1000"
echo "  - PERSONALIZATION_CACHE_TTL=300000"
echo "  - ITEM_CACHE_SIZE=500"
echo "  - ITEM_CACHE_TTL=180000"
echo "  - SLOW_REQUEST_THRESHOLD_MS=2000"
echo "  - CRITICAL_SLOW_THRESHOLD_MS=5000"
echo ""
echo "================================================"
echo "Next step: Restart your backend server"
echo "================================================"
echo ""
echo "Run: npm run dev"
echo ""
echo "Then verify optimizations:"
echo "  curl http://localhost:3000/api/v1/health/detailed"
echo ""
