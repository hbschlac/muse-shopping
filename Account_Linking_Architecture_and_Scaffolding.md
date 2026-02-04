# Account Linking Architecture and Scaffolding

Date: February 3, 2026
Owner: Muse Product + Engineering

## Purpose
Define a secure, scalable architecture and scaffolding plan for retailer account linking. The goal is to learn where users shop and access order history without ever handling payment credentials. This document aligns to `retailer_integration_plan.csv` and uses a hybrid approach: direct integrations for top retailers and an aggregator for the long tail.

## Goals
- Enable users to link retailer accounts during onboarding and later.
- Support both direct retailer integrations and a long-tail aggregator.
- Minimize data access, avoid PCI scope, and protect tokens.
- Normalize order history into a consistent internal schema.

## Non-Goals
- Storing or processing any payment credentials.
- Full catalog ingestion at this phase.
- Building a complete user identity system (assumes existing auth).

## High-Level Architecture

### Services
1. **Auth & Linking Service**
   - Handles OAuth flows and retailer-specific login flows.
   - Exchanges auth codes for tokens and stores them in the Token Vault.
   - Returns only a `token_reference_id` to the application DB.

2. **Token Vault**
   - Dedicated storage for access + refresh tokens.
   - Encrypted at rest with KMS.
   - Accessible only by Auth & Linking Service.

3. **Retailer Connector Layer**
   - Pluggable adapters for each retailer or aggregator.
   - Shared interface to keep the core logic stable as new retailers are added.

4. **Ingestion & Normalization Service**
   - Fetches order history from connectors.
   - Redacts sensitive fields.
   - Writes to `normalized_orders` with a consistent schema.

5. **Permissions & Policy Layer**
   - Allow-list of permitted fields by retailer.
   - Blocks or redacts non-approved fields at ingestion.

6. **Audit & Monitoring**
   - Logs token use and data access.
   - Alerting on suspicious patterns or abnormal sync behavior.

### Data Flow
1. User chooses retailer(s) during onboarding.
2. Auth & Linking initiates OAuth (or aggregator auth).
3. Tokens stored in Token Vault; app DB stores `token_reference_id`.
4. Ingestion service fetches and normalizes orders.
5. Orders stored in `normalized_orders` for personalization.

## Security & Privacy Principles
- **No card data**: do not request payment scopes. If responses include payment fields, redact at ingestion.
- **Least privilege**: request only read scopes needed for orders/profile.
- **Encryption**: TLS in transit, KMS at rest for tokens.
- **Segregation**: token storage in a separate vault with strict ACLs.
- **Auditability**: all access logged with correlation IDs.

## Connector Interface (Scaffolding)
All connectors implement the same interface:

- `getAuthUrl(userId, retailerId)`
- `exchangeToken(authCode)`
- `refreshToken(tokenRef)`
- `fetchOrders(tokenRef, cursor)`
- `fetchProfile(tokenRef)`

Connector types:
- **Direct connector** (per retailer)
- **Aggregator connector** (long tail retailers)

## Data Model (Scaffolding)

### user_retailer_connection
- `id`
- `user_id`
- `retailer_id`
- `provider_type` (direct | aggregator)
- `token_reference_id`
- `status` (active | revoked | error)
- `scopes`
- `connected_at`
- `last_sync_at`

### normalized_orders
- `id`
- `user_id`
- `retailer_id`
- `order_id`
- `order_date`
- `subtotal`
- `tax`
- `shipping`
- `total`
- `currency`
- `items` (json array: name, sku, price, qty, category)

### sync_log
- `connection_id`
- `started_at`
- `ended_at`
- `status` (success | failure | partial)
- `items_fetched`
- `error_code` (nullable)

## Retailer Prioritization
Use `retailer_integration_plan.csv` as the source of truth. Initial tiers:

- **P0 direct**: Amazon, Walmart, Target, Macy's (and other P0s in the CSV).
- **Long tail**: all remaining retailers via aggregator.

## UX Scaffolding

### Onboarding Flow
1. Ask: “Where do you shop?”
2. Show P0 retailers and search.
3. For each retailer:
   - If direct connector exists, use OAuth flow.
   - Otherwise use aggregator flow.
4. Show consent copy: “We only access order history and basic profile info. We never access or store payment details.”

### Account Management
- List connected retailers.
- Allow disconnect.
- Show last sync timestamp.

## Rollout Plan (Phased)
1. Build Auth & Linking Service + Token Vault.
2. Implement connector scaffolding and a sample connector.
3. Integrate top 2 P0 direct retailers.
4. Add aggregator integration for long tail.
5. Add policy redaction + monitoring.
6. Expand direct connectors for remaining P0 retailers.
7. Improve UX and add per-retailer sync scheduling.

## Risks & Mitigations
- **Retailer API instability**: isolate in connectors, add retries and fallbacks.
- **Scope creep**: enforce allow-list and block unapproved fields.
- **Aggregator dependency**: monitor availability and negotiate SLAs.
- **User trust**: transparent consent copy and easy disconnect.

## Open Questions
- Which aggregator provider will be used for long-tail coverage?
- Which P0 retailers support OAuth or require partner agreements?
- How frequently should order sync run per retailer?

