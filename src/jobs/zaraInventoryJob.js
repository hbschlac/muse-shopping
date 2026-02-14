/**
 * Zara Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const zaraInventoryService = require('../services/zaraInventoryService');
const logger = require('../config/logger');

async function runZaraScrape() {
  logger.info('[Zara Job] Starting scrape job');

  try {
    const result = await zaraInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Zara Job] Scrape successful!`);
      logger.info(`[Zara Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Zara Job] Duration: ${result.duration}s`);
      logger.info(`[Zara Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Zara Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Zara Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Zara Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runZaraScrape();
}

module.exports = { runZaraScrape };
