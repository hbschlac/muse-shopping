# Agentic commerce: research notes

*Compiled Oct 2026 from research done Oct 12–20, 2026. Company facts are dated; anything a primary
source didn't confirm is marked. Not legal or financial advice.*

**Name check:** "Meta Muse" below is Meta's personal shopping agent (launched Sep 8, 2026). It is not
muse.shopping, this repo. Every mention of Meta's product says "Meta Muse".

**Contents:** 1. What it is · 2. How a card payment works today · 3. What changes with agents ·
4. Protocols and standards · 5. Card networks · 6. Wallets, processors and the four payment paths ·
7. What happened in the market · 8. Risk and trust · 9. Demand data · 10. Control ideas ·
11. What this means for muse.shopping · 12. Glossary · 13. Sources

---

## 1. What agentic commerce is

Every payment system today assumes **a human clicked "buy."** In agentic commerce you tell an AI
helper "running shoes, size 9, under $120, by Friday," and it finds, picks **and pays**.

The new party is the **agent platform** (ChatGPT, Meta Muse, Perplexity, Claude). It sits between the
shopper and the store and holds the shopper's permission.

The risk problem in one line: fraud tools are built to spot a robot pretending to be you. Now the
robot is supposed to be you.

## 2. How a card payment works today

```
You (cardholder) ──► Merchant ──► Acquirer ──► Visa/Mastercard ──► Issuer
   pays             sells         merchant's    the road + rules     your bank
                                  bank                               decides
          ◄──────────────── approve / decline (~2 seconds) ◄──────────────
```

| Player | Plain words |
|---|---|
| Cardholder | You. |
| Merchant | The store. |
| Acquirer | The store's bank for card payments (e.g. Chase's merchant side, Fiserv, Worldpay, Adyen). It only *carries* the request and later *receives* the money. Processors like Cybersource (Visa-owned) and Stripe sit beside it. |
| Network (Visa, Mastercard) | The road and the rules between the banks. Scores and routes; never approves; doesn't lend money or take credit risk. |
| Issuer | Your bank. Issues the card, **decides yes or no**, carries your credit, earns interchange. |

**Three moments:**
1. **Authorize** (~2 seconds): "can she pay?" goes out and "approved" comes back. No money moves.
2. **Clear and settle** (usually end of day, in batch files): money moves issuer → network → acquirer → merchant.
3. **Dispute / chargeback** (weeks later): you tell your bank "I didn't buy this"; the merchant answers with evidence ("representment"); network rules decide.

**Rough economics of a $100 US credit purchase:** merchant keeps ~$97.50, issuer earns ~$2
(interchange), acquirer/processor ~30¢, Visa ~10–15¢.

**The liability rule:** online (card-not-present) fraud is paid by the **merchant** by default. If the
purchase was authenticated (3-D Secure or a passkey), the bill shifts to the **issuer**. Authentication
decides who pays, which is why it matters so much for agents.

**Tokens:** a stand-in for the card number, locked to one merchant, device or agent. Steal it and it's
useless elsewhere; cancel it and the real card keeps working. That makes tokens the natural "agent card."

**Two highways:** the public internet (HTTPS) carries agent ↔ API, agent ↔ store website, and
store ↔ gateway traffic. Card networks run a private network (VisaNet) that only member banks and
processors connect to; authorizations travel as compact, standard messages (ISO 8583; general industry
knowledge). Settlement is the nightly batch.

## 3. What changes with agents

**The rails (authorize → settle → dispute) mostly stay the same. Three things change:** who is buying
(identity), did the user mean it (intent), and who pays when it's wrong (liability). Caveat:
stablecoin and machine-to-machine payments *are* new rails.

### The five assumptions an agent breaks

| Old assumption | What breaks | Control |
|---|---|---|
| A human is at the keyboard | Bot defenses block good agents; bad bots pose as agents | Agent identity (signed agent traffic, a directory of verified agents) |
| The owner typed the card | Agents shouldn't hold raw card numbers | Agent-bound tokens with limits |
| The buyer meant to buy this | The agent misreads, or is tricked | Signed instruction plus spend controls; ask again when a purchase drifts |
| Fraud signals = device, typing, mouse | Behavioral signals see an agent, not you | New signals: agent reputation, instruction-to-purchase match |
| Dispute = "I didn't authorize it" | "My agent did it" has no rule yet | Evidence: the instruction attached to the transaction |

### How an agent actually checks out

1. **Browser:** the agent drives a real browser in a cloud sandbox, enters a token or virtual card, and
   clicks Buy. Most common. Bot defenses (Cloudflare, Akamai) are the obstacle.
2. **API / protocol** (ACP, Shopify's checkout APIs): the agent posts the order plus a payment token.
   Each merchant has to integrate.
3. **Wallet button:** the agent pays through a wallet the store already accepts.

### Vocabulary

- **Model** = the brain. **Harness** = the loop around it (look, decide, use a tool, check).
  **Agent** = model + harness + tools + a goal. **Session** = one job (one shopping trip).
  **Sandbox** = the isolated browser or computer it works in.
- **Workflow vs agent:** if the steps are fixed, it's a workflow; if the AI decides the steps, it's an agent.
- **The session is where intent lives:** one instruction can now produce many purchases at many stores.
- **Sandboxes:** fresh each time (forgets logins and looks like a new device, so more false declines)
  vs persistent (Meta Muse runs a dedicated cloud computer with a visible browser: convenient, but one
  break-in exposes every account).
- **Store agent vs your agent:** a store's agent (Walmart's Sparky, Amazon's Rufus) shops one store and
  the store is accountable. Your agent shops many stores, and a new middleman is accountable, with no rule yet.
- **The invisible agent:** an agent that logs in as you and uses your saved card looks exactly like you
  to the bank: no agent signal, no evidence when it goes wrong. Agent identity and agent tokens exist to
  make agents visible.

### Two rankings, don't mix them

| | Who | Ranks | Attributes | Tradeoffs |
|---|---|---|---|---|
| Offer ranking | the agent | stores and products | total price, delivery date, seller trust, returns, fit, stock | cheap vs trusted, fast vs cheap; **whose interest?** (fee-per-sale bias) |
| Risk scoring | network + issuer | the payment | agent verified, agent dispute history, last passkey, request match, new ship-to, store fraud history, velocity | fraud vs false declines vs friction vs privacy vs ~2-second latency |

Agent ranking is a marketplace "buy box" with no owner: the agent company ranks, sellers are anywhere
on the web, and the network moves the money. Games that carry over: a fake-low price that changes at
checkout, daily price churn, delivery promises not kept, fake reviews, hidden text aimed at the agent,
scam storefronts.

## 4. Protocols and standards

| Name | Who | What it does | Status (dated) |
|---|---|---|---|
| **Trusted Agent Protocol (TAP)** | Visa, with Cloudflare; Akamai joined Dec 2025 | Signed agent traffic so a store can tell a verified agent from a bad bot; carries intent (browse vs buy), who it shops for, how it will pay | Launched Oct 2025 with 10+ partners |
| **Web Bot Auth** | IETF draft, Cloudflare-led | How bots sign requests, built on **HTTP Message Signatures (RFC 9421)** | Draft standard |
| **Agentic Commerce Protocol (ACP)** | OpenAI + Stripe | Agent-to-merchant checkout; each merchant integrates | Launched Sep 2025; still used for discovery and app purchases |
| **Universal Commerce Protocol (UCP)** | Google + Shopify (with Etsy, Wayfair, Target, Walmart) | Open standard for agents to discover, cart and buy from participating merchants; merchant stays merchant of record | Announced Jan 11, 2026 (NRF); Visa, Mastercard, Stripe, Amex among endorsers |
| **Agent Payments Protocol (AP2)** | Google | Signed "mandates" (intent mandate, cart mandate) as proof of what the user authorized | Visa and Mastercard joined |
| **Machine Payments Protocol (MPP)** | Stripe + Tempo | Machine-to-machine payments | 2026 |
| **x402** | Coinbase | HTTP-native payments, typically stablecoins | Live; volumes not tracked here |
| **Model Context Protocol (MCP)** | Anthropic-originated, open | How an agent plugs into tools and data. **Not** a payment or identity protocol | Visa runs an MCP server (Sep 2025) |

**The door vs the register (TAP vs token).** At the door (browsing), the agent company signs each
request with its private key; Visa (or Mastercard) publishes the matching public keys in a directory;
Cloudflare or Akamai checks the signature for the store, and the store sets the policy ("let registered
agents in"). Each signature is bound to one site and page and expires in minutes, so it can't be replayed.
At the register (paying), the agent hands over a **token plus a one-time cryptogram** that the network
generated; the network checks it, swaps the token for the real card number, adds a risk score, and the
issuer decides. **TAP proves which agent company; it doesn't prove what the user wants, and it doesn't
travel with the payment.**

**Key leaks:** the signing key is long-lived and per agent company. Leak paths: server breach, insider,
key committed to code, poisoned dependency, a key the model itself can reach. Defenses: keys in locked
hardware, rotation, instant revocation from the directory, short-lived signatures. A hijacked real agent
still wears a real badge.

**API vs MCP:** same data, different driver. An API call is written by a developer and is predictable
and auditable; an MCP server describes the same calls as tools a model can choose to call (the server's
code makes the API call underneath). Expect builders to keep fixed code paths for money steps (tokens,
credentials) and use MCP for lookups and setup (judgment, not a published practice).

**KYA (know your agent):** vetting the agent company once (entity, purpose, key security, prompt-injection
defenses, user authentication, data handling). Visa's criteria aren't public.

## 5. Card networks

### Visa Intelligent Commerce (VIC)

**In one line:** Visa's kit for letting an AI agent pay with a Visa card safely: a card copy just for
that agent, the user's OK by passkey, the user's rules attached, and data sent back so the bank can say yes.

**Parts:**
- **Agent tokens ("AI-ready cards"):** one token per agent per card; the agent never sees the card
  number; kill one agent's token and the card keeps working. Per purchase, a one-time cryptogram.
- **Passkey consent:** Visa Payment Passkeys (face, fingerprint) confirm the user when connecting an
  agent and when a purchase drifts. In Europe they also meet Strong Customer Authentication.
- **Payment instructions:** the user's rules travel with the token request (amount, merchant type, time
  window, when to ask first). Exact fields and how Visa checks them aren't public.
- **Commerce signals:** purchase details flow back to Visa and the issuer for approvals and disputes.
- **Personalization (opt-in):** consented Visa spend insights to sharpen an agent's picks.
- **Developer access:** APIs on the Visa Developer Center (free sandbox, production by contract); an MCP
  server (Sep 4, 2025); an Acceptance Agent Toolkit (pilot) for invoices and pay links.
- **Around it:** TAP; **Intelligent Commerce Connect** (one integration for merchants and agent builders;
  supports TAP, ACP, UCP and MPP, and non-Visa cards); **Agent Score** (is a store's site agent-ready?);
  the **Agentic Directory** (verified agents and merchants); token assurance (a trust score per token);
  **Agentic Ready** (a program that gets banks ready).

**Timeline:**

| When | What happened |
|---|---|
| Apr 30, 2025 | Launched at Visa's Global Product Drop. Partners named: Anthropic, IBM, Microsoft, Mistral, OpenAI, Perplexity, Samsung, Stripe. Mastercard announced Agent Pay the day before. |
| Sep 4, 2025 | MCP server for developers; Acceptance Agent Toolkit in pilot. |
| Oct 2025 | Trusted Agent Protocol, with Cloudflare and 10+ partners. |
| Dec 18, 2025 | "Hundreds" of real agent purchases in a US closed beta (Skyfire, Nekuda, PayOS, Ramp). 100+ partners, 30+ building in the sandbox. Akamai joins TAP. Prediction: millions of shoppers using agents by holiday 2026. |
| Feb 18, 2026 | DBS and POSB (Singapore): first Asia Pacific bank pilot, starting with food and drink purchases. |
| Apr 8, 2026 | Intelligent Commerce Connect, in pilot with Aldar, AWS, Diddo, Highnote, Mesh, Payabli, Sumvin. |
| Apr 29, 2026 | Agentic Ready goes global: 20+ partners live in the UK and Europe; 85+ planned in Asia Pacific and Latin America. US VIC has "live transactions taking place today." |
| Jun 10, 2026 | Payments Forum: OpenAI partnership, Agent Score, Agentic Directory, Large Transaction Model (a fraud foundation model), token assurance signal, a command-line pay demo. |
| Jul 2, 2026 | Europe: 31 banks (Barclays, HSBC UK, Revolut, BBVA, ING and more) completed live agent purchases at independent merchants such as lastminute.com and Frasers, all with passkeys. Next: business payments. |
| Jul 28, 2026 | Earnings call: CEO Ryan McInerney calls agentic commerce "a when, not an if." Meta partnership: "new ways to pay across Facebook and Instagram, powered by Visa Intelligent Commerce" (details not public). |

**Positioning:** "the trust, controls and connectivity" for agents to "securely discover, initiate and
complete transactions." Not the agent, but the trusted way to pay inside every agent. Open on purpose
(supports rival protocols and, through Connect, non-Visa cards). Uses existing cards, merchants and rails,
so stores don't build a new checkout. Jack Forestell (Chief Product & Strategy Officer): "AI is
transforming the front end of commerce. Stablecoins are reshaping the back end."

**Strengths:** near-universal acceptance; proven token infrastructure; trust (61% would trust Visa with
agent purchases vs 23% who trust GenAI to pay, Visa Trust Index, Sep 2026); momentum (OpenAI, Meta, 100+
partners, 31 European banks); network-scale risk data (Featurespace, Large Transaction Model); passkeys
that satisfy European authentication rules.

**Weaknesses and open gaps:**
- **Disputes and liability aren't written yet:** no published rule for "my agent bought the wrong thing."
- **Scale is unproven:** "hundreds" of purchases (Dec 2025) vs a millions-of-shoppers goal for holiday
  2026; no public count since.
- **Demand isn't in Visa's hands** (see section 9).
- **Visa can go blind** when agents pay through staged wallets or single-use cards (section 6).
- **Too many protocols:** merchants integrate several times; Connect is the answer, still in pilot.
- **Agent platforms own the customer** and can push on pricing or route around the network.
- **Banks have to move:** thousands of issuers must turn on agent tokens and controls.
- **Many announcements, few dates:** Agent Score, the Directory, the Large Transaction Model and the
  OpenAI integration had no public availability dates as of Oct 2026.

**Roadmap (announced):** Connect's wider rollout across 2026; Agentic Ready to 85+ partners in Asia
Pacific and Latin America and to business payments in Europe; OpenAI and Meta integrations (no dates);
the MCP server to cover Visa's full API portfolio; the holiday 2026 "millions" test.

### Mastercard Agent Pay

Launched Apr 29, 2025. **Agentic tokens** bound to one agent and the cardholder's limits, built on
Mastercard's existing token service. Mastercard said (Sep 2025) all US cardholders would be enabled by
mid-November 2025 (not independently confirmed here). Also uses Web Bot Auth and hosts its own directory
of registered agents. Same four-party model as Visa: the race is bank enablement, approval rates and liability.

### American Express

Three-party: Amex is both network and issuer (and often the acquirer), so it can promise liability on
its own. Reportedly covers erroneous purchases by registered agents.

## 6. Wallets, processors and the four payment paths

**Stripe** is a merchant-side processor, not a network, but it owns much of the agent-facing layer:
ACP (with OpenAI), **Shared Payment Tokens (SPT)**, the **Link** agent wallet (Apr 2026), Bridge
(stablecoins), and Tempo with the Machine Payments Protocol. **Link for agents:** the agent connects to
the user's Link wallet via OAuth, makes a spend request, the user approves, and the agent gets a one-time
card or SPT, never the real card. Stripe has said unattended spending ("act without asking") and limits
are coming (reported, unconfirmed).

**Pass-through vs staged wallets:** a pass-through wallet (Apple Pay, Google Pay, Shop Pay) hands a
network token to the store, so the network sees the real merchant. A staged wallet (PayPal) pays the store
itself and charges your card separately, so the network sees only "PayPal". In agentic, the wallet is the
agent's purse; staged wallets hide signals; a wallet takeover exposes every card.

| Path | How it works / what the network sees | Tradeoffs | Risks |
|---|---|---|---|
| 1. Direct (network agent token, e.g. VIC; the Visa–OpenAI deal) | Agent's own token + one-time cryptogram; real store; issuer decides with agent signals | Best signal and approvals, one dispute rulebook, per-agent kill switch; slower: per-network integration, contracts, vetting | Concentration (one platform, millions of tokens); the agent can misreport the item |
| 2. Pass-through wallet (Apple Pay, Google Pay, Shop Pay) | One network token per card + cryptogram; real store; no agent signal | Accepted widely, cards saved, strong against stolen numbers; can't cut off one agent | Invisible agent; no evidence for "my agent did it"; wallet takeover |
| 3. Staged wallet (PayPal) | Bank approves a charge to PayPal; PayPal pays the store | One integration, reach, buyer protection; store and item data lost to the network | Network blind to agent and store; wallet's dispute rules apply first |
| 4. Single-use virtual card (Stripe Link) | User approves each spend; Stripe issues a one-time card (or SPT); that card's issuer approves at the store; Stripe charges the saved card separately | Fastest launch, works anywhere, per-purchase approval, damage capped at one purchase; Stripe holds data and economics | Network and the user's bank can't see agent or item; disputes split |

**What the network sees in every path:** amount, store name and location, store category code ("shoe
store", not "running shoes"), time, card or token. Not the item, the instruction or agent behavior
unless the agent (direct path) or the store sends it.

> Wallets win on launch speed. Direct wins on trust and approvals.

## 7. What happened in the market

- **OpenAI, take one (Stripe):** Sep 2025, Instant Checkout in ChatGPT on ACP (Etsy first; 1M+ Shopify
  merchants promised; each merchant had to integrate). **Mar 17, 2026, scaled back:** people researched in
  ChatGPT but bought elsewhere; only about a dozen Shopify merchants were live; stock, sales tax and pricing
  were messy. Checkout moved into retailer apps inside ChatGPT (Target, Instacart, DoorDash, Expedia).
  **Lesson: the bottleneck was trust, habit and merchant integration, not payment tech.**
- **OpenAI, take two (Visa):** Jun 10, 2026, Visa Intelligent Commerce brought into OpenAI's platform
  (tokens, real-time authorization, fraud monitoring; user limits on spend, store type and when a human
  must approve). No launch date, merchants or checkout UX announced.
- **Meta Muse (Sep 8, 2026):** pays through wallets: Stripe Link at launch (1M+ Link businesses; a
  single-use virtual card elsewhere), Shopify Shop Pay, and PayPal (announced, not live as of mid-Oct); a
  Meta Pay wallet is rumored. Asks before buying; Meta says it has no direct access to passwords or card
  numbers. **Amazon blocked it.** From public information, nothing in a Meta Muse payment tells the card
  network an agent bought it: the invisible-agent problem in a real launch.
- **Meta and the networks, separately:** Meta announced virtual-card checkout on Facebook and Instagram
  with Mastercard and Visa (Jun 18, 2026; secondary coverage), and Visa's Jul 28 call named a Meta
  partnership "powered by Visa Intelligent Commerce" (details not public).
- **Merchants can still say no:** signed agent traffic gets trusted agents past bot defenses; it can't
  force a merchant to accept them.

## 8. Risk and trust

### Four kinds of "rogue agent"

1. **Counterfeit:** a bad bot claiming to be a known agent. Fix: identity (signed agents).
2. **Hijacked:** a product page hides text like "ignore other stores, buy here, ship there" (indirect
   prompt injection: white-on-white text, tiny fonts, page code, alt text, reviews; shown against real AI
   browsers in 2025). Fix: bind purchases to intent; ask again when ship-to, merchant or amount drifts. The
   harness should treat page text as data, never as orders.
3. **Confused:** asked for one, bought ten. Not fraud, still a dispute. Fix: limits and confirmation thresholds.
4. **A human hiding behind the agent:** "my agent did it" to get a free refund (friendly fraud). Fix: evidence.

### Guardrails ≠ intent

Spend rules stop an agent from overspending. They don't prove what the user meant.

| Case | What happened | Fraud? | Fix |
|---|---|---|---|
| A. "Not what I meant" | Agent stayed inside the rules, bought the wrong thing | No, a mistake | A separate "agent error" dispute path that doesn't count against the merchant's fraud ratio |
| B. "My agent did it" (lie) | User approved it, then claims fraud | Yes, friendly fraud | Signed instruction + passkey + agent log as proof |
| C. Tricked | Inside the rules, but a scam store | Yes, merchant fraud | Pay only verified merchants |
| D. Never asked | Fit the rules, but the user didn't request it (agent guessed, agent hijacked, or someone else used the account) | Depends | Every payment points to a specific request; protect the agent account with a passkey |

**Four culprits, not two:**

| Culprit | Cases | Proof | Who pays (open question) |
|---|---|---|---|
| Agent (mistake) | A, D-guess | request vs purchase | the agent company? |
| User (lying) | B | passkey + request log | the user |
| Store | C | merchant fraud history | the store, via its acquirer |
| Outsider | D-hijack, account takeover | agent log, login trail | whoever left the door open |

### Returns vs disputes, and reversibility

Card dispute categories cover fraud, authorization, processing errors and consumer disputes (not
received, not as described, cancelled, refund not processed). **"Changed my mind" isn't one.** So an
agent's wrong pick from a no-returns or made-to-order store leaves the user stuck. Treat reversibility as
a risk level:

| Type | Rule |
|---|---|
| Returnable | Agent can buy within limits |
| Final sale | Ask first |
| Made-to-order | Always ask |
| Digital goods | Always ask (instant, can't be undone) |
| Gift cards | Always ask (fraudsters' favorite) |

### Approval methods

A **passkey** is a key on the device unlocked by face, fingerprint, device PIN or a hardware key (or a
phone QR scan from a laptop or TV). Weaker options, strongest first: bank-app push, 3-D Secure challenge,
SMS or email code (SIM-swap risk), "reply YES" text, voice (deepfakes). **Principle: the agent must never
be able to approve its own purchase;** approval comes from a channel it can't control. A passkey proves a
human approved; it doesn't prove the agent followed the instruction, wasn't steered, or that the human
stays honest.

### Signals, before and after agents

- **Before:** device, IP, typing and mouse behavior, CVV/AVS, billing vs ship-to, account age, velocity,
  merchant category, amount vs history, 3-D Secure.
- **After:** agent identity and reputation, instruction ID and match, time since passkey, human present or
  not, session fan-out, reversibility, merchant trust, user confirmed. What breaks: the "device" is a cloud
  sandbox (always new) and behavior runs at machine speed. A legitimate agent splitting one purchase across
  merchants looks like card testing to today's models (Forestell).

### Merchant fraud monitoring

**VAMP** (Visa Acquirer Monitoring Program) = (fraud reports + disputes) ÷ settled transactions. The
merchant "excessive" level dropped from 2.2% to 1.5% on Apr 1, 2026 (US, Canada, EU, Asia Pacific). Fees
hit acquirers, then pass to merchants. **Compelling Evidence 3.0** lets merchants fight friendly fraud with
past-purchase evidence; qualifying fraud reports are excluded from the VAMP count.

### Threats over the next 2–5 years

Hijacking via prompt injection at scale; concentration (one breached agent platform exposes millions of
delegated credentials); fake storefronts built to rank in agent search; machine-speed card testing and
account takeover; friendly fraud ("my agent did it"); agent-to-agent deals (collusion); and payments on
off-card rails. Bank transfers and stablecoins are **push payments**: once sent, very hard to reverse, with
no chargebacks or Zero Liability. An agent tricked into sending one is authorized push payment (APP) fraud,
which the UK made banks reimburse in 2024.

## 9. Demand data

- **23%** of US consumers trust GenAI to pay for them; **61%** would trust Visa with agentic transactions
  (Visa Trust Index, Sep 9, 2026).
- **47%** of US shoppers use AI tools for at least one shopping task (Visa survey, Oct 2025).
- Agentic commerce is **under 1% of US e-commerce** (Bernstein, via Forkast, Sep 2026).
- **93%** of merchants say the AI provider should bear the loss for incorrect purchases; only **28%** will
  offer their full product range to agents; **14%** of consumers trust AI to buy without manual
  verification (PYMNTS Intelligence, via Forkast).
- In-chat checkout converted at about **a third** of on-site checkout (Walmart data via Wired, via Forkast),
  which pushed the market to "discover in AI, buy on the store's site."
- AI-referred retail traffic up **4,700%** year over year, with little conversion to payments (Hypertrade,
  via Forkast).

## 10. Control ideas

Design ideas from this research (not published network products):

1. **Purchase-to-request link:** each payment carries the request ID; no ID → decline or ask. Metric:
   unauthorized-dispute rate. Tradeoff: breaks set-and-forget unless standing orders exist.
2. **Step-up on drift:** store, ship-to or price differs from the request → passkey. Metric: fraud caught
   per 100 step-ups, completion after step-up. Tradeoff: too many prompts kills the point of agents.
3. **Match and drift scoring:** hard rules first (cap, expiry, blocked category), then soft signals
   (merchant new to the user, merchant trust, ship-to change, sessions, agent reputation, time since
   passkey, category fit, amount vs cap). Rules are pass/fail; drift is a dial that triggers "ask the user."
4. **Agent flight recorder:** a signed, hashed step log (instruction → pages seen → why this item →
   checkout) attached to the order and replayed in a dispute. A vague instruction points to agent error, an
   order that came from page text points to a hijack, and a user approval points to friendly fraud.
5. **Agent-error dispute type** that routes mistakes to returns or the agent company, not merchant fraud.
6. **Per-agent controls** in the bank or wallet app: see every agent holding a card, set limits, kill switch.
7. **Store-trust signals for agent ranking:** share merchant dispute and fraud tiers with verified agents.
8. **Agent risk tiers:** company-level score (vetting result, dispute ratio, fraud rate, rejected step-ups)
   driving approvals, throttling or revocation, with a cold start that begins low.

> Every payment should be able to answer: who asked for this, and where did it go wrong?

## 11. What this means for muse.shopping

*Analysis, not decisions.* Today Muse puts several retailers into one cart, the retailer is merchant
of record, orders are placed in-app through a retailer API or **headless browser automation** (Tier 2 in
`src/services/checkoutService.js`), and cards are tokenized by Stripe.

- **Discovery is the proven layer.** The OpenAI scale-back and the conversion data say people research
  with AI and buy where they trust the checkout. Muse's discovery feed is on the right side of that.
  In-app unified checkout is the harder bet: measure checkout conversion against a redirect baseline before
  scaling it.
- **Headless placement makes Muse an agent at the store's door.** Bot defenses (Cloudflare, Akamai) can
  block it, and Amazon blocked Meta Muse. Options: retailer API partnerships first; signed agent traffic
  (Web Bot Auth, or TAP via Cloudflare) if browser automation stays; keep the existing fall back to manual
  placement.
- **The retailer eats online fraud by default** as merchant of record, and disputes count toward the
  retailer's fraud ratio (VAMP). Retailers will want proof of intent per order: keep a per-order evidence
  log (what the shopper asked for, what they approved, when, on which device). That is the flight recorder
  in section 10, scoped to Muse.
- **Never hold card numbers.** Muse already stores only Stripe payment-method IDs. If Muse ever pays on
  the shopper's behalf without them at the checkout screen, use agent-scoped credentials (network agent
  tokens through VIC or Mastercard Agent Pay, or Stripe SPT / Link) and per-purchase approval through a
  channel the agent can't control.
- **Ask more for irreversible items.** Apply the reversibility table: final sale, made-to-order, digital
  goods and gift cards always get an explicit confirmation, and so does any drift (new ship-to, new store,
  near the shopper's cap).
- **Protocol choice:** UCP (Google + Shopify) and ACP (OpenAI + Stripe) are the two merchant-side
  standards to watch; Visa's Connect claims to bridge four of them. Don't integrate each one by hand until
  a retailer partner asks for it.
- **The name:** Meta launched a shopping agent called Muse on Sep 8, 2026. Expect confusion in search,
  press and app stores. Worth a positioning and trademark review (not legal advice).

## 12. Glossary

| Term | Meaning |
|---|---|
| Acquirer | The store's bank for card payments |
| Issuer | The cardholder's bank; decides yes or no |
| Interchange | The fee the issuer earns on each purchase |
| Card-not-present (CNP) | Online or phone purchases; fraud defaults to the merchant |
| 3-D Secure | Extra authentication at checkout; shifts liability to the issuer |
| Passkey | A device-held key unlocked by face, fingerprint or PIN |
| Token / cryptogram | A stand-in for the card number / a one-time code proving the token's use is legit |
| Step-up | Asking for extra proof, like a passkey |
| Liability shift | Who pays moves to whoever skipped the check |
| Mandate | A signed record of what the user authorized (AP2: intent mandate, cart mandate) |
| Delegated authorization | Letting something act for you, within limits |
| Human present / not present | Whether the user was there when the agent paid |
| CIT / MIT | Customer- vs merchant-initiated payments (subscriptions); agents blur them |
| Friendly fraud | The customer lies to get a refund |
| ATO | Account takeover |
| Card testing | Many tiny purchases to test stolen cards |
| False decline | A good purchase blocked (false positive) |
| Chargeback / reason code / representment | The dispute / its category / the store fighting back |
| Prompt injection | Hidden text that hijacks an agent |
| KYA | Know your agent: vetting the agent company |
| Push payment / APP fraud | Payer-sent money, hard to reverse / tricking someone (or an agent) into sending it |
| Zero Liability | Visa's policy: you don't pay for purchases you didn't authorize |
| Pass-through / staged wallet | Hands a network token to the store / pays the store itself |
| VAMP | Visa's merchant fraud + dispute ratio program |
| CE 3.0 | Compelling Evidence 3.0: Visa's rule for fighting friendly fraud with past-purchase evidence |
| Stablecoin | A digital dollar on a blockchain, 1:1 to USD (USDC, USDT); a push payment |

## 13. Sources

**Visa**
- [PYMNTS: Visa launches Intelligent Commerce (Apr 30, 2025)](https://www.pymnts.com/visa/2025/visa-powers-ai-shopping-agents-with-intelligent-commerce-payment-rails)
- [Digital Transactions: MCP server and Acceptance Agent Toolkit (Sep 4, 2025)](https://www.digitaltransactions.net/visa-launches-enhancements-to-its-intelligent-commerce-platform/)
- [Visa: Trusted Agent Protocol specification](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications)
- [Visa Intelligent Commerce (developer)](https://developer.visa.com/capabilities/visa-intelligent-commerce)
- [Cloudflare: securing agentic commerce](https://blog.cloudflare.com/secure-agentic-commerce/)
- [Axios: Visa's agent protocol (Oct 14, 2025)](https://www.axios.com/2025/10/14/visa-ai-shopping-agent-protocol-bot)
- [Visa: partners complete secure AI transactions (Dec 18, 2025)](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21961.html)
- [Fintech Futures: DBS pilots Visa Intelligent Commerce (Feb 2026)](https://www.fintechfutures.com/partnerships/dbs-and-visa-collaborate-to-advance-agentic-commerce-trials-in-asia-pacific)
- [Digital Commerce 360: how Visa views agentic commerce (Mar 17, 2026)](https://digitalcommerce360.com/2026/03/17/how-visa-views-agentic-commerce-opportunity/)
- [Visa: Intelligent Commerce Connect (Apr 8, 2026)](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22276.html)
- [Visa: Agentic Ready global expansion (Apr 29, 2026)](https://investor.visa.com/news/news-details/2026/Visa-Announces-Global-Expansion-of-Agentic-Ready-Program/default.aspx)
- [Visa: Payments Forum announcements (Jun 10, 2026)](https://usa.visa.com/about-visa/newsroom/press-releases.releaseid.22491.html)
- [Digital Commerce 360: Visa and OpenAI (Jun 12, 2026)](https://www.digitalcommerce360.com/2026/06/12/visa-openai-agent-led-payments/)
- [Visa Europe: banks reach the next phase of agentic commerce (Jul 2, 2026)](https://www.visa.co.uk/about-visa/newsroom/press-releases.3457328.html)
- [Investing.com: Visa Q3 FY2026 earnings call (Jul 28, 2026)](https://www.investing.com/news/transcripts/earnings-call-transcript-visa-tops-q3-2026-estimates-raises-outlook-93CH-4818303)
- [Visa: Trust Index (Sep 2026)](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22736.html)
- [Visa completes Featurespace acquisition (Dec 2024)](https://investor.visa.com/news/news-details/2024/Visa-Completes-Acquisition-of-Featurespace/default.aspx)
- [SecurityBrief: Visa to buy BioCatch (Aug 2026)](https://securitybrief.news/story/visa-to-buy-biocatch-in-usd-2-4-billion-cash-deal)
- [Visa FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1403161/000140316125000089/v-20250930.htm)

**Mastercard, Stripe, Google, Meta, OpenAI**
- [Mastercard: Agent Pay tools and US rollout (Sep 2025)](https://www.mastercard.com/us/en/news-and-trends/press/2025/september/mastercard-unveils-new-tools-and-collaborations-to-power-smarter,-safer-agentic-commerce.html)
- [TechCrunch: Stripe Link for agents (Apr 30, 2026)](https://techcrunch.com/2026/04/30/stripe-link-digital-wallet-ai-agents-shopping/)
- [Shopifreaks: Google and Shopify launch the Universal Commerce Protocol (Jan 2026)](https://www.shopifreaks.com/google-and-shopify-launch-universal-commerce-protocol/)
- [Digital Commerce 360: OpenAI shifts checkout plans (Mar 2026)](https://digitalcommerce360.com/2026/03/06/openai-shifts-checkout-plans-agentic-commerce-strategy/)
- [Axios: Meta debuts Muse (Sep 8, 2026)](https://axios.com/2026/09/08/meta-debuts-muse-personal-ai-agent)
- [The Paypers: Meta's agent with Stripe-powered checkout (Sep 2026)](https://thepaypers.com/payments/news/meta-launches-personal-ai-agent-with-stripe-powered-checkout)
- [Android Headlines: Meta virtual-card checkout on Facebook and Instagram (Jun 2026)](https://www.androidheadlines.com/2026/06/meta-instagram-facebook-live-ads-virtual-cards-ai.html)

**Risk, disputes, market**
- [Justt: VAMP threshold changes (Apr 2026)](https://justt.ai/blog/visa-vamp-threshold-changes-april-2026/)
- [Chargeflow: AI agent chargeback liability](https://www.chargeflow.io/blog/ai-agent-chargeback-liability)
- [Third Bridge: stablecoins vs card networks](https://www.thirdbridge.com/en-us/about-us/media/perspectives/disruption-or-distraction-why-stablecoins-haven-t-shaken-the-card-networks)
- [Forkast: the "hundreds vs millions" gap (Sep 17, 2026)](https://forkast.news/visa-hundreds-vs-millions-gap-commercial-launch-data-shows-the-agent-commerce-ceiling/)
