/**
 * Strip invisible characters from everything people submit (names, feedback,
 * waitlist notes, collection names...) before Muse stores it.
 *
 * Why: a stranger could hide instructions for an AI in, say, their sign-up
 * name. A person reading the admin dashboard sees nothing odd, but an AI asked
 * to read that page reads the hidden words too. Removing zero-width,
 * direction-control and Unicode "tag" characters at the door means hidden
 * text never gets stored. Same character list as cleanStoreText()
 * (src/utils/storeText.js), see docs/ROGUE_AGENT.md.
 *
 * Only removes invisible characters. Visible text, HTML and URLs are left as
 * typed (React escapes them on display). Password fields are left alone so an
 * existing password can never stop matching. Raw bodies (the Stripe webhook's
 * Buffer) are not touched.
 */

const { INVISIBLE } = require('../utils/storeText');

const SKIP_KEYS = /password/i;
const MAX_DEPTH = 20;

function strip(value, depth = 0) {
  if (typeof value === 'string') return value.replace(INVISIBLE, '');
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(v => strip(v, depth + 1));
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = SKIP_KEYS.test(key) ? value[key] : strip(value[key], depth + 1);
  }
  return out;
}

function stripInvisible(req, res, next) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = strip(req.body);
  }
  next();
}

module.exports = { stripInvisible, strip };
