# When the agent goes wrong: rules and playbook

Plain-English rules for what Muse does if its shopping agent is hijacked (for example by
hidden text on a store page), confused, or simply doesn't follow the shopper's instructions.
Owner: hannah. Applies to one-tap agent checkout (`src/services/agentCheckout`).

## The rules Muse runs by

1. **No AI model can spend money.** Paying a store is fixed code. It pays only for the exact
   cart the shopper approved with Face ID: the same items, at most the approved price, shipped to
   the approved address. A test (`tests/services/noModelInMoneyPath.test.js`) fails the build if
   any payment file ever loads an AI model, directly or through another file.
2. **Store text is data, never instructions.** Everything Muse reads from a store (titles,
   descriptions, options, checkout messages) goes through `cleanStoreText()`
   (`src/utils/storeText.js`). It removes invisible characters, hidden markup and comments, so
   hidden words either disappear or show up as plain text a shopper can see. Store text never
   decides what to buy, how much to pay or where to ship.
3. **The approval is the contract.** The Face ID tap signs a hash of the items, prices, sellers
   and address (`summaryHash`). Each payment method must cap the charge and check the address
   itself before money moves (`enforcesCeiling`, `enforcesShipTo`).
4. **Tripwire.** If anything that should never happen does happen, Muse stops that payment,
   **pauses agent checkout for that shopper**, logs `agent.paused`, and emails
   `AGENT_ALERT_EMAIL` (default hannah@muse.shopping). It fires when:
   - a store charged more than the approved amount;
   - a store's checkout ships to a different address;
   - a confirm arrives for a cart different from the one reviewed.

   Only hannah can lift the pause.
5. **Everything is on the record.** Every step, the rules it checked, and the code version that
   ran are in the tamper-evident agent activity log (`docs/AGENT_ACTIVITY_LOG.md`).

## The self-repair job

The one place an AI reads store pages is the job that repairs store scripts
(`docs/SELF_REPAIR.md`).
- It has no keys.
- Its changes may only touch `extractors/`, and a test enforces that.
- Store scripts can't load anything else in the app.
- A repair auto-merges only when it changes just that store's script and its tests pass.

A hijacked repair can at worst break one store's listings, never checkout.

## Playbook: something went wrong

**1. Stop it (minutes).**
- One shopper: the tripwire already paused them. To pause someone by hand, ask Claude to add a
  hold for them.
- Everyone: in Vercel → muse-shopping → Settings → Environment Variables, delete
  `AGENT_CHECKOUT_ENABLED` (or set it to anything but `true`) for Production, then redeploy.
  Agent checkout and Face ID routes return 404. The cart still works, and shoppers check out on
  each store's own site.

**2. Look at what happened (same day).** Open the trail for the checkout from the alert email:
`GET /api/v1/admin/agent-trail?intent=<ci_… id>` as an admin, or ask Claude to pull it. It shows
what the shopper approved, what each store answered, which rule failed, and whether any log entry
was tampered with (`intact`).

**3. Undo the order (same day).**
- Cancel at the store: reply to the store's order email, or use its order page.
- If it won't cancel, ask for a return or refund.
- If the charge was wrong (more than approved, or a different address), the shopper can dispute
  it with their card. The trail is the evidence: what they approved versus what was charged.

**4. Tell the shopper (within 24 hours).** Say what happened, what was charged, what you've
cancelled, and that their checkout is paused until it's fixed.

**5. Fix the cause, then clear the hold.** Find which check should have stopped it and add a test
for that case. Then ask Claude to clear the hold. Clearing writes `cleared_at` and `cleared_by` on
the shopper's row in `agent_checkout_holds`.

## Who pays when the agent got it wrong

No card network has published a rule for "the agent bought the wrong thing" yet. Until Muse
decides its own policy (tracker: Legal entity → "who pays if Muse buys the wrong thing"), handle
each case by hand:
- the shopper approved it → treat it as a normal return;
- the store charged or shipped against the approval → dispute it with the store;
- Muse's own code was at fault → Muse makes the shopper whole.
