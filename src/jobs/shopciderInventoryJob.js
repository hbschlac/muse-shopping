/**
 * Shop Cider Inventory Scraping Job
 * Run this to scrape Shop Cider products once
 */

const shopciderInventoryService = require('../services/shopciderInventoryService');
const shopciderIntegrationService = require('../services/shopciderIntegrationService');
const logger = require('../config/logger');

async function runShopciderInventoryJob() {
  logger.info('[Shopcider Job] Starting inventory scrape job');

  try {
    // Step 1: Scrape Shop Cider
    const scrapeResult = await shopciderInventoryService.scrapeInventory();

    if (!scrapeResult.success) {
      logger.error('[Shopcider Job] Scrape failed:', scrapeResult.error);
      return {
        success: false,
        error: scrapeResult.error
      };
    }

    logger.info(`[Shopcider Job] Scrape completed. Products: ${scrapeResult.stats.totalProducts}`);

    // Step 2: Sync to items table
    logger.info('[Shopcider Job] Syncing products to items table');
    const syncResult = await shopciderIntegrationService.syncShopciderToItems();

    logger.info(`[Shopcider Job] Sync completed. Items created: ${syncResult.itemsCreated}`);

    return {
      success: true,
      scrapeStats: scrapeResult.stats,
      syncStats: syncResult
    };

  } catch (error) {
    logger.error('[Shopcider Job] Job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// If run directly
if (require.main === module) {
  runShopciderInventoryJob()
    .then(result => {
      console.log('Job completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}

module.exports = runShopciderInventoryJob;
