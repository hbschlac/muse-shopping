# Agent activity log

Every action and decision Muse's agent takes for a shopper is written to `agent_events`
through `src/services/agentAudit`. The log is for accountability and fraud review.

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

Use one `cartSessionId` for everything from opening checkout to the last store's result, and
add `checkoutIntentId` once the shopper confirms.

## Card data rule

Muse never stores a card. Cards are captured in Visa-hosted fields or held in the shopper's
Shop Pay wallet. For each shopping session (cart) Muse gets a network token with a fresh
cryptogram scoped to that session's approved intent, uses it once per store, and never
writes the token or cryptogram anywhere, including this log.
