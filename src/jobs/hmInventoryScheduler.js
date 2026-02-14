/**
 * H&M Inventory Scheduler
 * Runs scraper every 24 hours for continuous data collection
 */

const cron = require('node-cron');
const { runHMScrape } = require('./hmInventoryJob');
const logger = require('../config/logger');

class HMInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 8 AM
   */
  start() {
    if (this.task) {
      logger.warn('[H&M Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 8 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 8 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[H&M Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[H&M Scheduler] Starting scheduled scrape');

      try {
        await runHMScrape();
        logger.info('[H&M Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[H&M Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[H&M Scheduler] Scheduler started - will run daily at 8 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[H&M Scheduler] Scheduler stopped');
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
    logger.info('[H&M Scheduler] Triggering immediate scrape');

    try {
      await runHMScrape();
      logger.info('[H&M Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new HMInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[H&M Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
