**Experiment Service Spec v0.2**

**Objective**
Enable product and ML teams to run controlled experiments that improve recommendation quality, with safe rollout, clear attribution, and measurable impact.

**Primary Users**
- PMs: create, launch, and monitor experiments.
- ML/Eng: implement variants and analyze results.
- Data/Analytics: evaluate impact and guardrails.

**Updates in v0.2**
- Flexible placements: experimentation can run on PDP, newsfeed, and other placements.
- Assignment: bucket by `user_id` when available, fall back to `session_id` when not.
- Logging: collect both `user_id` and `session_id` for analysis.
- Primary success metric: add-to-cart rate.

**1) Core Concepts**

**Experiment**
A named test with:
- Hypothesis (what we think will improve).
- Variants (e.g., `control`, `treatment_a`, `treatment_b`).
- Target population (users, sessions, regions, devices).
- Exposure rules (when the experiment is triggered).
- Metrics (primary and guardrail).

**Variant**
A parameterized config that changes the recommender:
- Model version.
- Feature weights.
- Candidate set logic.
- Re-ranking strategy.

**Assignment**
Deterministic bucket assignment with fallback:
- Use `user_id` when present.
- Otherwise use `session_id`.
- Always log both IDs if available.

**Placement**
Where recommendations are rendered:
- PDP.
- Newsfeed.
- Search.
- Home.
- Cart.

**2) Functional Requirements**

**Create and manage experiments**
- Create experiment with name, description, hypothesis.
- Add variants and traffic splits (e.g., 90/10, 80/10/10).
- Define eligibility (geo, device, logged-in status, placement).
- Schedule start/end, pause/resume, or ramp traffic.
- Version history for configs.

**Real-time assignment API**
- Input: `user_id`, `session_id`, `context` (page type, placement).
- Output: variant name + parameter overrides.
- Deterministic bucketing for repeatability.
- Supports QA overrides.

**Experiment config delivery**
- Lightweight config payload to the rec service.
- Cached in memory for low latency.
- Supports changes without redeploying rec code.

**Logging & analytics**
- Log exposure events:
  - experiment_id, variant, user_id, session_id, placement, timestamp.
- Log outcome events:
  - impression, click, add-to-cart, purchase.
- Joinable in analytics warehouse.

**3) Non-Functional Requirements**
- Latency: assignment call < 20ms p95.
- Reliability: 99.9% uptime.
- Consistency: deterministic bucketing per user/session.
- Safety: guardrails to stop or roll back rapidly.

**4) API Surface (Draft)**

**Assignment**
```json
POST /experiments/assign
{
  "user_id": "u123",
  "session_id": "s456",
  "context": {
    "page_type": "pdp",
    "placement": "you_may_also_like"
  }
}
```

**Response**
```json
{
  "experiment_id": "reco_ymal_v1",
  "variant": "treatment_a",
  "params": {
    "model_version": "v3",
    "rerank_weight_price": 0.2,
    "rerank_weight_style": 0.6
  }
}
```

**5) Metrics Framework**

**Primary Metric**
- Add-to-cart rate.

**Secondary Metrics**
- CTR on recommended items.
- Conversion rate.
- Revenue per session.

**Guardrails**
- Bounce rate.
- Page load time.
- Inventory exposure balance.

**6) Experiment Types Supported**
- Model version: v2 vs v3.
- Feature weight tweaks: style similarity emphasis.
- Candidate pool: same category only vs cross-category.
- Price band constraints: tight vs loose.
- Diversity rules: brand variety, color variety.
- Personalization: user-based vs item-only.

**7) Governance & QA**
- QA override to force a variant.
- Rollback button.
- Exposure sanity checks.
- Variant configuration validation.
