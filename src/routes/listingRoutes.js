/**
 * Listing refresh endpoints, called only by the scheduled refresh job.
 * Auth: Authorization: Bearer <NEW_ARRIVALS_POLL_SECRET> (the same secret the
 * new-arrivals poll uses; it lives in Vercel and in the repo's Actions secrets).
 *
 *   GET  /api/v1/listings/plan    which stores to refresh and what to ask for
 *   POST /api/v1/listings/ingest  one store's run (contract-checked again here)
 *   GET  /api/v1/listings/status  per-store health, for the job and the repair work
 *   DELETE /api/v1/listings/overrides/:storeKey  take a store off the fallback (after a repair lands)
 */

const express = require('express');
const crypto = require('crypto');
const listingWatch = require('../services/listingWatch');

const router = express.Router();

function bearerMatches(header, secret) {
  if (!secret) return false;
  const given = Buffer.from(String(header || '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(secret);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

function requireJobSecret(req, res, next) {
  if (!bearerMatches(req.headers.authorization, process.env.NEW_ARRIVALS_POLL_SECRET)) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }
  return next();
}

router.use(requireJobSecret);

router.get('/plan', async (req, res, next) => {
  try {
    const extraStores = String(process.env.LISTINGS_EXTRA_STORES || '').split(',').map(s => s.trim()).filter(Boolean);
    const tasks = await listingWatch.buildPlan({ extraStores });
    res.json({ success: true, data: { generatedAt: new Date().toISOString(), tasks } });
  } catch (err) {
    next(err);
  }
});

router.post('/ingest', async (req, res, next) => {
  try {
    const result = await listingWatch.ingestRun(req.body || {});
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ success: false, error: err.message });
    return next(err);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    res.json({ success: true, data: { stores: await listingWatch.getStatus() } });
  } catch (err) {
    next(err);
  }
});

router.delete('/overrides/:storeKey', async (req, res, next) => {
  try {
    const removed = await listingWatch.deleteOverride(String(req.params.storeKey));
    res.json({ success: true, data: { storeKey: req.params.storeKey, removed } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
