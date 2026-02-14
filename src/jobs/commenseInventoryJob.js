/**
 * The Commense Inventory Scraping Job
 * Run this to scrape The Commense products once
 */

const commenseInventoryService = require('../services/commenseInventoryService');
const commenseIntegrationService = require('../services/commenseIntegrationService');
const logger = require('../config/logger');

async function runCommenseInventoryJob() {
  logger.info('[Commense Job] Starting inventory scrape job');

  try {
    // Step 1: Scrape The Commense
    const scrapeResult = await commenseInventoryService.scrapeInventory();

    if (!scrapeResult.success) {
      logger.error('[Commense Job] Scrape failed:', scrapeResult.error);
      return {
        success: false,
        error: scrapeResult.error
      };
    }

    logger.info(`[Commense Job] Scrape completed. Products: ${scrapeResult.stats.totalProducts}`);

    // Step 2: Sync to items table
    logger.info('[Commense Job] Syncing products to items table');
    const syncResult = await commenseIntegrationService.syncCommenseToItems();

    logger.info(`[Commense Job] Sync completed. Items created: ${syncResult.itemsCreated}`);

    return {
      success: true,
      scrapeStats: scrapeResult.stats,
      syncStats: syncResult
    };

  } catch (error) {
    logger.error('[Commense Job] Job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// If run directly
if (require.main === module) {
  runCommenseInventoryJob()
    .then(result => {
      console.log('Job completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}

module.exports = runCommenseInventoryJob;
