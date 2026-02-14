/**
 * Macys Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const macysInventoryService = require('../services/macysInventoryService');
const logger = require('../config/logger');

async function runMacysScrape() {
  logger.info('[Macys Job] Starting scrape job');

  try {
    const result = await macysInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Macys Job] Scrape successful!`);
      logger.info(`[Macys Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Macys Job] Duration: ${result.duration}s`);
      logger.info(`[Macys Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Macys Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Macys Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Macys Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMacysScrape();
}

module.exports = { runMacysScrape };
