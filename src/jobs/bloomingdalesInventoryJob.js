/**
 * Bloomingdales Inventory Scraping Job
 * Single-run job for manual execution
 *
 * Usage: npm run bloomingdales:scrape
 */

const bloomingdalesInventoryService = require('../services/bloomingdalesInventoryService');
const logger = require('../config/logger');

async function runBloomingdalesInventoryScrape() {
  logger.info('==========================================');
  logger.info('Bloomingdales Inventory Scrape - Starting');
  logger.info('==========================================');

  try {
    const stats = await bloomingdalesInventoryService.scrapeInventory();

    logger.info('==========================================');
    logger.info('Bloomingdales Inventory Scrape - Complete');
    logger.info('==========================================');
    logger.info('Stats:', stats);

    process.exit(0);
  } catch (error) {
    logger.error('==========================================');
    logger.error('Bloomingdales Inventory Scrape - Failed');
    logger.error('==========================================');
    logger.error('Error:', error);

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBloomingdalesInventoryScrape();
}

module.exports = runBloomingdalesInventoryScrape;
