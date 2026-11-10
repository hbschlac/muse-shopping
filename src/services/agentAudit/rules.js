/**
 * The rules Muse's agent follows, each with an id and a version, so every
 * logged decision can cite exactly which rules it checked and what it found.
 *
 * Changing what a rule does: bump its version and keep the old text below in
 * RETIRED, so older log entries still point at the wording that applied then.
 * Ids are permanent; never reuse one for a different rule.
 */

const RULES = {
  'checkout.review_matches': { version: 1, text: 'Pay only for the exact review the shopper was shown. If anything changed, ask them to review again.' },
  'checkout.not_expired': { version: 1, text: 'A review expires 30 minutes after it is built. An expired review is never paid.' },
  'checkout.shopper_approval': { version: 1, text: 'Pay only after the shopper approves this exact cart with their passkey (Face ID or Touch ID).' },
  'checkout.one_confirm': { version: 1, text: 'Only one confirm can win. A second tap on the same cart is refused.' },
  'checkout.price_changes_shown': { version: 1, text: 'If a store\'s price is higher than the price in the Muse cart, the review screen shows the old and new price before the shopper approves.' },
  'payment.ceiling': { version: 1, text: 'Never pay a store more than the total the shopper approved for that store.' },
  'payment.logged_first': { version: 1, text: 'Write the payment to this log before paying. If the log write fails, do not pay.' },
  'payment.no_card_storage': { version: 1, text: 'Never store or log a card number. Pay only with a network token and a code made for this one cart.' },
  'rail.installed': { version: 1, text: 'Pay a store only through a payment method Muse has installed and switched on. Otherwise the shopper checks out at the store.' },
  'rail.store_total': { version: 1, text: 'If a store does not return a total, Muse does not pay it. The shopper checks out at the store.' },
  'passkey.email_code': { version: 1, text: 'Setting up a passkey needs a 6-digit code emailed to the shopper. Five wrong tries cancel the code.' },
  'passkey.one_per_shopper': { version: 1, text: 'Each shopper has one passkey. A second one cannot be added from a signed-in session alone.' },
  'passkey.rate_limit': { version: 1, text: 'At most 3 setup codes per 15 minutes and 30 passkey prompts per 10 minutes for each shopper.' },
};

// Older versions, kept so past log entries can still be read: { 'id@vN': text }.
const RETIRED = {};

// Bump when any rule above changes, so a log entry shows the whole rulebook it ran under.
const RULEBOOK_VERSION = '2026-11-10.1';

const RESULTS = new Set(['pass', 'fail', 'not_applicable']);

/**
 * A citation for one rule, for the `rules` list of recordAgentEvent.
 * @param {string} id rule id from RULES
 * @param {'pass'|'fail'|'not_applicable'} result
 * @param {object} [values] the numbers or facts the rule compared, e.g. { approvedCents, chargedCents }
 */
function cite(id, result, values = undefined) {
  const rule = RULES[id];
  if (!rule) throw new Error(`Unknown agent rule "${id}"`);
  if (!RESULTS.has(result)) throw new Error(`Rule result must be pass, fail or not_applicable, got "${result}"`);
  const c = { rule: `${id}@v${rule.version}`, result, text: rule.text };
  if (values && Object.keys(values).length) c.values = values;
  return c;
}

/** The rule text an entry cited, including retired versions. */
function lookup(ref) {
  const [id, v] = String(ref).split('@v');
  const rule = RULES[id];
  if (rule && String(rule.version) === v) return rule.text;
  return RETIRED[ref] || null;
}

module.exports = { RULES, RETIRED, RULEBOOK_VERSION, cite, lookup };
