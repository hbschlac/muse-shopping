/**
 * Shop Cider Inventory Scheduler
 * Runs Shop Cider scraping job on a schedule (every 24 hours at 5:00 AM)
 */

const cron = require('node-cron');
const runShopciderInventoryJob = require('./shopciderInventoryJob');
const logger = require('../config/logger');

class ShopciderInventoryScheduler {
  constructor() {
    this.task = null;
  }

  /**
   * Start the scheduler
   * Runs every day at 5:00 AM
   */
  start() {
    // Run every day at 5:00 AM
    this.task = cron.schedule('0 5 * * *', async () => {
      logger.info('[Shopcider Scheduler] Starting scheduled scrape');

      try {
        const result = await runShopciderInventoryJob();

        if (result.success) {
          logger.info('[Shopcider Scheduler] Scheduled scrape completed successfully');
        } else {
          logger.error('[Shopcider Scheduler] Scheduled scrape failed:', result.error);
        }
      } catch (error) {
        logger.error('[Shopcider Scheduler] Scheduler error:', error);
      }
    });

    logger.info('[Shopcider Scheduler] Scheduler started. Will run daily at 5:00 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('[Shopcider Scheduler] Scheduler stopped');
    }
  }

  /**
   * Run job immediately (for testing)
   */
  async runNow() {
    logger.info('[Shopcider Scheduler] Running job immediately');
    return await runShopciderInventoryJob();
  }
}

// If run directly, start the scheduler
if (require.main === module) {
  const scheduler = new ShopciderInventoryScheduler();
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Shopcider Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = ShopciderInventoryScheduler;
