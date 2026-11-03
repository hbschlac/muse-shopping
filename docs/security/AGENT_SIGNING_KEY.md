# Muse's agent signing key

Muse proves "this request really comes from Muse's shopping agent" with a
signature (Web Bot Auth, Visa Trusted Agent Protocol, UCP). Whoever holds the
private key can impersonate Muse to every store, Cloudflare and Visa. This
document is the design that keeps that key from leaking, the threat model it
answers, the blind spots that remain, and the runbooks.

**The one rule:** the private key exists only inside Google Cloud KMS. It is
never generated, pasted, exported, or stored anywhere else: not in code, not
in Vercel env vars, not on a laptop, not in a chat with Claude.

## How it works

```
Vercel production function
  │ 1. x-vercel-oidc-token (per invocation, short-lived)
  ▼
Google STS ── Workload Identity Federation: accepts ONLY
  │            sub == owner:<team>:project:muse-shopping:environment:production
  │ 2. federated access token (we cache ≤ 5 min)
  ▼
Cloud KMS  cryptoKeyVersions/N:asymmetricSign   (Ed25519, non-exportable)
  │ 3. signature (+ CRC32C checks, verified locally before use)
  ▼
src/services/agentSigning  →  Signature-Input / Signature / Signature-Agent headers
```

- Code: `src/services/agentSigning/`. `signHttpRequest()` is the only way to
  get a signature (`signUcpRequest()` wraps it for UCP: method, authority, path,
  query, UCP-Agent, Content-Digest of the exact body, Content-Type,
  Idempotency-Key, in the Web Bot Auth shape). `publicKeys()` lists the public
  JWKs for the UCP profile. There is no "sign these bytes" export.
- Directory: `https://www.muse.shopping/.well-known/http-message-signatures-directory`
  serves the public keys, read from KMS at runtime and signed by each key.
- Env vars are identifiers, not secrets:

| Var | Example | Notes |
| --- | --- | --- |
| `AGENT_SIGNING_KMS_KEY_VERSION` | `projects/P/locations/us/keyRings/muse-agent/cryptoKeys/muse-agent-ed25519/cryptoKeyVersions/1` | Active key |
| `AGENT_SIGNING_KMS_PUBLISHED_VERSIONS` | comma list | Extra versions to publish during rotation |
| `GCP_WIF_AUDIENCE` | `//iam.googleapis.com/projects/NUM/locations/global/workloadIdentityPools/vercel/providers/vercel-production` | |
| `AGENT_SIGNING_BACKEND` | `gcp-kms` | Production ignores anything else |
| `AGENT_SIGN_BRIDGE_REQUESTS` | `true` | Sign UCP bridge calls (off until the key is registered) |
| `AGENT_TAP_KEYID` | from Visa | Only if Visa assigns its own keyid |
| `AGENT_SIGNING_ALLOWED_HOSTS` | `*.visa.com` | Hosts beyond partners.json |
| `AGENT_SIGNING_MAX_PER_MINUTE` | `300` | Per-instance cap |
| `AGENT_SIGNING_DISABLED` | `true` | Kill switch |

Outside production (local, preview, laptop jobs) the signer uses a throwaway
in-memory key that nobody trusts. Production never falls back to it: no KMS
config means no signatures, and the directory answers 503.

## Threat model

| # | How the key (or its power) could leak | Defense | Where |
| --- | --- | --- | --- |
| 1 | Committed to this **public** repo | Key never exists outside KMS. Pre-commit scanner, CI scanner + gitleaks, `.gitignore` for key files. GitHub push protection (manual step). | `scripts/scan-secrets.js`, `.husky/pre-commit`, `.github/workflows/secret-scan.yml` |
| 2 | Pasted into a Vercel env var (visible to project members, pulled to laptops, exposed to previews) | No key in env by design. Tripwire: if an Ed25519 private key, a private JWK or an agent-named secret appears in env, production refuses to sign and logs the var name. | `guard.js` `scanEnvForKeyMaterial` |
| 3 | Written to logs or error reports | Key never enters the process. Both loggers redact PEM keys, private JWK members, JWTs (the OIDC token), Google tokens, bearer tokens and signature values, on a copy so live objects are untouched. | `src/utils/redact.js` |
| 4 | On hannah's Mac (scraper, `.env`, backups, iCloud) | No key on any laptop. Laptop jobs get the throwaway key. A test fails if anything in `src/jobs` or `scripts` imports the signer. | `localDevSigner.js`, isolation test |
| 5 | Generated in a Claude session and pasted into chat, a file, or a PR | KMS generates it. `CLAUDE.md` forbids generating agent keys anywhere else. The scanner blocks the paste from landing. | `CLAUDE.md` |
| 6 | Preview deployment or PR branch signs as Muse | Federation accepts only the production subject. Previews have no path to KMS. | WIF attribute condition |
| 7 | Muse tricked into signing for an attacker (signing oracle, SSRF, Host-header games) | Destination allowlist (partners.json + explicit), tag allowlist, https only, no credentials in URL, directory signs only for `muse.shopping`, per-instance rate limit. | `index.js`, `guard.js` |
| 8 | A captured signature replayed | Bridge signatures live 60 s, TAP at most 8 min, random nonce on each, signature values redacted from logs. | `httpSignature.js` |
| 9 | Directory swapped to an attacker's key | Directory is built from KMS, not env, and must be signed by each listed key. Daily outside-in check fails on private members, unsigned keys, long-lived signatures or > 3 keys. | `verify.js`, `.github/workflows/agent-key-watch.yml` |
| 10 | Tampered or misrouted KMS response | CRC32C on request and response, key-version name check, local verification before the signature is used. | `gcpKmsSigner.js` |
| 11 | Signing from somewhere unexpected | Every KMS sign is audit-logged with the caller. Alert on any caller that is not Muse production; alert on unusual volume. | `scripts/agent-key/setup-gcp.sh` |
| 12 | A stale key that nobody remembers | 90-day rotation runbook with overlap; directory watch flags > 3 published keys. | `scripts/agent-key/rotate.sh` |
| 13 | Compromise discovered | One command disables the version (instant, global) and cuts the federation. | `scripts/agent-key/revoke.sh` |

### Found while building this

- **The repo is public.** Anything ever committed is world-readable, including history.
- **`.env.vercel` was committed** (Feb 3, 2026) with a Vercel OIDC token for the
  *development* environment. It expired Feb 4, 2026 and development tokens cannot
  reach KMS under this design, so it is harmless. Removed from the tree in this PR.
  History was not rewritten (not worth it for an expired token).
- History scan otherwise found only placeholder Stripe keys in docs.

## Blind spots (what this does not stop)

1. **Code running in production can sign.** The key cannot be stolen, but it can
   be *used* by anything that runs as Muse production: a malicious npm package, an
   RCE, a bad deploy. Such code could also lift the per-invocation OIDC token and
   call KMS directly, which the allowlist and rate limit do not see, and which the
   "unexpected caller" alert does not catch (it looks like production).
   *Mitigations:* volume alert; reconcile Vercel `agent_signature` log lines against
   the KMS audit count (a gap means someone signed outside the code path);
   `revoke.sh`. *Gap to close:* `package-lock.json` is git-ignored, so every deploy
   resolves fresh dependency versions. Committing a lockfile is the next fix
   (separate PR, because it changes how Vercel installs).
2. **Anyone who can deploy to production can sign.** That is the Vercel team and
   anyone who can merge to `main` (merges auto-deploy). Protect those accounts with
   passkeys, keep the team small, and require review on `main`.
3. **Anyone who owns the Google Cloud project can sign** or change the IAM binding.
   The unexpected-caller alert catches the first. Keep the key in its own project
   with one owner and a passkey.
4. **Verifier-side blindness.** Stores, Cloudflare and Visa do not tell Muse when
   they see a bad or unexpected signature. KMS audit logs are our only ground truth.
5. **Ed25519 in Cloud KMS is software-protected, not HSM** (Google lists Ed25519
   only for the software level). Still non-exportable; HSM would mean P-256, which
   TAP and Web Bot Auth do not use by default.
6. **Pulled OIDC tokens.** `vercel env pull` writes a 12-hour `VERCEL_OIDC_TOKEN` for
   the development environment into a local file. Development tokens cannot sign.
   Do not pull the production environment; whether Vercel issues a production token
   that way has not been verified.
7. **No IP restriction on KMS.** Vercel has no fixed egress IPs on this plan, so
   KMS cannot be locked to Vercel's network.
8. **Spec drift.** The directory and header formats follow the current Web Bot Auth
   draft and Visa's reference code. If Visa or Cloudflare change them, update
   `index.js` and the tests together.
9. **UCP uses the same key, published twice.** UCP accepts Ed25519 (OKP) keys, so
   the one KMS key signs UCP calls too (PR #15 lets `agentProfile.js` publish an
   Ed25519 `UCP_SIGNING_PUBLIC_JWK`). That env var is a hand-copied *public* key: if
   it drifts from KMS after a rotation, stores reject UCP signatures. Update it in the
   same step as `AGENT_SIGNING_KMS_KEY_VERSION`, or later read it from the signer.
10. **The gcloud scripts have only been dry-run.** Review each printed command
    before `--apply`.

## Setup (one time)

1. GitHub → muse-shopping → Settings → Code security: turn on **Secret scanning**
   and **Push protection** (free on public repos).
2. Passkeys or 2FA on GitHub, Vercel and Google Cloud.
3. Vercel → muse-shopping → Settings → Security → **OIDC Federation**: issuer mode
   **Team**.
4. Google Cloud Shell, in a project dedicated to this key:
   ```bash
   git clone https://github.com/hbschlac/muse-shopping && cd muse-shopping
   GCP_PROJECT_ID=<project> ALERT_EMAIL=<you> bash scripts/agent-key/setup-gcp.sh          # review
   GCP_PROJECT_ID=<project> ALERT_EMAIL=<you> bash scripts/agent-key/setup-gcp.sh --apply
   ```
5. Put the three printed values in Vercel, **Production only**, and redeploy.
6. Open the directory URL. Register that public key (keyid = its `kid`) with Visa
   and Cloudflare.
7. GitHub → Settings → Variables → Actions: `REQUIRE_AGENT_DIRECTORY=true`.
8. When registration is done: `AGENT_SIGN_BRIDGE_REQUESTS=true` in Vercel Production.

## Rotation (every 90 days)

`scripts/agent-key/rotate.sh new --apply`, then follow what it prints: publish the
new version alongside the old, wait 24 h, switch the active version, wait an hour,
`rotate.sh retire --apply`. Verifiers never see an unknown key.

## If the key is compromised

Triggers: the unexpected-caller alert, an unexplained volume spike, a Vercel or
Google account compromise, a malicious dependency in a production deploy.

1. `VERSION=<n> bash scripts/agent-key/revoke.sh --apply`. Signing stops
   everywhere within seconds and federation is cut.
2. Vercel: `AGENT_SIGNING_DISABLED=true`, remove the version from the env vars, redeploy.
3. Tell Visa and Cloudflare the keyid is revoked.
4. Read the KMS audit log to see who signed and when.
5. Fix the cause, then rotate to a new version, re-enable the provider, register the new key.

## Rules for people and for Claude sessions

- Never generate an agent key with openssl, node, Python, a website, or a Claude
  sandbox. Only `gcloud kms keys create` / `versions create`.
- Never put a private key in a Vercel env var, `.env` file, GitHub secret, issue,
  doc or chat.
- New code that needs a signature calls `signHttpRequest()`; it does not talk to
  KMS or build signatures itself.
- The TJ Maxx scraper and other laptop jobs never sign as Muse. Scraping a store
  under Muse's verified agent identity would put that identity's standing with
  Visa and Cloudflare at risk.
