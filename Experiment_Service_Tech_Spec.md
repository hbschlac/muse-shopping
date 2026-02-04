**Experiment Service Technical Spec**

**Overview**
This service assigns experiment variants for recommendation placements, delivers per-variant config to the rec service, and logs exposures and outcomes. Assignment uses user_id when available, with session_id fallback. Both IDs are logged to support first-session analysis.

**Architecture**
- Assignment API
- Experiment Config Store
- In-memory cache
- Exposure and outcome event logger
- Analytics warehouse integration

**Assignment Logic**
1. If `user_id` present, compute hash-based bucket on user_id.
2. Else bucket on `session_id`.
3. Return variant and params for the placement.
4. Log exposure with both IDs if available.

**API**

**POST /experiments/assign**
```json
{
  "user_id": "u123",
  "session_id": "s456",
  "context": {
    "page_type": "pdp",
    "placement": "you_may_also_like",
    "locale": "en-US"
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
    "candidate_pool": "cross_category",
    "rerank_weight_style": 0.6,
    "rerank_weight_price": 0.2
  }
}
```

**Config Schema**
- experiment_id
- name
- hypothesis
- placements
- variants
- traffic_splits
- eligibility
- start_time, end_time
- params per variant

**Data Model**

**Experiment**
- id
- name
- description
- hypothesis
- placements
- eligibility
- start_time
- end_time
- status

**Variant**
- id
- experiment_id
- name
- traffic_split
- params

**Exposure Event**
- experiment_id
- variant
- user_id
- session_id
- placement
- page_type
- timestamp

**Outcome Event**
- experiment_id
- variant
- user_id
- session_id
- placement
- event_type
- item_id
- timestamp

**Caching**
- Cache experiment configs in memory with TTL.
- Invalidate cache on config update.
- Target p95 assignment latency < 20ms.

**Logging**
- Exposure logged on assignment.
- Outcome logged by rec service when impression, click, add-to-cart, purchase occurs.
- Ensure join keys include experiment_id and variant.

**Security and Privacy**
- Do not log PII beyond hashed IDs.
- Enforce access controls on experiment creation and updates.

**Failure Handling**
- If experiment service unavailable, fall back to default variant.
- Log assignment failures for monitoring.

**Rollout Plan**
1. Dark launch with logging only.
2. Enable PDP placement.
3. Expand to newsfeed and home placements.
