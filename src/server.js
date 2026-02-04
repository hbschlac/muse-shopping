/**
 * Server Startup
 * Starts the Express server and handles database connection
 */

require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const pool = require('./db/pool');
const ChatJobRunService = require('./services/chatJobRunService');
const ChatPreferenceDecayJob = require('./jobs/chatPreferenceDecayJob');
const ChatSessionSummaryJob = require('./jobs/chatSessionSummaryJob');

const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Database connection test
const demoMode = process.env.CHAT_DEMO_MODE === 'true';
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection failed:', err);
    if (!demoMode) {
      process.exit(1);
    }
  } else {
    logger.info('Database connected successfully');
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`API available at http://localhost:${PORT}/api/${API_VERSION}`);
});

// Simple scheduler for chat maintenance jobs (opt-in)
if (process.env.CHAT_JOB_SCHEDULER_ENABLED === 'true') {
  const decayIntervalMinutes = parseInt(process.env.CHAT_JOB_DECAY_INTERVAL_MINUTES || '1440', 10);
  const summaryIntervalMinutes = parseInt(process.env.CHAT_JOB_SUMMARY_INTERVAL_MINUTES || '360', 10);

  const runJob = async (name, runner) => {
    try {
      await runner.run();
      await ChatJobRunService.logRun(name, 'completed', { trigger: 'scheduler' });
    } catch (error) {
      await ChatJobRunService.logRun(name, 'failed', { trigger: 'scheduler', error: error.message });
      logger.error('Scheduled chat job failed', { job: name, error: error.message });
    }
  };

  const decayJob = new ChatPreferenceDecayJob();
  const summaryJob = new ChatSessionSummaryJob();

  setInterval(() => runJob('preference_decay', decayJob), Math.max(1, decayIntervalMinutes) * 60 * 1000);
  setInterval(() => runJob('session_summary', summaryJob), Math.max(1, summaryIntervalMinutes) * 60 * 1000);
  logger.info('Chat job scheduler enabled', { decayIntervalMinutes, summaryIntervalMinutes });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
});

module.exports = app;
