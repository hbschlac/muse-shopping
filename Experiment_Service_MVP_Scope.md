**Experiment Service MVP Scope**

**MVP Goal**
Enable a single PDP experiment with deterministic assignment, config delivery, and add-to-cart measurement.

**Must Have**
1. Assignment API with user_id first, session_id fallback.
2. Experiment config storage with variants and traffic splits.
3. Placement support for PDP.
4. Exposure logging with user_id and session_id.
5. Outcome logging for add-to-cart events.
6. Rec service integration to consume variant params.
7. Rollback to default variant.

**Should Have**
1. Basic eligibility rules by placement and locale.
2. Simple traffic ramping controls.
3. Admin-only experiment creation endpoint.

**Nice to Have (Post-MVP)**
1. Newsfeed placement support.
2. UI for experiment creation and monitoring.
3. Automated guardrail alerts.
4. Multi-armed bandit optimization.

**Deliverables**
- Assignment API endpoint.
- Experiment config schema and storage.
- Exposure and outcome event schemas.
- PDP integration and test experiment.

**Acceptance Criteria**
1. Given a user_id, assignment is stable across sessions.
2. Given no user_id, session_id assignment is stable within session.
3. Exposure events are logged for every assignment.
4. Add-to-cart events are attributed to variants.
5. Rollback switches all traffic to control within 5 minutes.

**Estimated Timeline**
1. Week 1: API and config store.
2. Week 2: logging pipeline and schemas.
3. Week 3: PDP integration and first experiment.
