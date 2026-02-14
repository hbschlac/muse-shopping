/**
 * Dynamite Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const dynamiteInventoryService = require('../services/dynamiteInventoryService');
const logger = require('../config/logger');

async function runDynamiteScrape() {
  logger.info('[Dynamite Job] Starting scrape job');

  try {
    const result = await dynamiteInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Dynamite Job] Scrape successful!`);
      logger.info(`[Dynamite Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Dynamite Job] Duration: ${result.duration}s`);
      logger.info(`[Dynamite Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Dynamite Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Dynamite Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Dynamite Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runDynamiteScrape();
}

module.exports = { runDynamiteScrape };
