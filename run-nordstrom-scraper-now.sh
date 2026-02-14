#!/bin/bash

echo "=================================================="
echo "  Running Nordstrom Inventory Scraper"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT LEGAL NOTICE:"
echo ""
echo "This scraper will access Nordstrom.com and collect product data."
echo "By running this, you confirm that:"
echo ""
echo "  1. You have reviewed Nordstrom's Terms of Service"
echo "  2. You have checked Nordstrom's robots.txt"
echo "  3. This is for legitimate academic research"
echo "  4. You accept responsibility for compliance"
echo ""
read -p "Do you acknowledge and accept these terms? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Scraper cancelled."
    exit 1
fi

echo ""
echo "Starting scraper..."
echo "This may take 15-30 minutes depending on the number of products."
echo ""

npm run nordstrom:scrape
