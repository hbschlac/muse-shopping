/**
 * Sunfere Inventory Scraping Job
 * Run this to scrape Sunfere products once
 */

const sunfereInventoryService = require('../services/sunfereInventoryService');
const sunfereIntegrationService = require('../services/sunfereIntegrationService');
const logger = require('../config/logger');

async function runSunfereInventoryJob() {
  logger.info('[Sunfere Job] Starting inventory scrape job');

  try {
    // Step 1: Scrape Sunfere
    const scrapeResult = await sunfereInventoryService.scrapeInventory();

    if (!scrapeResult.success) {
      logger.error('[Sunfere Job] Scrape failed:', scrapeResult.error);
      return {
        success: false,
        error: scrapeResult.error
      };
    }

    logger.info(`[Sunfere Job] Scrape completed. Products: ${scrapeResult.stats.totalProducts}`);

    // Step 2: Sync to items table
    logger.info('[Sunfere Job] Syncing products to items table');
    const syncResult = await sunfereIntegrationService.syncSunfereToItems();

    logger.info(`[Sunfere Job] Sync completed. Items created: ${syncResult.itemsCreated}`);

    return {
      success: true,
      scrapeStats: scrapeResult.stats,
      syncStats: syncResult
    };

  } catch (error) {
    logger.error('[Sunfere Job] Job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// If run directly
if (require.main === module) {
  runSunfereInventoryJob()
    .then(result => {
      console.log('Job completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}

module.exports = runSunfereInventoryJob;
