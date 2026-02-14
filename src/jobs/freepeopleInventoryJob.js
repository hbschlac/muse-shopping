/**
 * Free People Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const freepeopleInventoryService = require('../services/freepeopleInventoryService');
const logger = require('../config/logger');

async function runFreepeoplesScrape() {
  logger.info('[FreePeople Job] Starting scrape job');

  try {
    const result = await freepeopleInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[FreePeople Job] Scrape successful!`);
      logger.info(`[FreePeople Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[FreePeople Job] Duration: ${result.duration}s`);
      logger.info(`[FreePeople Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[FreePeople Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[FreePeople Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[FreePeople Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runFreepeoplesScrape();
}

module.exports = { runFreepeoplesScrape };
