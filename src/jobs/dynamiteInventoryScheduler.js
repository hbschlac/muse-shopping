/**
 * Dynamite Inventory Scheduler
 * Runs scraper every 24 hours for continuous data collection
 */

const cron = require('node-cron');
const { runDynamiteScrape } = require('./dynamiteInventoryJob');
const logger = require('../config/logger');

class DynamiteInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 11 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Dynamite Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 11 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 11 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Dynamite Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Dynamite Scheduler] Starting scheduled scrape');

      try {
        await runDynamiteScrape();
        logger.info('[Dynamite Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Dynamite Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Dynamite Scheduler] Scheduler started - will run daily at 11 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Dynamite Scheduler] Scheduler stopped');
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
    logger.info('[Dynamite Scheduler] Triggering immediate scrape');

    try {
      await runDynamiteScrape();
      logger.info('[Dynamite Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new DynamiteInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Dynamite Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
