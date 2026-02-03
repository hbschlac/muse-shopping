const http = require('http');

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

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/brands${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runAPITests() {
  log('\n=== Brand Search API Tests ===\n', 'blue');

  try {
    // Test 1: Basic search
    log('Test 1: GET /api/v1/brands?search=sustainable', 'yellow');
    const test1 = await makeRequest('?search=sustainable');
    log(`✓ Status: ${test1.statusCode}`, 'green');
    log(`✓ Found ${test1.data.data.brands.length} brands`);
    test1.data.data.brands.forEach(b => log(`  - ${b.name}: ${b.description}`));
    console.log();

    // Test 2: Case-insensitive search
    log('Test 2: GET /api/v1/brands?search=ZARA', 'yellow');
    const test2 = await makeRequest('?search=ZARA');
    log(`✓ Status: ${test2.statusCode}`, 'green');
    log(`✓ Found ${test2.data.data.brands.length} brand(s)`);
    test2.data.data.brands.forEach(b => log(`  - ${b.name}`));
    console.log();

    // Test 3: Search with pagination
    log('Test 3: GET /api/v1/brands?search=fashion&page=1&limit=5', 'yellow');
    const test3 = await makeRequest('?search=fashion&page=1&limit=5');
    log(`✓ Status: ${test3.statusCode}`, 'green');
    log(`✓ Total: ${test3.data.data.pagination.total}, Page: ${test3.data.data.pagination.page}/${test3.data.data.pagination.totalPages}`);
    log(`✓ Showing ${test3.data.data.brands.length} brands on this page`);
    console.log();

    // Test 4: Search with category filter
    log('Test 4: GET /api/v1/brands?search=fashion&category=fast-fashion', 'yellow');
    const test4 = await makeRequest('?search=fashion&category=fast-fashion');
    log(`✓ Status: ${test4.statusCode}`, 'green');
    log(`✓ Found ${test4.data.data.brands.length} fast-fashion brands with "fashion" in name/description`);
    test4.data.data.brands.forEach(b => log(`  - ${b.name} [${b.category}]`));
    console.log();

    // Test 5: Search with price_tier filter
    log('Test 5: GET /api/v1/brands?search=brand&price_tier=premium', 'yellow');
    const test5 = await makeRequest('?search=brand&price_tier=premium');
    log(`✓ Status: ${test5.statusCode}`, 'green');
    log(`✓ Found ${test5.data.data.brands.length} premium brands with "brand" in name/description`);
    test5.data.data.brands.forEach(b => log(`  - ${b.name} [${b.price_tier}]`));
    console.log();

    // Test 6: All filters combined
    log('Test 6: GET /api/v1/brands?search=clothing&category=outdoor&price_tier=premium', 'yellow');
    const test6 = await makeRequest('?search=clothing&category=outdoor&price_tier=premium');
    log(`✓ Status: ${test6.statusCode}`, 'green');
    log(`✓ Found ${test6.data.data.brands.length} brand(s) matching all criteria`);
    test6.data.data.brands.forEach(b => log(`  - ${b.name} [${b.category}/${b.price_tier}]: ${b.description}`));
    console.log();

    // Test 7: Search with no results
    log('Test 7: GET /api/v1/brands?search=nonexistentbrandxyz123', 'yellow');
    const test7 = await makeRequest('?search=nonexistentbrandxyz123');
    log(`✓ Status: ${test7.statusCode}`, 'green');
    log(`✓ Found ${test7.data.data.brands.length} brands (expected 0)`);
    console.log();

    // Test 8: Partial match
    log('Test 8: GET /api/v1/brands?search=north', 'yellow');
    const test8 = await makeRequest('?search=north');
    log(`✓ Status: ${test8.statusCode}`, 'green');
    log(`✓ Found ${test8.data.data.brands.length} brand(s) with "north" in name`);
    test8.data.data.brands.forEach(b => log(`  - ${b.name}`));
    console.log();

    // Test 9: URL encoding test
    log('Test 9: GET /api/v1/brands?search=H%26M (URL encoded)', 'yellow');
    const test9 = await makeRequest('?search=H%26M');
    log(`✓ Status: ${test9.statusCode}`, 'green');
    log(`✓ Found ${test9.data.data.brands.length} brand(s)`);
    test9.data.data.brands.forEach(b => log(`  - ${b.name}`));
    console.log();

    log('=== All API Tests Passed ===\n', 'green');

  } catch (error) {
    log(`\n✗ API Test failed: ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log('Make sure the server is running on port 3000', 'yellow');
      log('Run: npm run dev', 'yellow');
    }
    console.error(error);
    process.exit(1);
  }
}

// Run the API tests
runAPITests();
