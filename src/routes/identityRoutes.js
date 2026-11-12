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
const shop = require('../services/identityLinking/shopClient');

router.get('/shop/client.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('application/json').send(JSON.stringify(shop.buildClientMetadata()));
});

router.get('/shop/callback', async (req, res) => {
  const outcome = shop.summarizeCallback(req.query);
  await recordAgentEvent({
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
