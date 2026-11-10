/**
 * Owner dashboard API: GET /api/v1/admin/dashboard
 *
 * Only the site owner can read it. Being an admin is not enough: the signed-in
 * account must also be on the owner list (OWNER_EMAILS, comma separated;
 * defaults to the Muse owner account). The page at /admin calls this.
 *
 * The response holds members' emails, so it is never cached, and every view
 * is written to security_events, so access can be checked later.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const logger = require('../utils/logger');
const { requireAdmin } = require('../middleware/authMiddleware');
const { AuthorizationError } = require('../utils/errors');
const { successResponse } = require('../utils/responseFormatter');
const AdminDashboard = require('../services/adminDashboard');

const DEFAULT_OWNERS = 'hannah@muse.shopping';

function ownerEmails() {
  return (process.env.OWNER_EMAILS || DEFAULT_OWNERS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function logAccess(req, eventType, severity, description) {
  return pool.query(
    `INSERT INTO security_events (event_type, severity, user_id, email, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [eventType, severity, req.userId, req.userEmail || null, description]
  ).catch((err) => logger.error('Failed to log owner dashboard access:', err));
}

async function requireOwner(req, res, next) {
  const email = (req.userEmail || '').toLowerCase();
  if (!email || !ownerEmails().includes(email)) {
    logger.warn(`Non-owner admin tried to open the owner dashboard: ${req.userEmail}`);
    await logAccess(req, 'owner_dashboard_denied', 'warning', 'Admin without owner access tried to open the owner dashboard');
    return next(new AuthorizationError('Only the site owner can open this dashboard'));
  }
  return next();
}

router.get('/', requireAdmin, requireOwner, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, private');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    const data = await AdminDashboard.getDashboard();
    await logAccess(req, 'owner_dashboard_viewed', 'info', 'Owner opened the dashboard');
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports._internal = { ownerEmails, requireOwner };
