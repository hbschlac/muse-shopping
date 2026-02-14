/**
 * Macys Inventory Scheduler
 * Runs scraper daily at 5 AM for continuous data collection
 */

const cron = require('node-cron');
const { runMacysScrape } = require('./macysInventoryJob');
const logger = require('../config/logger');

class MacysInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every day at 5 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Macys Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 5 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 5 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Macys Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Macys Scheduler] Starting scheduled scrape');

      try {
        await runMacysScrape();
        logger.info('[Macys Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Macys Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Macys Scheduler] Scheduler started - will run daily at 5 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Macys Scheduler] Scheduler stopped');
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
    logger.info('[Macys Scheduler] Triggering immediate scrape');

    try {
      await runMacysScrape();
      logger.info('[Macys Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new MacysInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Macys Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
