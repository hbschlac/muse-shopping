/**
 * Vercel Serverless Function Entry Point
 * Minimal version that serves the frontend and API
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Trust Vercel's edge proxy (one hop) so req.ip is the real client and
// express-rate-limit stops throwing ValidationError on X-Forwarded-For.
// Set to 1 (not true) to prevent client-supplied XFF spoofing.
app.set('trust proxy', 1);

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:8080',
    'https://muse.shopping',
    'https://www.muse.shopping',
    'https://app.muse.shopping'
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '../public')));

// Try to load the full API routes, but don't fail if it doesn't work
let routesLoaded = false;
try {
  require('dotenv').config();
  const routes = require('../src/routes');
  app.use('/api/v1', routes);
  routesLoaded = true;
  console.log('API routes loaded successfully');
} catch (error) {
  console.error('Warning: Could not load API routes:', error.message);
  console.error('Stack:', error.stack);
  // Create a fallback health endpoint
  app.get('/api/v1/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'partial',
        message: 'Frontend only mode - API routes failed to load',
        error: error.message,
        stack: error.stack
      }
    });
  });
}

// Serve the branded landing page at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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

// Error handler — MUST be registered last, with 4-arg signature (err, req, res, next).
// Without this, thrown errors like AuthenticationError (statusCode=401) fall through to
// Express's default handler, which serializes them as HTML ("<pre>Unauthorized</pre>")
// instead of our JSON envelope { success:false, error:{ code, message, userMessage, ... } }.
// The frontend then fails to parse JSON and shows a generic "Something went wrong" to the user.
// Only mount if routes loaded — the fallback path above doesn't throw anything catchable.
if (routesLoaded) {
  try {
    const errorHandler = require('../src/middleware/errorHandler');
    app.use(errorHandler);
  } catch (error) {
    console.error('Warning: Could not load errorHandler middleware:', error.message);
  }
}

// Export the app for Vercel serverless functions
module.exports = app;
