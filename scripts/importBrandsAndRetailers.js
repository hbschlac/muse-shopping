/**
 * Import Brands and Retailers Script
 * Imports all brands and retailers from CSV files in ~/Documents/Muse Shopping
 */

require('dotenv').config();
const path = require('path');
const os = require('os');
const BrandImportService = require('../src/services/brandImportService');
const logger = require('../src/utils/logger');

async function main() {
  const dataDir = path.join(os.homedir(), 'Documents', 'Muse Shopping');

  logger.info('===================================');
  logger.info('  Muse Brand & Retailer Import');
  logger.info('===================================\n');

  try {
    // Step 1: Import Retailers
    logger.info('Step 1: Importing retailers...');
    const retailerFile = path.join(dataDir, 'retailer_integration_plan.csv');
    const retailerResults = await BrandImportService.importRetailers(retailerFile);

    logger.info(`Retailers imported:`);
    logger.info(`  - Inserted: ${retailerResults.inserted}`);
    logger.info(`  - Updated: ${retailerResults.updated}`);
    logger.info(`  - Failed: ${retailerResults.failed}`);
    logger.info(`  - Total: ${retailerResults.total}\n`);

    // Step 2: Import Brands (all phases)
    logger.info('Step 2: Importing brands (all phases)...');
    const brandResults = await BrandImportService.importAllBrands(dataDir);

    logger.info('\nBrand import results by phase:');
    for (const [phase, results] of Object.entries(brandResults)) {
      logger.info(`  ${phase}:`);
      logger.info(`    - Inserted: ${results.inserted}`);
      logger.info(`    - Updated: ${results.updated}`);
      logger.info(`    - Failed: ${results.failed}`);
      logger.info(`    - Total: ${results.total}`);
    }

    // Step 3: Show final statistics
    logger.info('\nStep 3: Final statistics...');
    const stats = await BrandImportService.getImportStats();

    logger.info('\n===================================');
    logger.info('  Import Complete!');
    logger.info('===================================');
    logger.info(`\nRetailers:`);
    logger.info(`  - Total: ${stats.total_retailers}`);
    logger.info(`  - P0 (Critical): ${stats.p0_retailers}`);
    logger.info(`  - P1 (High): ${stats.p1_retailers}`);

    logger.info(`\nBrands:`);
    logger.info(`  - Total: ${stats.total_brands}`);
    logger.info(`  - Top 100: ${stats.top100_brands}`);
    logger.info(`  - Top 300: ${stats.top300_brands}`);
    logger.info(`  - Top 1000: ${stats.top1000_brands}`);
    logger.info(`  - Long tail: ${stats.longtail_brands}`);

    logger.info('\n✅ All data imported successfully!');

    process.exit(0);
  } catch (error) {
    logger.error('Import failed:', error);
    process.exit(1);
  }
}

main();
