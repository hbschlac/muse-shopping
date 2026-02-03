/**
 * Vercel Serverless Function Entry Point
 * This exports the Express app for Vercel's serverless platform
 */

require('dotenv').config();
const app = require('../src/app');

// Export the app for Vercel serverless functions
module.exports = app;
