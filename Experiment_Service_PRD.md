**Experiment Service PRD**

**Problem Statement**
We need a service that lets us run controlled experiments on recommendation experiences across placements so we can improve add-to-cart performance safely and quickly.

**Goals**
- Enable experiments on PDP, newsfeed, and other placements.
- Provide deterministic user assignment with session fallback.
- Support rapid iteration without code redeploys.
- Make add-to-cart the primary success metric.

**Non-Goals**
- Building the recommendation model itself.
- Full BI dashboarding or a full experimentation UI in v1.

**Success Metrics**
- Primary: add-to-cart rate lift on experiment placements.
- Secondary: CTR, conversion rate, revenue per session.
- Guardrails: bounce rate, page load time, inventory exposure balance.

**Users and Use Cases**
- PM creates and launches an experiment on PDP with two variants.
- ML toggles model version or feature weights via config.
- Analyst compares add-to-cart lift between variants.

**Scope**
- Multi-placement experiments: PDP, newsfeed, search, home, cart.
- Assignment by user_id with session_id fallback.
- Exposure and outcome logging.
- Config delivery to rec service.

**Out of Scope (v1)**
- Self-serve UI with advanced visualization.
- Multi-armed bandit optimization.
- Automatic metric interpretation or alerts.

**Functional Requirements**
1. Create experiments with name, hypothesis, variants, splits, and eligibility.
2. Assign variants deterministically using user_id or session_id fallback.
3. Return config payload to the rec service per placement.
4. Log exposure and outcome events with user_id and session_id.
5. Support pause, resume, and ramping traffic.

**User Stories**
1. As a PM, I can create a PDP experiment with 80/20 split to test a new re-ranker.
2. As an engineer, I can fetch variant config at request time with low latency.
3. As an analyst, I can attribute add-to-cart events to variants.

**Risks and Mitigations**
- Risk: latency impact on rec calls.
- Mitigation: in-memory config cache and deterministic hashing.

- Risk: assignment inconsistency across sessions.
- Mitigation: user_id first, session_id fallback, always log both.

- Risk: guardrail regression.
- Mitigation: defined guardrails and quick rollback.

**Dependencies**
- Identity layer that provides user_id and session_id.
- Event pipeline for exposure and outcome logging.
- Rec service integration for config consumption.

**Milestones**
1. Week 1-2: assignment API and config schema.
2. Week 3: logging pipeline and exposure events.
3. Week 4: rec service integration and validation.
4. Week 5: first PDP experiment live.
