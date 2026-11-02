/**
 * Agent bridge routes: search and check out at partner stores through the agent
 * protocols they publish (UCP today). See src/services/agentBridges/index.js.
 *
 *   GET  /bridges                         partner stores Muse can reach
 *   GET  /bridges/search?q=&partners=&category=
 *   GET  /bridges/:key/product?id=<product gid>
 *   POST /bridges/:key/checkout           { lines: [{ variantId, quantity }] }
 *        -> totals, policies and the store's continue_url; the shopper pays on
 *           the store's own checkout page.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const AgentBridges = require('../services/agentBridges');
const { successResponse } = require('../utils/responseFormatter');

function toPublicPartner(p) {
  return {
    key: p.key,
    name: p.name,
    domain: p.domain,
    category: p.category,
    protocol: p.protocol,
    platform: p.platform,
    canSearch: !!p.canSearch,
    canCheckout: !!p.canCheckout,
  };
}

router.get('/', (req, res) => {
  const partners = AgentBridges.listPartners({
    category: req.query.category || null,
  }).map(toPublicPartner);
  res.json(successResponse({ count: partners.length, partners }));
});

router.get('/search', async (req, res, next) => {
  try {
    const partners = req.query.partners
      ? String(req.query.partners).split(',').map(s => s.trim()).filter(Boolean)
      : null;
    const result = await AgentBridges.search(req.query.q, {
      partners,
      category: req.query.category || null,
    });
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

router.get('/:key/product', async (req, res, next) => {
  try {
    const bridge = AgentBridges.getBridge(req.params.key);
    const product = await bridge.getProduct(String(req.query.id || ''));
    res.json(successResponse({ product }));
  } catch (error) {
    next(error);
  }
});

router.post('/:key/checkout', authMiddleware, async (req, res, next) => {
  try {
    const bridge = AgentBridges.getBridge(req.params.key);
    const checkout = await bridge.startCheckout(req.body && req.body.lines);
    res.json(successResponse({ partnerKey: req.params.key, checkout }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
