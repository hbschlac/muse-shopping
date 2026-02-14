/**
 * Urban Outfitters Inventory Scheduler
 * Runs scraper every 24 hours for continuous data collection
 */

const cron = require('node-cron');
const { runUrbanOutfittersScrape } = require('./urbanoutfittersInventoryJob');
const logger = require('../config/logger');

class UrbanOutfittersInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 9 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Urban Outfitters Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 9 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 9 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Urban Outfitters Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Urban Outfitters Scheduler] Starting scheduled scrape');

      try {
        await runUrbanOutfittersScrape();
        logger.info('[Urban Outfitters Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Urban Outfitters Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Urban Outfitters Scheduler] Scheduler started - will run daily at 9 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Urban Outfitters Scheduler] Scheduler stopped');
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
    logger.info('[Urban Outfitters Scheduler] Triggering immediate scrape');

    try {
      await runUrbanOutfittersScrape();
      logger.info('[Urban Outfitters Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new UrbanOutfittersInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Urban Outfitters Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
