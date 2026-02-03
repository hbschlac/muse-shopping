/**
 * Vercel Serverless Function Entry Point
 * Minimal version that serves the frontend and API
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:8080',
    'https://muse.shopping',
    'https://www.muse.shopping'
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '../public')));

// Try to load the full API routes, but don't fail if it doesn't work
try {
  require('dotenv').config();
  const routes = require('../src/routes');
  app.use('/api/v1', routes);
  console.log('API routes loaded successfully');
} catch (error) {
  console.error('Warning: Could not load API routes:', error.message);
  // Create a fallback health endpoint
  app.get('/api/v1/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'partial',
        message: 'Frontend only mode',
        error: error.message
      }
    });
  });
}

// Serve the demo frontend at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../demo.html'));
});

// 404 handler for other routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.path,
    },
  });
});

// Export the app for Vercel serverless functions
module.exports = app;
