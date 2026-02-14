/**
 * Urban Outfitters Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const urbanoutfittersInventoryService = require('../services/urbanoutfittersInventoryService');
const logger = require('../config/logger');

async function runUrbanOutfittersScrape() {
  logger.info('[Urban Outfitters Job] Starting scrape job');

  try {
    const result = await urbanoutfittersInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Urban Outfitters Job] Scrape successful!`);
      logger.info(`[Urban Outfitters Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Urban Outfitters Job] Duration: ${result.duration}s`);
      logger.info(`[Urban Outfitters Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Urban Outfitters Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Urban Outfitters Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Urban Outfitters Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runUrbanOutfittersScrape();
}

module.exports = { runUrbanOutfittersScrape };
