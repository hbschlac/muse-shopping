/**
 * Target Inventory Scheduler
 * Runs scraper every 24 hours for continuous data collection
 */

const cron = require('node-cron');
const { runTargetScrape } = require('./targetInventoryJob');
const logger = require('../config/logger');

class TargetInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 6 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Target Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 6 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 6 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Target Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Target Scheduler] Starting scheduled scrape');

      try {
        await runTargetScrape();
        logger.info('[Target Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Target Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Target Scheduler] Scheduler started - will run daily at 6 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Target Scheduler] Scheduler stopped');
    }
  }

  /**
   * Trigger immediate scrape (for testing)
   */
  async triggerNow() {
    if (this.isRunning) {
      throw new Error('Scrape already in progress');
    }

    this.isRunning = true;
    logger.info('[Target Scheduler] Triggering immediate scrape');

    try {
      await runTargetScrape();
      logger.info('[Target Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new TargetInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Target Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
