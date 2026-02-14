/**
 * Target Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const targetInventoryService = require('../services/targetInventoryService');
const logger = require('../config/logger');

async function runTargetScrape() {
  logger.info('[Target Job] Starting scrape job');

  try {
    const result = await targetInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Target Job] Scrape successful!`);
      logger.info(`[Target Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Target Job] Duration: ${result.duration}s`);
      logger.info(`[Target Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Target Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Target Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Target Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTargetScrape();
}

module.exports = { runTargetScrape };
