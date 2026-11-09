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

// Take the Vercel OIDC token off the request before anything else can log or
// forward it. Only the agent signer uses it (src/services/agentSigning).
app.use(require('../src/services/agentSigning/oidcToken').captureOidcToken);

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
// One store's listing refresh can exceed the 100kb default; only that route gets more.
app.use('/api/v1/listings/ingest', express.json({ limit: '4mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '../public')));

// UCP agent profile: stores fetch this before answering Muse's agent calls.
// See src/services/agentBridges/agentProfile.js.
app.get('/.well-known/ucp', (req, res) => {
  const { buildAgentProfile } = require('../src/services/agentBridges/agentProfile');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/json').send(JSON.stringify(buildAgentProfile()));
});

// Web Bot Auth / Visa TAP key directory: Muse's public agent keys, read from
// Cloud KMS and signed by each key. 503 until KMS is configured; never a dev key.
app.get('/.well-known/http-message-signatures-directory', (req, res) => {
  require('../src/services/agentSigning').directoryHandler(req, res);
});

// Know Your Agent profile for card networks and partner stores (docs/KYA.md).
app.get(['/kya.md', '/.well-known/kya'], (req, res) => {
  const fs = require('fs');
  try {
    const body = fs.readFileSync(path.join(__dirname, '../docs/KYA.md'), 'utf8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('text/markdown; charset=utf-8').send(body);
  } catch (err) {
    res.status(404).type('text/plain').send('Not found');
  }
});

// Visa Acceptance (ICC) sandbox check. Mounted on its own so it works on
// Preview deploys even when the full route tree can't load (Preview lacks
// production-only env such as ENCRYPTION_KEY). Returns 404 in production.
app.use('/api/v1/visa-acceptance', require('../src/routes/visaAcceptanceRoutes'));

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
