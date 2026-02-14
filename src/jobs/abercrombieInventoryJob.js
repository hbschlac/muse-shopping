/**
 * Abercrombie Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const abercrombieInventoryService = require('../services/abercrombieInventoryService');
const logger = require('../config/logger');

async function runAbercrombieScrape() {
  logger.info('[Abercrombie Job] Starting scrape job');

  try {
    const result = await abercrombieInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Abercrombie Job] Scrape successful!`);
      logger.info(`[Abercrombie Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Abercrombie Job] Duration: ${result.duration}s`);
      logger.info(`[Abercrombie Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Abercrombie Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Abercrombie Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Abercrombie Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAbercrombieScrape();
}

module.exports = { runAbercrombieScrape };
