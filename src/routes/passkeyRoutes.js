/**
 * Shopper passkeys (Face ID / Touch ID) used to approve a cart before Muse pays.
 * See src/services/passkeys.
 *
 *   GET  /passkeys                    the shopper's passkeys (ids and dates only)
 *   POST /passkeys/register/options   options for navigator.credentials.create()
 *   POST /passkeys/register/verify    { response, nickname? } saves the public key
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Passkeys = require('../services/passkeys');
const { successResponse } = require('../utils/responseFormatter');
const { NotFoundError } = require('../utils/errors');

router.use(authMiddleware);

// Same switch as agent checkout: off unless AGENT_CHECKOUT_ENABLED=true.
router.use((req, res, next) => {
  if (process.env.AGENT_CHECKOUT_ENABLED !== 'true') return next(new NotFoundError('Passkeys'));
  return next();
});

router.get('/', async (req, res, next) => {
  try {
    res.json(successResponse({ passkeys: await Passkeys.listPasskeys(req.userId) }));
  } catch (error) {
    next(error);
  }
});

router.post('/register/options', async (req, res, next) => {
  try {
    res.json(successResponse(await Passkeys.registrationOptions(req.userId)));
  } catch (error) {
    next(error);
  }
});

router.post('/register/verify', async (req, res, next) => {
  try {
    const { response, nickname } = req.body || {};
    const saved = await Passkeys.verifyRegistration(req.userId, response, {
      nickname: typeof nickname === 'string' ? nickname.slice(0, 100) : null,
    });
    res.json(successResponse(saved, 'Passkey added'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
