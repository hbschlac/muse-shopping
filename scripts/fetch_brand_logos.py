#!/usr/bin/env python3
"""
Brand Logo Fetcher
Fetches logos from Clearbit Logo API for brands in TARGET_BRANDS_1000.csv

Best Practices:
- Rate limiting to respect API limits
- Retry logic with exponential backoff
- File size validation
- Proper error handling and reporting
- Incremental updates (ONLY_MISSING mode)
"""

import os
import sys
import csv
from urllib.parse import urlparse
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
import time

# Configuration
INPUT_CSV = 'TARGET_BRANDS_1000.csv'
OUTPUT_CSV = 'TARGET_BRANDS_1000_with_logos.csv'
REPORT_CSV = 'brand_logo_report.csv'
LOGOS_DIR = 'frontend/public/logos/brands'

# Rate limiting & retry configuration
RATE_LIMIT_DELAY = 0.5  # seconds between requests
MAX_RETRIES = 3
RETRY_DELAY = 1  # initial retry delay in seconds
MAX_FILE_SIZE = 500 * 1024  # 500KB max logo size

# Environment flags
ONLY_MISSING = os.getenv('ONLY_MISSING', '0') == '1'
OVERWRITE = os.getenv('OVERWRITE', '0') == '1'

def ensure_directories():
    """Create necessary directories"""
    os.makedirs(LOGOS_DIR, exist_ok=True)
    print(f"✓ Ensured directory exists: {LOGOS_DIR}")

def sanitize_filename(brand_name):
    """Convert brand name to safe filename"""
    # Remove special characters and replace spaces with hyphens
    safe_name = brand_name.lower()
    safe_name = ''.join(c if c.isalnum() or c in (' ', '-') else '' for c in safe_name)
    safe_name = safe_name.replace(' ', '-')
    # Remove consecutive hyphens
    while '--' in safe_name:
        safe_name = safe_name.replace('--', '-')
    return safe_name.strip('-')

def get_logo_path(brand_name):
    """Get the file path for a brand's logo"""
    filename = f"{sanitize_filename(brand_name)}.png"
    return os.path.join(LOGOS_DIR, filename)

def logo_exists(brand_name):
    """Check if logo already exists"""
    return os.path.exists(get_logo_path(brand_name))

def fetch_logo(website, brand_name, retry_count=0):
    """
    Fetch logo from Clearbit Logo API with retry logic
    Returns: (success: bool, message: str)
    """
    try:
        # Parse domain from website
        if not website.startswith('http'):
            website = f'https://{website}'

        domain = urlparse(website).netloc or urlparse(website).path
        if not domain:
            return False, "Invalid domain"

        # Clearbit Logo API with size parameter for optimization
        # Request 128px size to reduce bandwidth and storage
        logo_url = f'https://logo.clearbit.com/{domain}?size=128'

        # Create request with user agent
        req = Request(logo_url, headers={'User-Agent': 'Mozilla/5.0'})

        with urlopen(req, timeout=10) as response:
            if response.status == 200:
                # Read logo data
                logo_data = response.read()

                # Validate file size
                if len(logo_data) > MAX_FILE_SIZE:
                    return False, f"File too large ({len(logo_data)} bytes)"

                # Validate it's actually an image (basic check)
                if not logo_data.startswith(b'\x89PNG') and not logo_data.startswith(b'\xff\xd8\xff'):
                    return False, "Invalid image format"

                # Save logo
                logo_path = get_logo_path(brand_name)
                with open(logo_path, 'wb') as f:
                    f.write(logo_data)

                return True, f"Success ({len(logo_data)} bytes)"
            else:
                return False, f"HTTP {response.status}"

    except HTTPError as e:
        # 404 is common and expected, don't retry
        if e.code == 404:
            return False, "Not found"

        # Retry on 5xx errors
        if e.code >= 500 and retry_count < MAX_RETRIES:
            time.sleep(RETRY_DELAY * (2 ** retry_count))  # exponential backoff
            return fetch_logo(website, brand_name, retry_count + 1)

        return False, f"HTTP {e.code}"

    except URLError as e:
        # Retry on network errors
        if retry_count < MAX_RETRIES:
            time.sleep(RETRY_DELAY * (2 ** retry_count))
            return fetch_logo(website, brand_name, retry_count + 1)
        return False, f"Network error: {str(e.reason)[:30]}"

    except Exception as e:
        return False, f"Error: {str(e)[:50]}"

def main():
    print("=" * 60)
    print("Brand Logo Fetcher")
    print("=" * 60)
    print(f"ONLY_MISSING: {ONLY_MISSING}")
    print(f"OVERWRITE: {OVERWRITE}")
    print()

    # Ensure directories exist
    ensure_directories()

    # Read input CSV
    if not os.path.exists(INPUT_CSV):
        print(f"❌ Error: {INPUT_CSV} not found")
        sys.exit(1)

    brands = []
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        brands = list(reader)

    total_brands = len(brands)
    print(f"📊 Total brands in CSV: {total_brands}")
    print()

    # Process brands
    results = []
    logos_found = 0
    logos_missing = 0
    skipped = 0

    for i, brand in enumerate(brands, 1):
        brand_name = brand.get('Brand Name', '').strip()
        website = brand.get('Website', '').strip()

        if not brand_name or not website:
            print(f"[{i}/{total_brands}] ⚠️  Skipping: Missing brand name or website")
            results.append({
                'Brand Name': brand_name,
                'Website': website,
                'Logo Status': 'SKIPPED',
                'Logo Path': '',
                'Message': 'Missing data'
            })
            skipped += 1
            continue

        existing = logo_exists(brand_name)
        logo_path = get_logo_path(brand_name)

        # Skip if ONLY_MISSING and logo exists
        if ONLY_MISSING and existing and not OVERWRITE:
            print(f"[{i}/{total_brands}] ⏭️  {brand_name}: Already has logo")
            results.append({
                'Brand Name': brand_name,
                'Website': website,
                'Logo Status': 'EXISTS',
                'Logo Path': logo_path,
                'Message': 'Already exists'
            })
            logos_found += 1
            skipped += 1
            continue

        # Fetch logo
        print(f"[{i}/{total_brands}] 🔍 {brand_name}...", end=' ')
        success, message = fetch_logo(website, brand_name)

        if success:
            print(f"✓ {message}")
            results.append({
                'Brand Name': brand_name,
                'Website': website,
                'Logo Status': 'FOUND',
                'Logo Path': logo_path,
                'Message': message
            })
            logos_found += 1
        else:
            print(f"✗ {message}")
            results.append({
                'Brand Name': brand_name,
                'Website': website,
                'Logo Status': 'MISSING',
                'Logo Path': '',
                'Message': message
            })
            logos_missing += 1

        # Rate limiting - be respectful to Clearbit API
        if i < total_brands and not existing:
            time.sleep(RATE_LIMIT_DELAY)

    # Write report CSV
    print()
    print("=" * 60)
    print("Writing reports...")

    with open(REPORT_CSV, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['Brand Name', 'Website', 'Logo Status', 'Logo Path', 'Message']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"✓ Report written to: {REPORT_CSV}")

    # Write updated CSV with logo paths
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        fieldnames = list(brands[0].keys()) + ['Logo Path', 'Logo Status']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for brand, result in zip(brands, results):
            row = brand.copy()
            row['Logo Path'] = result['Logo Path']
            row['Logo Status'] = result['Logo Status']
            writer.writerow(row)
    print(f"✓ Updated CSV written to: {OUTPUT_CSV}")

    # Final summary
    print()
    print("=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Total rows:          {total_brands}")
    print(f"Logos found:         {logos_found}")
    print(f"Logos missing:       {logos_missing}")
    print(f"Skipped:             {skipped}")
    print()
    print(f"Logo files location: {LOGOS_DIR}/")
    print(f"Updated CSV:         {OUTPUT_CSV}")
    print(f"Report CSV:          {REPORT_CSV}")
    print("=" * 60)

if __name__ == '__main__':
    main()
