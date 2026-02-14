#!/bin/bash

# Nordstrom Research System Setup Script
# This script sets up the Nordstrom inventory tracking system for academic research

set -e

echo "=================================================="
echo "  Nordstrom Inventory Research System Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Legal & Ethical Compliance Warning
echo -e "${YELLOW}⚠️  IMPORTANT: Legal & Ethical Compliance${NC}"
echo ""
echo "Before proceeding, you MUST:"
echo "  1. Review Nordstrom's Terms of Service"
echo "  2. Check Nordstrom's robots.txt"
echo "  3. Consider requesting permission from Nordstrom"
echo "  4. Ensure compliance with your institution's research ethics"
echo "  5. Understand that you are responsible for legal compliance"
echo ""
read -p "Have you reviewed and understood these requirements? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Setup cancelled. Please review compliance requirements first.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Compliance acknowledged${NC}"
echo ""

# Step 2: Check dependencies
echo "Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Warning: psql not found. Make sure PostgreSQL is installed.${NC}"
fi

echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

# Step 3: Check if database is accessible
echo "Checking database connection..."

if [ -f .env ]; then
    source .env
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Try to connect to database
if psql -d "$DB_NAME" -U "$DB_USER" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection OK${NC}"
else
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo "Please check your database credentials in .env"
    exit 1
fi

echo ""

# Step 4: Run migration
echo "Running database migration..."

if [ -f migrations/069_create_nordstrom_inventory.sql ]; then
    psql -d "$DB_NAME" -U "$DB_USER" -f migrations/069_create_nordstrom_inventory.sql > /dev/null 2>&1
    echo -e "${GREEN}✓ Migration completed${NC}"
else
    echo -e "${RED}Error: Migration file not found${NC}"
    exit 1
fi

echo ""

# Step 5: Verify tables were created
echo "Verifying tables..."

TABLES=$(psql -d "$DB_NAME" -U "$DB_USER" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'nordstrom_%';")

if [ "$TABLES" -ge 5 ]; then
    echo -e "${GREEN}✓ Tables created successfully${NC}"
else
    echo -e "${YELLOW}Warning: Expected 5 tables, found $TABLES${NC}"
fi

echo ""

# Step 6: Installation summary
echo "=================================================="
echo "  Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Test with a single scrape:"
echo -e "   ${GREEN}npm run nordstrom:scrape${NC}"
echo ""
echo "2. Check the data:"
echo -e "   ${GREEN}psql -d $DB_NAME -c 'SELECT COUNT(*) FROM nordstrom_products;'${NC}"
echo ""
echo "3. Query via API (start server first):"
echo -e "   ${GREEN}curl http://localhost:3000/api/v1/nordstrom/stats${NC}"
echo ""
echo "4. Start automated 24-hour scheduler:"
echo -e "   ${GREEN}npm run nordstrom:scheduler${NC}"
echo ""
echo "5. Read full documentation:"
echo -e "   ${GREEN}cat NORDSTROM_INVENTORY_SYSTEM.md${NC}"
echo ""
echo "=================================================="
echo ""
echo -e "${YELLOW}Remember: Use this system responsibly and ethically!${NC}"
echo ""
