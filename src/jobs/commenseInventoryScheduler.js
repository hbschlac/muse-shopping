/**
 * The Commense Inventory Scheduler
 * Runs The Commense scraping job on a schedule (every 24 hours)
 */

const cron = require('node-cron');
const runCommenseInventoryJob = require('./commenseInventoryJob');
const logger = require('../config/logger');

class CommenseInventoryScheduler {
  constructor() {
    this.task = null;
  }

  /**
   * Start the scheduler
   * Runs every day at 3 AM
   */
  start() {
    // Run every day at 3:00 AM
    this.task = cron.schedule('0 3 * * *', async () => {
      logger.info('[Commense Scheduler] Starting scheduled scrape');

      try {
        const result = await runCommenseInventoryJob();

        if (result.success) {
          logger.info('[Commense Scheduler] Scheduled scrape completed successfully');
        } else {
          logger.error('[Commense Scheduler] Scheduled scrape failed:', result.error);
        }
      } catch (error) {
        logger.error('[Commense Scheduler] Scheduler error:', error);
      }
    });

    logger.info('[Commense Scheduler] Scheduler started. Will run daily at 3:00 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('[Commense Scheduler] Scheduler stopped');
    }
  }

  /**
   * Run job immediately (for testing)
   */
  async runNow() {
    logger.info('[Commense Scheduler] Running job immediately');
    return await runCommenseInventoryJob();
  }
}

// If run directly, start the scheduler
if (require.main === module) {
  const scheduler = new CommenseInventoryScheduler();
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Commense Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = CommenseInventoryScheduler;
