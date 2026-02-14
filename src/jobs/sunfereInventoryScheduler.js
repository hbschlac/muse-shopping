/**
 * Sunfere Inventory Scheduler
 * Runs Sunfere scraping job on a schedule (every 24 hours)
 */

const cron = require('node-cron');
const runSunfereInventoryJob = require('./sunfereInventoryJob');
const logger = require('../config/logger');

class SunfereInventoryScheduler {
  constructor() {
    this.task = null;
  }

  /**
   * Start the scheduler
   * Runs every day at 4 AM
   */
  start() {
    // Run every day at 4:00 AM
    this.task = cron.schedule('0 4 * * *', async () => {
      logger.info('[Sunfere Scheduler] Starting scheduled scrape');

      try {
        const result = await runSunfereInventoryJob();

        if (result.success) {
          logger.info('[Sunfere Scheduler] Scheduled scrape completed successfully');
        } else {
          logger.error('[Sunfere Scheduler] Scheduled scrape failed:', result.error);
        }
      } catch (error) {
        logger.error('[Sunfere Scheduler] Scheduler error:', error);
      }
    });

    logger.info('[Sunfere Scheduler] Scheduler started. Will run daily at 4:00 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('[Sunfere Scheduler] Scheduler stopped');
    }
  }

  /**
   * Run job immediately (for testing)
   */
  async runNow() {
    logger.info('[Sunfere Scheduler] Running job immediately');
    return await runSunfereInventoryJob();
  }
}

// If run directly, start the scheduler
if (require.main === module) {
  const scheduler = new SunfereInventoryScheduler();
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Sunfere Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = SunfereInventoryScheduler;
