/**
 * H&M Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const hmInventoryService = require('../services/hmInventoryService');
const logger = require('../config/logger');

async function runHMScrape() {
  logger.info('[H&M Job] Starting scrape job');

  try {
    const result = await hmInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[H&M Job] Scrape successful!`);
      logger.info(`[H&M Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[H&M Job] Duration: ${result.duration}s`);
      logger.info(`[H&M Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[H&M Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[H&M Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[H&M Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runHMScrape();
}

module.exports = { runHMScrape };
