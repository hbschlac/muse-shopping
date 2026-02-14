/**
 * Nordstrom Inventory Scraping Job
 * Runs scheduled scrapes of Nordstrom inventory for academic research
 *
 * Usage:
 *   Manual run: node src/jobs/nordstromInventoryJob.js
 *   Scheduled: Set up cron job or use scheduler
 */

const nordstromInventoryService = require('../services/nordstromInventoryService');
const logger = require('../config/logger');

async function runInventoryScrape() {
  logger.info('=== Nordstrom Inventory Scrape Job Starting ===');
  const startTime = Date.now();

  try {
    const result = await nordstromInventoryService.scrapeInventory();

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (result.success) {
      logger.info(`=== Nordstrom Inventory Scrape Completed ===`);
      logger.info(`Duration: ${duration}s`);
      logger.info(`Products: ${result.stats.totalProducts}`);
      logger.info(`Errors: ${result.stats.errors}`);

      // Get updated stats
      const stats = await nordstromInventoryService.getInventoryStats();
      logger.info('Current Inventory:', stats);

    } else {
      logger.error(`=== Nordstrom Inventory Scrape Failed ===`);
      logger.error(`Error: ${result.error}`);
      logger.error(`Duration: ${duration}s`);
    }

    return result;

  } catch (error) {
    logger.error('=== Nordstrom Inventory Scrape Job Error ===', error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  runInventoryScrape()
    .then(() => {
      logger.info('Job completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Job failed:', error);
      process.exit(1);
    });
}

module.exports = { runInventoryScrape };
