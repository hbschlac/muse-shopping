/**
 * Clean text that comes from a store (product titles, descriptions, option
 * names, checkout messages) before Muse shows, stores or reasons about it.
 *
 * Hidden-text attacks hide instructions in characters a person can't see but a
 * program reads: zero-width and direction-control characters, Unicode "tag"
 * characters, soft hyphens, HTML comments and markup. This removes all of them,
 * folds look-alike width forms (fullwidth letters, ligatures) with NFKC, and
 * drops markup so styling tricks (white-on-white, 0px text) can't hide words:
 * anything left is plain text a shopper would see too.
 *
 * It does not catch letters from another alphabet that look Latin (a Cyrillic
 * "а"); Muse never lets store text drive a decision, so that is acceptable.
 * See docs/ROGUE_AGENT.md.
 *
 * src/services/listingWatch/contract.js keeps an inline copy because store
 * scripts may only load that file; tests/utils/storeText.test.js keeps them equal.
 */

const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ￹-￻]|[\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu;

function cleanStoreText(value, max = 2000) {
  if (value == null) return null;
  const s = String(value)
    .normalize('NFKC')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(INVISIBLE, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s ? s.slice(0, max) : null;
}

module.exports = { cleanStoreText, INVISIBLE };
