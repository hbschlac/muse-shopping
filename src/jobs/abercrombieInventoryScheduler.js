/**
 * Abercrombie Inventory Scheduler
 * Runs scraper every 24 hours for continuous data collection
 */

const cron = require('node-cron');
const { runAbercrombieScrape } = require('./abercrombieInventoryJob');
const logger = require('../config/logger');

class AbercrombieInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 3 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Abercrombie Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 3 AM every day (different from Nordstrom at 2 AM)
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 3 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Abercrombie Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Abercrombie Scheduler] Starting scheduled scrape');

      try {
        await runAbercrombieScrape();
        logger.info('[Abercrombie Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Abercrombie Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Abercrombie Scheduler] Scheduler started - will run daily at 3 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Abercrombie Scheduler] Scheduler stopped');
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
    logger.info('[Abercrombie Scheduler] Triggering immediate scrape');

    try {
      await runAbercrombieScrape();
      logger.info('[Abercrombie Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new AbercrombieInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Abercrombie Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
