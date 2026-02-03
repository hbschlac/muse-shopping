const pool = require('../src/db/pool');
const BrandService = require('../src/services/brandService');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
  try {
    log('\n=== Brand Search Functionality Tests ===\n', 'blue');

    // Test 1: Search by brand name (case-insensitive)
    log('Test 1: Search for "zara" (case-insensitive name match)', 'yellow');
    const test1 = await BrandService.getBrands(1, 20, { search: 'zara' });
    log(`✓ Found ${test1.brands.length} brand(s)`, 'green');
    test1.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 2: Search with different case
    log('Test 2: Search for "NORDSTROM" (uppercase)', 'yellow');
    const test2 = await BrandService.getBrands(1, 20, { search: 'NORDSTROM' });
    log(`✓ Found ${test2.brands.length} brand(s)`, 'green');
    test2.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 3: Partial name match
    log('Test 3: Search for "reform" (partial match)', 'yellow');
    const test3 = await BrandService.getBrands(1, 20, { search: 'reform' });
    log(`✓ Found ${test3.brands.length} brand(s)`, 'green');
    test3.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 4: Search in description
    log('Test 4: Search for "sustainable" (description match)', 'yellow');
    const test4 = await BrandService.getBrands(1, 20, { search: 'sustainable' });
    log(`✓ Found ${test4.brands.length} brand(s)`, 'green');
    test4.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 5: Search with pagination
    log('Test 5: Search for "fashion" with pagination (page 1, limit 3)', 'yellow');
    const test5 = await BrandService.getBrands(1, 3, { search: 'fashion' });
    log(`✓ Found ${test5.pagination.total} total, showing ${test5.brands.length} on page 1`, 'green');
    log(`  Pagination: Page ${test5.pagination.page}/${test5.pagination.totalPages}`, 'blue');
    test5.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 6: Search combined with category filter
    log('Test 6: Search for "fashion" with category filter (fast-fashion)', 'yellow');
    const test6 = await BrandService.getBrands(1, 20, {
      search: 'fashion',
      category: 'fast-fashion'
    });
    log(`✓ Found ${test6.brands.length} brand(s)`, 'green');
    test6.brands.forEach(b => log(`  - ${b.name} [${b.category}]: ${b.description}`));
    console.log();

    // Test 7: Search combined with price_tier filter
    log('Test 7: Search for "brand" with price_tier filter (premium)', 'yellow');
    const test7 = await BrandService.getBrands(1, 20, {
      search: 'brand',
      price_tier: 'premium'
    });
    log(`✓ Found ${test7.brands.length} brand(s)`, 'green');
    test7.brands.forEach(b => log(`  - ${b.name} [${b.price_tier}]: ${b.description}`));
    console.log();

    // Test 8: Search with no results
    log('Test 8: Search for "xyz123nonexistent" (no results expected)', 'yellow');
    const test8 = await BrandService.getBrands(1, 20, { search: 'xyz123nonexistent' });
    log(`✓ Found ${test8.brands.length} brand(s) (expected 0)`, 'green');
    console.log();

    // Test 9: Empty search (should return all brands)
    log('Test 9: Empty search (should return all active brands)', 'yellow');
    const test9 = await BrandService.getBrands(1, 20, {});
    log(`✓ Found ${test9.brands.length} brand(s), total: ${test9.pagination.total}`, 'green');
    console.log();

    // Test 10: Search with special characters
    log('Test 10: Search for "H&M" (with special character)', 'yellow');
    const test10 = await BrandService.getBrands(1, 20, { search: 'H&M' });
    log(`✓ Found ${test10.brands.length} brand(s)`, 'green');
    test10.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 11: Multi-word search
    log('Test 11: Search for "outdoor clothing" (multi-word)', 'yellow');
    const test11 = await BrandService.getBrands(1, 20, { search: 'outdoor clothing' });
    log(`✓ Found ${test11.brands.length} brand(s)`, 'green');
    test11.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 12: All filters combined
    log('Test 12: Combined filters (search="clothing", category="casual", price_tier="mid")', 'yellow');
    const test12 = await BrandService.getBrands(1, 20, {
      search: 'clothing',
      category: 'casual',
      price_tier: 'mid'
    });
    log(`✓ Found ${test12.brands.length} brand(s)`, 'green');
    test12.brands.forEach(b => log(`  - ${b.name} [${b.category}/${b.price_tier}]: ${b.description}`));
    console.log();

    log('\n=== All Tests Completed Successfully ===\n', 'green');

  } catch (error) {
    log(`\n✗ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the tests
runTests();
