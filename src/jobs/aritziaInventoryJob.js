/**
 * Aritzia Inventory Scraping Job
 * Runs the scraper once and exits
 * Can be triggered manually or via scheduler
 */

const aritziaInventoryService = require('../services/aritziaInventoryService');
const logger = require('../config/logger');

async function runAritziaScrape() {
  logger.info('[Aritzia Job] Starting scrape job');

  try {
    const result = await aritziaInventoryService.scrapeInventory();

    if (result.success) {
      logger.info(`[Aritzia Job] Scrape successful!`);
      logger.info(`[Aritzia Job] Products scraped: ${result.stats.totalProducts}`);
      logger.info(`[Aritzia Job] Duration: ${result.duration}s`);
      logger.info(`[Aritzia Job] Errors: ${result.stats.errors}`);

      if (result.stats.errorLog?.length > 0) {
        logger.warn(`[Aritzia Job] Error details:`, result.stats.errorLog.slice(0, 5));
      }

      process.exit(0);
    } else {
      logger.error(`[Aritzia Job] Scrape failed:`, result.error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Aritzia Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAritziaScrape();
}

module.exports = { runAritziaScrape };
