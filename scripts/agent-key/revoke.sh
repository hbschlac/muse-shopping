#!/usr/bin/env bash
# EMERGENCY: stop every signature with a key version right now.
# Use when the unexpected-caller alert fires, a Vercel account or deploy is
# compromised, or anything below in the runbook says so.
#
#   GCP_PROJECT_ID=my-project VERSION=1 bash scripts/agent-key/revoke.sh --apply
set -euo pipefail
cd "$(dirname "$0")"
source ./config.sh "$@"
: "${VERSION:?Set VERSION to the key version number to kill}"

echo "== 1. Disable the version. Signing stops within seconds, everywhere, for everyone."
run gcloud kms keys versions disable "$VERSION" --key "$KMS_KEY" --keyring "$KMS_KEYRING" \
  --location "$KMS_LOCATION" --project "$GCP_PROJECT_ID"

echo "== 2. Cut the federation so no OIDC token can get a KMS token while you investigate."
run gcloud iam workload-identity-pools providers update-oidc "$WIF_PROVIDER" \
  --location global --workload-identity-pool "$WIF_POOL" --project "$GCP_PROJECT_ID" --disabled

cat <<OUT

== 3. Then, in order:
  - Vercel: remove the version from AGENT_SIGNING_KMS_KEY_VERSION / _PUBLISHED_VERSIONS, set
    AGENT_SIGNING_DISABLED=true, redeploy. The directory stops listing the key.
  - Tell Visa (TAP) and Cloudflare (Web Bot Auth) the key is revoked; send the keyid.
  - Read the KMS audit log for who signed: Logs Explorer, filter
    protoPayload.methodName="AsymmetricSign".
  - Fix the cause. Then: rotate.sh new --apply, re-enable the provider
    (update-oidc --no-disabled), unset AGENT_SIGNING_DISABLED, register the new key.
OUT
