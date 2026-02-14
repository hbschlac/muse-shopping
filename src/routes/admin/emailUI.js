/**
 * Admin Email UI Routes
 * Serves the admin email management interface
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { requireAdmin } = require('../../middleware/authMiddleware');

// Login page (no auth required)
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'email-admin-login.html'));
});

// Logo file (no auth required)
router.get('/logo-muse.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.sendFile(path.join(__dirname, 'logo-muse.svg'));
});

// JavaScript file (no auth required for script loading)
router.get('/email-admin.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'email-admin.js'));
});

// Main admin email interface (HTML page served without auth, JS will handle auth check)
router.get('/', (req, res) => {
  // Set headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'email-admin.html'));
});

module.exports = router;
