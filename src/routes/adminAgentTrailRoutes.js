/**
 * Admin-only: the full agent trail for one checkout or shopping session.
 *
 *   GET /admin/agent-trail?intent=ci_…     one checkout (and its shopping session)
 *   GET /admin/agent-trail?session=<id>    one shopping session
 *
 * Each entry: when (UTC and Pacific), who acted, what, the decision and reason,
 * store, amount, the rules it checked (id@version, pass/fail, values compared),
 * the code version that ran, and whether the entry is untampered. Viewing a
 * trail is itself logged. See docs/AGENT_ACTIVITY_LOG.md.
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/authMiddleware');
const AgentAudit = require('../services/agentAudit');
const { successResponse } = require('../utils/responseFormatter');
const { ValidationError } = require('../utils/errors');

const ID = /^[A-Za-z0-9_-]{1,80}$/;

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const intent = typeof req.query.intent === 'string' ? req.query.intent : null;
    const session = typeof req.query.session === 'string' ? req.query.session : null;
    if ((!intent && !session) || (intent && !ID.test(intent)) || (session && !ID.test(session))) {
      throw new ValidationError('Pass ?intent=ci_… or ?session=<cart session id>');
    }
    const trail = await AgentAudit.getTrail({ checkoutIntentId: intent, cartSessionId: session });
    await AgentAudit.recordAgentEvent({
      actor: `admin:${req.userId}`, action: 'trail.viewed', decision: 'info',
      reason: `Admin viewed the agent trail (${trail.count} entries, ${trail.intact ? 'intact' : 'TAMPERING FOUND'})`,
      checkoutIntentId: intent, cartSessionId: trail.cartSessionId,
    });
    res.json(successResponse(trail));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
