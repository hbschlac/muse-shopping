/**
 * Zara Inventory Scheduler
 * Runs scraper daily at 7 AM for continuous data collection
 */

const cron = require('node-cron');
const { runZaraScrape } = require('./zaraInventoryJob');
const logger = require('../config/logger');

class ZaraInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 7 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Zara Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 7 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 7 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Zara Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Zara Scheduler] Starting scheduled scrape');

      try {
        await runZaraScrape();
        logger.info('[Zara Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Zara Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Zara Scheduler] Scheduler started - will run daily at 7 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Zara Scheduler] Scheduler stopped');
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
    logger.info('[Zara Scheduler] Triggering immediate scrape');

    try {
      await runZaraScrape();
      logger.info('[Zara Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new ZaraInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Zara Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
