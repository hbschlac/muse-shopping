/**
 * UCP identity linking routes. See src/services/identityLinking/shopClient.js.
 *
 *   GET /api/v1/identity/shop/client.json  Muse's public app description for Shop
 *   GET /api/v1/identity/shop/callback     where Shop sends the shopper back
 *
 * The callback only records whether Shop accepted Muse (a code arrived) or
 * refused (an error arrived). It never exchanges the code and never stores a
 * token, so no shopper account is linked by this PR.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { recordAgentEvent } = require('../services/agentAudit');
const rateLimit = require('express-rate-limit');
const shop = require('../services/identityLinking/shopClient');

// The callback is public (Shop redirects a browser to it), and agent_events is
// append-only, so anyone could fill the log by hitting it. Two caps: per IP,
// and a per-instance ceiling on log writes. Past the ceiling the page still
// answers; it just stops logging.
const callbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const LOG_CAP_PER_HOUR = 30;
let logWindowStart = 0;
let logsThisWindow = 0;
function underLogCap(now = Date.now()) {
  if (now - logWindowStart > 60 * 60 * 1000) { logWindowStart = now; logsThisWindow = 0; }
  logsThisWindow += 1;
  return logsThisWindow <= LOG_CAP_PER_HOUR;
}

router.get('/shop/client.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('application/json').send(JSON.stringify(shop.buildClientMetadata()));
});

router.get('/shop/callback', callbackLimiter, async (req, res) => {
  const outcome = shop.summarizeCallback(req.query);
  if (underLogCap()) await recordAgentEvent({
    actor: 'shopper',
    action: 'identity.link_probe',
    decision: outcome.accepted ? 'allowed' : 'declined',
    reason: outcome.accepted
      ? 'Shop accepted Muse as an app and returned a code (discarded, not exchanged)'
      : `Shop returned no code: ${outcome.error || 'unknown'}`,
    partnerKey: 'shop',
    details: outcome,
  }).catch((err) => logger.error(`identity_link_probe log failed: ${err.message}`));

  res.set('Cache-Control', 'no-store');
  const message = outcome.accepted
    ? 'Shop accepted Muse. Nothing was linked or saved. You can close this tab.'
    : `Shop did not accept Muse (${outcome.error || 'no reason given'}). You can close this tab.`;
  res.type('text/plain; charset=utf-8').send(message);
});

module.exports = router;
module.exports._internal = { underLogCap, LOG_CAP_PER_HOUR };
