# Know Your Agent: Muse

**Agent:** Muse Shopping agent (`MuseShopping-Agent/1.0`)
**Agent profile (agent ID):** https://www.muse.shopping/.well-known/ucp
**This document:** https://www.muse.shopping/kya.md (source: `docs/KYA.md` in the muse-shopping repo)
**Last updated:** 2026-11-03

This page is for the teams that vet AI shopping agents: the Visa Intelligent Commerce and Trusted
Agent Protocol programs, Mastercard Agent Pay, American Express, Shopify, and any store that speaks
the Universal Commerce Protocol (UCP). It says what Muse's agent is, who runs it, what it does and
does not do, how it identifies itself, how checkout and payment work, and how shopper data is handled.

Every statement is marked **Live** (running in production on www.muse.shopping today), **In review**
(built, in an open pull request, not yet deployed) or **Planned** (not built yet). If a status here
is out of date, the repo is the source of truth.

---

## 1. Summary

Muse (www.muse.shopping) is a personal shopping app for women's fashion and beauty. Shoppers follow
the stores and brands they like and get one feed of new and relevant items across them.

Muse's agent is the part of Muse that talks to stores on the shopper's behalf. It does three things:

1. **Searches** product catalogs at partner stores, through the agent endpoints those stores publish.
2. **Reads** live product details (price, sizes, stock) for items the shopper looks at or puts in the
   Muse cart.
3. **Builds a checkout at the store** and sends the shopper to the store's own checkout page to pay.

Muse's agent does **not** pay. It never sees, stores or forwards a card number, and it never places
an order without the shopper finishing checkout themselves on the store's site. The store is the
merchant of record for every order.

## 2. Operator

| | |
|---|---|
| Product | Muse Shopping, www.muse.shopping |
| Legal entity | None yet. Muse is an independent side project run by its founder; no company has been formed. This section will be updated when one is. |
| Founder / accountable owner | `[PLACEHOLDER: name]` |
| Security contact | `[PLACEHOLDER: e.g. security@muse.shopping]` |
| Partnerships / agent program contact | `[PLACEHOLDER: e.g. partners@muse.shopping]` |
| Legal contact | legal@muse.shopping (listed in the Muse Terms of Service; `[PLACEHOLDER: confirm]`) |
| Operating region | United States (`[PLACEHOLDER: confirm]`) |
| Hosting | Vercel (application), Neon (Postgres database) |

## 3. What the agent does

### 3.1 Talks to stores through their published agent protocols (Live)

Muse reaches stores only through the agent interfaces the store itself publishes. Muse checks each
store's `/.well-known/ucp` (and `/.well-known/acp.json`) manifest and adds a store to its partner
list only when that manifest exists. Stores that publish nothing are not called by the agent.

- **Protocol:** Universal Commerce Protocol, version `2026-08-25`, over MCP (JSON-RPC). For Shopify
  stores this is `https://{shop}.myshopify.com/api/ucp/mcp`.
- **Partners as of 2026-11-02:** 70 fashion and beauty stores whose manifests were checked on that
  date; 67 over UCP/MCP (almost all Shopify) and 3 over UCP REST, which Muse does not call yet.
  The list is in `src/services/agentBridges/partners.json` and is rebuilt by
  `scripts/probe-agent-stores.js`.
- **UCP capabilities used:** `dev.ucp.shopping.catalog.search`, `dev.ucp.shopping.catalog.lookup`,
  `dev.ucp.shopping.cart`, `dev.ucp.shopping.checkout`.
- **Calls made:** catalog search, product lookup, cart creation, and checkout creation
  (`create_checkout`). Muse does **not** call `complete_checkout`.

### 3.2 Muse cart with "Check out at store" (In review)

Shoppers can put partner-store items in the Muse cart. When an item is added, Muse re-reads it from
the store so the price, size and stock match what the store says. At checkout Muse groups items by
store, builds one checkout at each store, and gives the shopper each store's `continue_url`. The
shopper pays on the store's page. Muse never charges for these items.

### 3.3 Muse's own MCP server (In review)

Muse publishes an MCP endpoint at `https://www.muse.shopping/api/v1/mcp` so other assistants can
search the same partner stores. Tools: `list_stores`, `search_products`, `get_product`,
`start_checkout`. Results carry Muse's own rule-based item tags (category, color, material, fit,
occasion, sizes in stock, on sale). `start_checkout` only returns the store's `continue_url`. The
endpoint takes no payment data and holds no shopper account data.

### 3.4 Item tagging (In review)

Muse tags items with fixed keyword rules (no model calls). Tags come only from the store's own
product data.

### 3.5 Other ways Muse gets product data (not the agent)

For a few large stores that do not publish agent endpoints (Nordstrom, Nordstrom Rack, TJ Maxx),
Muse's operator runs product-listing collectors from a personal computer, not from Muse's servers
and not under the agent's identity. They read public listing pages only, never log in, never add to
cart and never check out. They are listed here for completeness and are not part of the agent this
document describes.

## 4. What the agent does not do

- It does not pay, hold a payment credential, or ask a shopper for card details.
- It does not finish a checkout. The shopper always completes the purchase on the store's own page.
- It does not use a hidden or headless browser to place orders, fill forms or get past bot checks.
  (Muse removed its headless checkout code on 2026-11-02 and will not bring it back.)
- It does not log in to a shopper's store account.
- It does not call stores that have not published an agent endpoint.
- It does not act on its own initiative. Every call is triggered by a shopper action in the app
  (searching, opening an item, adding to cart, tapping checkout) or by a feed refresh.
- It is not a chat assistant. Muse's AI chat feature is turned off and stays off; no language model
  decides what the agent buys.

## 5. How the agent identifies itself

### 5.1 UCP agent profile (Live)

Every UCP call carries Muse's profile URL in `meta["ucp-agent"].profile`:

```
https://www.muse.shopping/.well-known/ucp
```

Stores fetch that document (served as `application/json`) to see which UCP services and capabilities
Muse supports. Its `payment_handlers` registry is empty on purpose: Muse has no delegated-payment
handler.

### 5.2 User-Agent (Live)

```
MuseShopping-Agent/1.0 (+https://www.muse.shopping/.well-known/ucp)
```

### 5.3 Request signing keys (Planned)

- **Web Bot Auth / TAP signing key:** an **Ed25519** key (what Cloudflare's Web Bot Auth requires
  and Visa's TAP reference code uses). Muse will sign outbound agent requests with HTTP Message
  Signatures (RFC 9421: `Signature`, `Signature-Input`, `Signature-Agent` headers) and publish the
  public key at `https://www.muse.shopping/.well-known/http-message-signatures-directory`.
  `[PLACEHOLDER: key ID(s) and thumbprint once generated]`
- **UCP signed tier:** the UCP profile has its own `keys` array for UCP request signatures. It is
  **empty today**, so Muse calls stores unsigned.
- **Key custody:** the private key is created and held in Google Cloud KMS and cannot be exported.
  Production signs through KMS using Vercel's OIDC identity, so the key never sits in the repo, in
  environment variables, or in this document, and no language model can reach it.
- **Rotation and revocation:** rotated at least every `[PLACEHOLDER]` days and immediately on
  suspected exposure; revoked by removing it from the directory and disabling it in KMS.
- **Registration (all pending):**
  - Cloudflare verified bots: Bot Submission Form, "Request Signature" method.
    `[PLACEHOLDER: status]`
  - Visa Trusted Agent Protocol agent directory: through Visa onboarding (Visa publishes no
    self-serve form). `[PLACEHOLDER: status]`
  - Akamai: `[PLACEHOLDER: route and status]`
  - Mastercard Agent Pay agent directory: `[PLACEHOLDER: route and status]`

## 6. Checkout and payment

| Step | Who does it | Status |
|---|---|---|
| Shopper picks items and sizes | Shopper, in Muse | Live |
| Muse builds a checkout at the store (`create_checkout`) | Muse agent | Live in the bridge layer; cart flow In review |
| Muse passes the shopper's email to prefill the store checkout | Muse agent | In review |
| Shopper is sent to the store's `continue_url` | Muse | Live / In review |
| Shopper enters payment and places the order | Shopper, on the store's site | Live |
| Payment authorization, fraud checks, fulfillment, returns | Store (merchant of record) and its processor | Live |

**Muse is never the merchant of record and never handles payment credentials for these orders.**
Because the shopper confirms the order on the store's own checkout, the store gets the same signals
it gets from any direct shopper.

**Card-network agent tokens (Planned, not committed).** If Muse ever completes a purchase for the
shopper, it would use only agent-scoped credentials issued for Muse (Visa Intelligent Commerce
tokens, Mastercard Agent Pay tokens, or a store-approved handler such as Shop Pay or a Stripe shared
payment token), with a passkey or equivalent approval by the shopper for each cart, and spending
rules the shopper sets. The current plan:

- **Visa first, through Visa Acceptance.** Muse would join Visa Intelligent Commerce Connect under
  Visa Acceptance as an enabler, with IDs issued by a Visa Acceptance account manager, not as its
  own token requestor. Calls go through Visa's MCP server: one payment mandate per store, capped at
  that store's quoted total and expiring after about 30 minutes; payment credentials retrieved per
  store; transaction events confirmed back to Visa.
- **Card entry in hosted fields.** Card details would be typed into Visa Acceptance Microform hosted
  fields, so the card number is encrypted in the shopper's browser and Muse holds only tokens. Visa
  says this can qualify for PCI SAQ A; that is not yet confirmed for Intelligent Commerce.
- **Shopify stores:** Shop Pay identity-linked tokens.
- **Mastercard Agent Pay and American Express** would follow behind the same interface.

A Visa Acceptance sandbox client exists and runs only on preview deployments; nothing in this
list runs in production. Muse would update this document and the profile's `payment_handlers`
before turning any of it on.

**Muse's older in-app checkout (not the agent).** Muse still has an earlier checkout for stores it
works with directly, where the card is tokenized by Stripe and Muse stores only the Stripe
payment-method ID. It does not use the agent identity above and does not touch partner (UCP) stores.

## 7. Shopper consent and approval

- Shoppers have a Muse account and sign in (email or Google).
- Every agent call to a store follows a shopper action or a feed refresh for that shopper. There is
  no background buying.
- No order can be placed without the shopper finishing checkout on the store's own page. That page is
  the approval step today.
- Before Muse ever pays for a shopper (section 6), it would require one explicit confirm step per
  cart on a channel the agent cannot control. Visa passkeys are bound to a device and a card, so
  that is one passkey tap for each card used in the cart. Final-sale items, a new ship-to address,
  a new store, or a purchase near the shopper's limit get extra confirmation. (Planned.)

## 8. Data handling

**What Muse sends to a store**
- Search queries and filters the shopper entered.
- Product and variant IDs and quantities for cart and checkout.
- The shopper's account email, to prefill the store's checkout (In review). Nothing else about the
  shopper.

**What Muse keeps from stores**
- For cart lines: the store's variant ID, price, size and stock at the time the item was added.
- Muse's own tags for items.
- `[PLACEHOLDER: confirm retention policy for cached store product data]`

**What Muse never receives or stores**
- Card numbers, CVVs, or bank details for partner-store orders.
- The shopper's store account credentials.

**Shopper data Muse holds for its own features** (not sent to stores): account details, saved
items, style preferences, and, only if the shopper connects them, read-only Gmail access (to find
the brands they already buy from) and Instagram (for style). Shoppers can turn these off, export
their data and delete their account from Profile → Privacy.

**Storage and access:** Postgres on Neon, application on Vercel, encrypted in transit (TLS).
Secrets live in Vercel environment variables, not in the code.
`[PLACEHOLDER: encryption at rest, staff access, breach notification commitment]`

**Privacy policy:** `[PLACEHOLDER: public privacy policy URL]`
**Terms of Service:** https://www.muse.shopping/terms

## 9. Safety controls

- **Allow-list of stores.** The agent only calls stores in its partner list, each with a checked
  agent manifest.
- **Timeouts and fan-out limits.** Search hits at most 12 stores at once with a 6 second timeout;
  checkout calls time out after 10 seconds.
- **Fixed code paths.** Search, cart and checkout calls are written in code, not chosen by a model,
  so a prompt cannot make the agent call a new store or a new endpoint.
- **No payment authority.** With no payment handler and no `complete_checkout`, a compromised Muse
  agent cannot spend a shopper's money.
- **Read-only public MCP.** Muse's MCP endpoint (In review) exposes catalog search and checkout links
  only; it has no access to shopper accounts.
- **Rate limits and abuse response:** `[PLACEHOLDER: per-store request limits; how a store reports abuse and how fast Muse stops]`

## 10. How a store or network can verify Muse

1. Fetch https://www.muse.shopping/.well-known/ucp and check it returns `application/json`.
2. Check the `User-Agent` and the `meta["ucp-agent"].profile` value on incoming calls.
3. Once signing is live: verify the RFC 9421 signature against the key in the profile or the Web Bot
   Auth key directory, or through the Visa TAP directory at your CDN.
4. To block, rate-limit or report Muse, write to `[PLACEHOLDER: partners/security contact]`. Muse
   will remove a store from its partner list on request.

## 11. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Planned payment path: ICC via Visa Acceptance as enabler, Microform hosted fields, Shop Pay tokens; one confirm step per cart. |
| 2026-11-03 | Operator: no legal entity yet (side project). Signing key: Ed25519 in Cloud KMS. Planned Visa Intelligent Commerce flow named. |
| 2026-11-02 | First version. UCP bridges and agent profile live; cart handoff and Muse MCP server in review; signing keys, Web Bot Auth and TAP registration planned. |
