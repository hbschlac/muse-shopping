/**
 * Express App Configuration
 * Separated from server.js for testing purposes
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const loadEnv = require('./config/loadEnv');
loadEnv();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/securityMiddleware');
const performanceMonitoring = require('./middleware/performanceMonitoring');

const app = express();
const API_VERSION = process.env.API_VERSION || 'v1';

// Trust the first proxy hop (Vercel's edge network).
// Without this, express-rate-limit v7+ throws a ValidationError on X-Forwarded-For,
// and req.ip returns the proxy IP instead of the real client IP — which breaks
// per-IP rate limiting, OAuth state binding, and any IP-based audit logging.
// Set to 1 (not `true`) so we only trust the immediate upstream, not every hop in the chain.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3001',
    'http://localhost:8080',
    'https://muse.shopping',
    'https://www.muse.shopping'
  ],
  credentials: true,
}));

// Rate limiting
app.use(globalLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input sanitization (protect against XSS)
app.use(sanitizeInput);

// Serve static assets (public)
app.use(express.static(path.join(__dirname, '../public')));

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '../public')));

// Performance monitoring (must be before API routes)
app.use(performanceMonitoring);

// API routes
app.use(`/api/${API_VERSION}`, routes);

// Serve the demo frontend at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../demo.html'));
});

// Redirect welcome page to frontend
app.get('/welcome', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  res.redirect(`${frontendUrl}/welcome`);
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

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
