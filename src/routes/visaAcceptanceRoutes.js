/**
 * Visa Acceptance (ICC) sandbox check. Never answers in production.
 *   GET /api/v1/visa-acceptance/sandbox-check        -> which env vars are set (no values)
 *   GET /api/v1/visa-acceptance/sandbox-check?run=1  -> one $1.00 test-card authorization
 */
const express = require('express');
const visa = require('../services/visaAcceptance/client');

const router = express.Router();

router.get('/sandbox-check', async (req, res) => {
  if (process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production.' });
  }
  const config = visa.getConfig();
  const summary = {
    vercelEnv: process.env.VERCEL_ENV || 'local',
    host: visa.SANDBOX_HOST,
    configured: config.configured,
    missing: config.missing,
  };
  if (!config.configured || req.query.run !== '1') {
    return res.json(summary);
  }
  try {
    const result = await visa.sandboxAuthCheck();
    return res.json({ ...summary, result });
  } catch (err) {
    return res.status(502).json({ ...summary, error: err.message });
  }
});

module.exports = router;
