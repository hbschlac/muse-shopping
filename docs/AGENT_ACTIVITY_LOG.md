# Agent activity log

Every action and decision Muse's agent takes for a shopper is written to `agent_events`
through `src/services/agentAudit`. The log is for accountability and fraud review.

- **No manual migration.** The service creates the table on first use (`schema.js`, same DDL as
  migration 080, serialized with an advisory lock), because production migrations are run by hand.
- **Append-only.** The table rejects `UPDATE`, `DELETE` and `TRUNCATE` (migration 080).
- **Tamper-evident.** Each row's SHA-256 hash covers its content and the previous row's hash.
  `AgentAudit.verifyChain()` recomputes the chain and returns the first row that doesn't match.
- **No card data.** `redact()` strips card numbers (Luhn-checked, kept as last four), CVVs,
  network tokens, cryptograms, ECIs, Shop Tokens, passkey assertion data, auth headers,
  signatures and secrets before insert.

## Calling it

```js
const { recordAgentEvent } = require('../services/agentAudit');

await recordAgentEvent({
  actor: 'muse-agent',            // 'muse-agent' | 'shopper' | 'system' | 'store:<key>' | 'network:visa'
  action: 'checkout.created',     // from the catalogue below
  decision: 'info',               // 'info' | 'allowed' | 'blocked' | 'approved' | 'declined' | 'error'
  reason: 'Built checkout at Allbirds for 2 lines',
  userId, cartSessionId, checkoutIntentId, partnerKey, rail,
  amountCents, currency,
  details: { checkoutId, lineCount },  // redacted before storage
}, { required: false });
```

Pass `{ required: true }` for any event that records the shopper's approval or moves money.
If that write fails the call throws, and the caller must stop before paying. Other events
log the failure and let shopping continue.

## Event catalogue

Use these action names so one session's trail reads end to end.

| Action | Actor | When |
| --- | --- | --- |
| `product.checked` | muse-agent | Live price and stock read from the store before adding to cart |
| `cart.item_added` / `cart.item_rejected` | muse-agent | Line added, or refused (sold out, no variant) |
| `checkout.created` | muse-agent | `create_checkout` at a store |
| `checkout.prefilled` / `checkout.prefill_failed` | muse-agent | Buyer and shipping filled with `update_checkout` |
| `cart.prices_refreshed` | muse-agent | Cart prices updated from the store's checkout totals |
| `rail.selected` | muse-agent | Payment rail chosen for a store (`shop_pay`, `visa_ic`, `stripe_spt`, `handoff`), with the reason |
| `intent.created` | muse-agent | Checkout intent built: stores, ceilings, expiry |
| `intent.approved` / `intent.declined` | shopper | One confirm step for the cart (passkey). **required** |
| `intent.cancelled` / `intent.expired` | system | Intent ended without paying |
| `credential.issued` | network:visa, store:shop_pay | Per-cart network token and cryptogram issued (only last four and ids are kept). **required** |
| `payment.submitted` | muse-agent | `complete_checkout` sent to a store. **required** |
| `payment.completed` / `payment.failed` | store:<key> | Store's answer, with order id or error |
| `payment.blocked` | muse-agent | Agent refused to pay, e.g. price above the approved ceiling |
| `handoff.offered` | muse-agent | Store fell back to "Check out at {store}" |
| `passkey.*` | shopper | Face ID setup steps: `setup_code_sent`, `setup_code_ok`, `setup_code_wrong`, `registered`, `setup_failed`, `setup_refused`, `rate_limited` |
| `trail.viewed` | admin:<id> | Someone at Muse opened a trail |

Use one `cartSessionId` for everything from opening checkout to the last store's result, and
add `checkoutIntentId` once the shopper confirms.

## Items: exactly what was bought, and from whom

Cart, checkout, approval and payment entries carry the items (`details.items`, or the item fields
directly on `product.checked` / `cart.item_added`):

| Field | Meaning |
| --- | --- |
| `cartItemId`, `productId`, `variantId` | Muse's cart line and the store's product and variant ids |
| `title`, `variantTitle`, `size`, `color`, `quantity` | What the shopper chose |
| `cartPriceCents`, `storePriceCents` | Unit price in the Muse cart, and the price the store's checkout returned |
| `marketplace` | The marketplace checked out at (e.g. Walmart), null for a brand's own store |
| `sellerId`, `sellerName`, `fulfilledBy` | Who sells it and who ships it (a marketplace or a third-party seller) |
| `offerId`, `gtin` | The marketplace listing id and the barcode (UPC/GTIN), when the store gives them |

The review hash the shopper approves covers each store's items (ids, quantity, prices, seller,
offer), so a swapped size or seller needs a new approval. A partner is a marketplace when its
`partners.json` entry has `"marketplace": true`; its bridge returns `seller`, `fulfilledBy`,
`offerId` and `gtin` on products or variants.

## Rule citations: why the agent did what it did

Every decision names the rules it checked. Rules live in `src/services/agentAudit/rules.js`, each
with a permanent id and a version (`payment.ceiling@v1`). Cite them with `cite(id, result, values)`:

```js
const { recordAgentEvent, cite } = require('../services/agentAudit');

await recordAgentEvent({
  actor: 'muse-agent', action: 'payment.blocked', decision: 'blocked',
  reason: 'Store total 12500 is above the approved 12000', ...ctx,
  rules: [cite('payment.ceiling', 'fail', { approvedCents: 12000, chargedCents: 12500 })],
});
```

`result` is `pass`, `fail` or `not_applicable`; `values` are the facts the rule compared. The
citation (rule id and version, result, rule text, values) is stored in `details.rules` and is
covered by the row's hash. Every entry also stores `details.agent = { code, rulebook }`: the
deployed commit (`VERCEL_GIT_COMMIT_SHA`, first 12 characters) and the rulebook version.

To change what a rule does, bump its `version`, move the old text to `RETIRED` under
`'id@vN'`, and bump `RULEBOOK_VERSION`. Never reuse an id for a different rule.

| Rule | Cited on |
| --- | --- |
| `checkout.review_matches` | `intent.approved`, `intent.declined` |
| `checkout.not_expired` | `intent.created`, `intent.approved`, `intent.expired` |
| `checkout.shopper_approval` | `intent.approved`, `intent.declined`, `payment.submitted` |
| `checkout.one_confirm` | `intent.approved` |
| `checkout.ship_to_locked` | `intent.created`, `payment.submitted`, `payment.blocked`, `handoff.offered` |
| `payment.ceiling` | `intent.created`, `payment.submitted`, `payment.completed`, `payment.blocked` |
| `payment.logged_first` | `payment.submitted` |
| `payment.no_card_storage` | `payment.submitted` |
| `rail.installed` / `rail.store_total` | `intent.created`, `rail.selected`, `handoff.offered` |
| `passkey.email_code` / `passkey.one_per_shopper` / `passkey.rate_limit` | `passkey.*` |

## Ship-to lock

The address on the review screen is part of what the shopper approves: its hash is in
`summaryHash`, and it is stored on the intent (`ship_to`, `ship_to_hash`, migration 094).
`intent.created` logs only city, state, ZIP and the hash, never the street or name. Every rail
registers with `enforcesShipTo: true` and gets `store.shipTo` and `store.shipToHash` in `pay()`:
it must hash the store checkout's address with `shipToHashOf()` and refuse to pay if it differs.
If a rail returns a different `shipToHash`, Muse marks the store `blocked` and logs it. With no
address, every store hands off.

## Reading a trail (fraud review)

`GET /api/v1/admin/agent-trail?intent=ci_…` (or `?session=<cart session id>`), admin only,
returns every entry for that checkout in order: time in UTC and Pacific, who acted, the action,
decision and reason, store, amount, the rules cited, the code version, and `untampered` for each
entry (its hash matches and it follows the entry written before it). `intact` is false if any
entry fails. Viewing a trail is itself logged as `trail.viewed`. In code: `AgentAudit.getTrail()`.

## Card data rule

Muse never stores a card. Cards are captured in Visa-hosted fields or held in the shopper's
Shop Pay wallet. For each shopping session (cart) Muse gets a network token with a fresh
cryptogram scoped to that session's approved intent, uses it once per store, and never
writes the token or cryptogram anywhere, including this log.

## Where checkout writes these

`src/services/agentCheckout` (one review, one confirm, pay per store) writes `intent.created`,
`intent.approved` (required; `details.method` is `passkey` with the passkey's credential id once the shopper's passkey tap is verified), `intent.declined` / `intent.cancelled` / `intent.expired`,
`payment.submitted` (required, before each store is paid), `payment.completed` / `payment.failed`,
`payment.blocked` (store total above the approved ceiling) and `handoff.offered`. If a required
write fails, that store is not paid and falls back to its "Check out at {store}" link.
