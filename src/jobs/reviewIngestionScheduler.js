require('dotenv').config();
const logger = require('../utils/logger');
const pool = require('../db/pool');
const { runBatch } = require('./reviewIngestionJob');

const intervalMinutes = parseInt(process.env.REVIEWS_SYNC_INTERVAL_MINUTES || '60', 10);
const limit = parseInt(process.env.REVIEWS_SYNC_LIMIT || '200', 10);
const retailers = process.env.REVIEWS_SYNC_RETAILERS
  ? process.env.REVIEWS_SYNC_RETAILERS.split(',')
  : undefined;

async function runLoop() {
  logger.info(`Review sync scheduler started. Interval: ${intervalMinutes}m`);

  await runBatch({ limit, retailers, dryRun: false });

  setInterval(async () => {
    try {
      await runBatch({ limit, retailers, dryRun: false });
    } catch (error) {
      logger.error('Review sync scheduler error:', error.message);
    }
  }, intervalMinutes * 60 * 1000);
}

runLoop().catch(error => {
  logger.error('Review scheduler failed:', error);
  pool.end();
});
