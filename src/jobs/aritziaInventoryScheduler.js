/**
 * Aritzia Inventory Scheduler
 * Runs scraper every 24 hours for continuous data collection
 */

const cron = require('node-cron');
const { runAritziaScrape } = require('./aritziaInventoryJob');
const logger = require('../config/logger');

class AritziaInventoryScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler - runs every 24 hours at 4 AM
   */
  start() {
    if (this.task) {
      logger.warn('[Aritzia Scheduler] Scheduler already running');
      return;
    }

    // Schedule for 4 AM every day (different from others)
    // Cron format: second minute hour day month weekday
    this.task = cron.schedule('0 0 4 * * *', async () => {
      if (this.isRunning) {
        logger.warn('[Aritzia Scheduler] Previous scrape still running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('[Aritzia Scheduler] Starting scheduled scrape');

      try {
        await runAritziaScrape();
        logger.info('[Aritzia Scheduler] Scheduled scrape completed successfully');
      } catch (error) {
        logger.error('[Aritzia Scheduler] Scheduled scrape failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[Aritzia Scheduler] Scheduler started - will run daily at 4 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[Aritzia Scheduler] Scheduler stopped');
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
    logger.info('[Aritzia Scheduler] Triggering immediate scrape');

    try {
      await runAritziaScrape();
      logger.info('[Aritzia Scheduler] Immediate scrape completed');
    } finally {
      this.isRunning = false;
    }
  }
}

const scheduler = new AritziaInventoryScheduler();

// Start scheduler if run directly
if (require.main === module) {
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Aritzia Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
