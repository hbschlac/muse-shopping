#!/bin/bash

# Latency Optimization Migration Runner
# Runs migration 067 to add performance indexes
# Scheduled for 6pm PST

echo "================================================"
echo "Muse Shopping - Latency Optimization Migration"
echo "Migration: 067_add_performance_indexes.sql"
echo "Started at: $(date)"
echo "================================================"

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "WARNING: .env file not found!"
fi

# Check database connection
echo ""
echo "Checking database connection..."
if [ -n "$DATABASE_URL" ]; then
    echo "Using DATABASE_URL connection string"
    DB_CONNECTION="$DATABASE_URL"
elif [ -n "$DB_HOST" ]; then
    echo "Using individual database parameters"
    DB_CONNECTION="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
else
    echo "ERROR: No database connection parameters found!"
    exit 1
fi

# Test connection
echo "Testing connection..."
psql "$DB_CONNECTION" -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed!"
    echo "Please check your database credentials and ensure PostgreSQL is running."
    exit 1
fi

# Check if migration has already been run
echo ""
echo "Checking if migration has already been applied..."
MIGRATION_CHECK=$(psql "$DB_CONNECTION" -t -c "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_items_brand_id_active');" 2>/dev/null | tr -d '[:space:]')

if [ "$MIGRATION_CHECK" = "t" ]; then
    echo "⚠️  Migration appears to have already been applied (index exists)"
    read -p "Do you want to run it again anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled."
        exit 0
    fi
fi

# Run the migration
echo ""
echo "Running migration 067_add_performance_indexes.sql..."
echo "This will:"
echo "  - Create pg_trgm extension for full-text search"
echo "  - Add 30+ performance indexes"
echo "  - Run ANALYZE on all critical tables"
echo ""

psql "$DB_CONNECTION" -f migrations/067_add_performance_indexes.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✓ Migration completed successfully!"
    echo "================================================"
    echo ""
    echo "Indexes created:"
    psql "$DB_CONNECTION" -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' ORDER BY tablename, indexname;" | head -20
    echo "... and more"
    echo ""
    echo "Next steps:"
    echo "1. Update .env with recommended performance settings"
    echo "2. Restart the backend server: npm run dev"
    echo "3. Monitor cache stats: curl http://localhost:3000/api/v1/admin/cache/stats"
    echo ""
    echo "Completed at: $(date)"
else
    echo ""
    echo "================================================"
    echo "✗ Migration failed!"
    echo "================================================"
    echo "Please check the error messages above."
    exit 1
fi
