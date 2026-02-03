/**
 * Vercel Serverless Function Entry Point
 * This exports the Express app for Vercel's serverless platform
 */

require('dotenv').config();

// Try to load the app and catch any errors
let app;
try {
  app = require('../src/app');
  console.log('App loaded successfully');
} catch (error) {
  console.error('Error loading app:', error.message);
  console.error('Stack:', error.stack);

  // Create a minimal Express app to show the error
  const express = require('express');
  app = express();
  app.get('*', (req, res) => {
    res.status(500).send(`
      <html>
        <head><title>Server Error</title></head>
        <body>
          <h1>Server Error</h1>
          <p>Failed to load application:</p>
          <pre>${error.message}\n\n${error.stack}</pre>
        </body>
      </html>
    `);
  });
}

// Export the app for Vercel serverless functions
module.exports = app;
