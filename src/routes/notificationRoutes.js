/**
 * /api/v1/notifications: push devices, settings, alert history (R7, R8, R9).
 */

const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const Notifications = require('../services/notifications');

const router = express.Router();

const wrap = fn => async (req, res, next) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    next(err);
  }
};

// Same shared secret the scheduled Rakuten poll uses.
function bearerMatches(header, secret) {
  if (!secret) return false;
  const given = Buffer.from(String(header || '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(secret);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

// Public: the browser needs this key to subscribe.
router.get('/vapid-public-key', (req, res) => {
  res.json({ success: true, data: { configured: Notifications.isConfigured(), publicKey: Notifications.publicKey() } });
});

// Signed taps from the service worker (opened, dismissed, fewer like this).
router.post('/alerts/event', wrap(req => Notifications.recordEvent(req.body || {})));

// Scheduled: dispatch new changes, release quiet-hours alerts, send digests.
router.post('/dispatch', async (req, res, next) => {
  try {
    if (!bearerMatches(req.headers.authorization, process.env.NEW_ARRIVALS_POLL_SECRET)) {
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }
    res.json({ success: true, data: await Notifications.runAll() });
  } catch (err) {
    next(err);
  }
});

router.get('/status', authMiddleware, wrap(req => Notifications.status(req.userId)));
router.post('/subscriptions', authMiddleware, wrap(req => Notifications.subscribe(
  req.userId, req.body && req.body.subscription, req.headers['user-agent'],
)));
router.delete('/subscriptions', authMiddleware, wrap(req => Notifications.unsubscribe(
  req.userId, req.body && req.body.endpoint,
)));
router.get('/prefs', authMiddleware, wrap(req => Notifications.getPrefs(req.userId)));
router.put('/prefs', authMiddleware, wrap(req => Notifications.updatePrefs(req.userId, req.body)));
router.get('/alerts', authMiddleware, wrap(req => Notifications.listAlerts(req.userId, req.query)));
router.post('/alerts/:id/fewer', authMiddleware, wrap(req => Notifications.fewerLikeThis(req.userId, parseInt(req.params.id, 10))));
router.post('/test', authMiddleware, wrap(req => Notifications.sendTest(req.userId, req.body || {})));

module.exports = router;
