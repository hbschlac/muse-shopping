/**
 * Product Catalog Batch Job (JAR)
 *
 * This is the scheduled job that runs periodically to import
 * product catalogs from affiliate networks.
 *
 * Schedule Options:
 * - Full catalog import: Every 24 hours (e.g., 2 AM daily)
 * - Price updates: Every 6-12 hours
 * - Cache cleanup: Every hour
 *
 * Usage:
 *   node src/jobs/productCatalogBatchJob.js --mode=full
 *   node src/jobs/productCatalogBatchJob.js --mode=price
 *   node src/jobs/productCatalogBatchJob.js --mode=cleanup
 */

const productCatalogBatchService = require('../services/productCatalogBatchService');
const pool = require('../db/pool');

// Store ID to Affiliate Network mapping
const STORE_AFFILIATE_MAPPING = {
  1: 'cj',          // Old Navy -> CJ Affiliate
  2: 'rakuten',     // Nordstrom -> Rakuten
  3: 'rakuten',     // Nordstrom Rack -> Rakuten
  4: 'rakuten',     // Target -> Rakuten (also has direct API)
  5: 'impact',      // Walmart -> Impact (also has direct API)
  6: 'amazon',      // Amazon -> Amazon Associates
  7: 'rakuten',     // Zara -> Rakuten
  8: 'rakuten',     // H&M -> Rakuten
  9: 'cj',          // Gap -> CJ Affiliate
  10: 'rakuten',    // Macy's -> Rakuten
  11: 'rakuten',    // Bloomingdale's -> Rakuten
  12: 'rakuten',    // Saks -> Rakuten
  13: 'rakuten',    // ASOS -> Rakuten
  14: 'cj',         // Forever 21 -> CJ Affiliate
  15: 'cj',         // Urban Outfitters -> CJ Affiliate
  16: 'shareasale', // Free People -> ShareASale
  17: 'shareasale', // Lulus -> ShareASale
  18: 'cj',         // Revolve -> CJ Affiliate
  19: 'impact',     // SHEIN -> Impact
  20: 'manual',     // Cider -> No API (manual)
};

class ProductCatalogBatchJob {
  /**
   * Run full catalog import for all stores
   */
  async runFullImport() {
    console.log('========================================');
    console.log('BATCH JOB: Full Catalog Import');
    console.log('========================================');
    console.log(`Started: ${new Date().toISOString()}`);

    const startTime = Date.now();
    const results = [];

    // Get all stores that have affiliate integration
    const stores = await this._getStoresWithAffiliates();

    console.log(`Found ${stores.length} stores to import`);

    for (const store of stores) {
      try {
        console.log(`\n--- Importing ${store.display_name} (ID: ${store.id}) ---`);

        const affiliateNetwork = STORE_AFFILIATE_MAPPING[store.id];

        if (affiliateNetwork === 'manual') {
          console.log(`Skipping ${store.display_name} (manual integration)`);
          continue;
        }

        const result = await productCatalogBatchService.importStoreCatalog(
          store.id,
          affiliateNetwork
        );

        results.push({
          store: store.display_name,
          success: true,
          stats: result.stats,
        });

        console.log(`✓ ${store.display_name}: ${result.stats.created} created, ${result.stats.updated} updated`);
      } catch (error) {
        console.error(`✗ ${store.display_name} failed:`, error.message);
        results.push({
          store: store.display_name,
          success: false,
          error: error.message,
        });
      }
    }

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    console.log('\n========================================');
    console.log('BATCH JOB COMPLETE');
    console.log('========================================');
    console.log(`Duration: ${durationSeconds}s`);
    console.log(`Stores processed: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    console.log('========================================\n');

    return results;
  }

  /**
   * Run price update for all stores (faster than full import)
   */
  async runPriceUpdate() {
    console.log('========================================');
    console.log('BATCH JOB: Price Update');
    console.log('========================================');
    console.log(`Started: ${new Date().toISOString()}`);

    const startTime = Date.now();
    const results = [];

    const stores = await this._getStoresWithAffiliates();

    console.log(`Updating prices for ${stores.length} stores`);

    for (const store of stores) {
      try {
        const affiliateNetwork = STORE_AFFILIATE_MAPPING[store.id];

        if (affiliateNetwork === 'manual') {
          continue;
        }

        const result = await productCatalogBatchService.updateStorePrices(
          store.id,
          affiliateNetwork
        );

        results.push({
          store: store.display_name,
          success: true,
          stats: result.stats,
        });

        console.log(`✓ ${store.display_name}: ${result.stats.updated} prices updated`);
      } catch (error) {
        console.error(`✗ ${store.display_name} failed:`, error.message);
        results.push({
          store: store.display_name,
          success: false,
          error: error.message,
        });
      }
    }

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    console.log('\n========================================');
    console.log('PRICE UPDATE COMPLETE');
    console.log(`Duration: ${durationSeconds}s`);
    console.log('========================================\n');

    return results;
  }

  /**
   * Clean up expired cache entries
   */
  async runCacheCleanup() {
    console.log('========================================');
    console.log('BATCH JOB: Cache Cleanup');
    console.log('========================================');

    const deleted = await productCatalogBatchService.cleanupExpiredCache();

    console.log(`✓ Deleted ${deleted} expired cache entries`);
    console.log('========================================\n');

    return { deleted };
  }

  /**
   * Get stores that have affiliate integrations
   */
  async _getStoresWithAffiliates() {
    const query = `
      SELECT id, display_name, integration_type
      FROM stores
      WHERE integration_type IN ('oauth', 'redirect', 'api')
      ORDER BY id
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}

// ==========================================
// CLI Execution
// ==========================================

if (require.main === module) {
  const job = new ProductCatalogBatchJob();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'full';

  console.log(`Running batch job in mode: ${mode}\n`);

  (async () => {
    try {
      switch (mode) {
        case 'full':
          await job.runFullImport();
          break;
        case 'price':
          await job.runPriceUpdate();
          break;
        case 'cleanup':
          await job.runCacheCleanup();
          break;
        default:
          console.error(`Unknown mode: ${mode}`);
          console.log('Valid modes: full, price, cleanup');
          process.exit(1);
      }

      console.log('Job completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Job failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = new ProductCatalogBatchJob();
