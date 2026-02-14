/**
 * Free People Inventory Scheduler
 * Runs scraper every 24 hours at 10 AM for continuous data collection
 */

const cron = require('node-cron');
const { runFreepeoplesScrape } = require('./freepeopleInventoryJob');
const logger = require('../config/logger');

class FreepeopleInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 10 AM
   */
  start() {
    if (this.task) {
      logger.warn('[FreePeople Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 10 AM every day
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 10 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[FreePeople Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[FreePeople Scheduler] Starting scheduled scrape');

      try {
        await runFreepeoplesScrape();
        logger.info('[FreePeople Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[FreePeople Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[FreePeople Scheduler] Scheduler started - will run daily at 10 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[FreePeople Scheduler] Scheduler stopped');
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
    logger.info('[FreePeople Scheduler] Triggering immediate scrape');

    try {
      await runFreepeoplesScrape();
      logger.info('[FreePeople Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new FreepeopleInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[FreePeople Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
