# muse-shopping

Public repo. Live at www.muse.shopping; merges to `main` auto-deploy to production on Vercel.

## Agent signing key: hard rules

Muse's agent identity (Web Bot Auth, Visa TAP, UCP signatures) is a private key that lives
ONLY in Google Cloud KMS. Read `docs/security/AGENT_SIGNING_KEY.md` before touching signing.

- Never generate an agent/TAP/Web Bot Auth key (openssl, node `generateKeyPair`, Python, a website),
  except throwaway keys created inside a test. Real keys come only from `gcloud kms`.
- Never put a private key, JWK with `"d"`, service-account JSON, or `VERCEL_OIDC_TOKEN` in code, env
  files, Vercel env vars, GitHub secrets, issues, PR text, docs or chat.
- Code that needs a signature calls `signHttpRequest()` from `src/services/agentSigning`. Do not add
  another signer, another key directory, or a "sign raw bytes" helper.
- Laptop jobs and scrapers (`src/jobs`, `scripts`) never import the signer. A test enforces this.
- Run `node scripts/scan-secrets.js --staged` before committing; CI runs it on every push.
