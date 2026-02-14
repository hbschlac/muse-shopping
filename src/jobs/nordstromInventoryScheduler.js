/**
 * Nordstrom Inventory Scheduler
 * Runs the inventory scrape every 24 hours
 *
 * Usage: node src/jobs/nordstromInventoryScheduler.js
 * Or add to PM2/systemd for production
 */

const { runInventoryScrape } = require('./nordstromInventoryJob');
const logger = require('../config/logger');

// Schedule configuration
const SCRAPE_INTERVAL_HOURS = 24;
const SCRAPE_INTERVAL_MS = SCRAPE_INTERVAL_HOURS * 60 * 60 * 1000;

// Track job status
let isRunning = false;
let lastRunTime = null;
let nextRunTime = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * Run scrape job with error handling
 */
async function runScheduledScrape() {
  if (isRunning) {
    logger.warn('[Scheduler] Previous scrape still running, skipping...');
    return;
  }

  isRunning = true;
  lastRunTime = new Date();

  try {
    logger.info(`[Scheduler] Starting scheduled scrape at ${lastRunTime.toISOString()}`);

    const result = await runInventoryScrape();

    if (result.success) {
      consecutiveErrors = 0;
      logger.info('[Scheduler] Scrape completed successfully');
    } else {
      consecutiveErrors++;
      logger.error(`[Scheduler] Scrape failed. Consecutive errors: ${consecutiveErrors}`);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        logger.error(`[Scheduler] Max consecutive errors reached (${MAX_CONSECUTIVE_ERRORS}). Stopping scheduler.`);
        logger.error('[Scheduler] Manual intervention required. Check logs and restart scheduler.');
        process.exit(1);
      }
    }

  } catch (error) {
    consecutiveErrors++;
    logger.error('[Scheduler] Scrape error:', error);

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      logger.error(`[Scheduler] Max consecutive errors reached (${MAX_CONSECUTIVE_ERRORS}). Stopping scheduler.`);
      process.exit(1);
    }

  } finally {
    isRunning = false;
    nextRunTime = new Date(Date.now() + SCRAPE_INTERVAL_MS);
    logger.info(`[Scheduler] Next scrape scheduled for ${nextRunTime.toISOString()}`);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  logger.info('=== Nordstrom Inventory Scheduler Started ===');
  logger.info(`Scrape interval: Every ${SCRAPE_INTERVAL_HOURS} hours`);
  logger.info(`Max consecutive errors: ${MAX_CONSECUTIVE_ERRORS}`);

  // Run immediately on start
  logger.info('[Scheduler] Running initial scrape...');
  runScheduledScrape();

  // Schedule recurring scrapes
  setInterval(() => {
    runScheduledScrape();
  }, SCRAPE_INTERVAL_MS);

  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('[Scheduler] Received SIGINT, shutting down gracefully...');
    if (isRunning) {
      logger.info('[Scheduler] Waiting for current scrape to complete...');
      // Wait a bit for current job to finish
      setTimeout(() => {
        logger.info('[Scheduler] Shutdown complete');
        process.exit(0);
      }, 5000);
    } else {
      logger.info('[Scheduler] Shutdown complete');
      process.exit(0);
    }
  });

  process.on('SIGTERM', () => {
    logger.info('[Scheduler] Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

// Status endpoint helper
function getSchedulerStatus() {
  return {
    isRunning,
    lastRunTime,
    nextRunTime,
    consecutiveErrors,
    intervalHours: SCRAPE_INTERVAL_HOURS,
    uptime: process.uptime()
  };
}

// Start if run directly
if (require.main === module) {
  startScheduler();
}

module.exports = {
  startScheduler,
  getSchedulerStatus,
  runScheduledScrape
};
