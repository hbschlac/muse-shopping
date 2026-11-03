#!/usr/bin/env bash
# Planned rotation (every 90 days, or whenever in doubt). Overlapping, so no
# verifier ever sees an unknown key.
#
#   GCP_PROJECT_ID=my-project bash scripts/agent-key/rotate.sh new --apply      # step 1
#   GCP_PROJECT_ID=my-project OLD=1 bash scripts/agent-key/rotate.sh retire --apply   # step 3
set -euo pipefail
cd "$(dirname "$0")"
STEP="${1:-}"; shift || true
source ./config.sh "$@"
KEY_NAME="projects/${GCP_PROJECT_ID}/locations/${KMS_LOCATION}/keyRings/${KMS_KEYRING}/cryptoKeys/${KMS_KEY}"

case "$STEP" in
  new)
    run gcloud kms keys versions create --key "$KMS_KEY" --keyring "$KMS_KEYRING" \
      --location "$KMS_LOCATION" --project "$GCP_PROJECT_ID"
    cat <<OUT

Step 1 done: KMS made version N (printed above).
Step 2, in Vercel Production env:
  - add ${KEY_NAME}/cryptoKeyVersions/N to AGENT_SIGNING_KMS_PUBLISHED_VERSIONS, redeploy.
    The directory now lists old + new; Muse still signs with the old one.
  - If Visa or Cloudflare pin keys (not just the directory), register the new public key now.
  - Wait at least 24 hours, then set AGENT_SIGNING_KMS_KEY_VERSION to version N,
    put the OLD version in AGENT_SIGNING_KMS_PUBLISHED_VERSIONS, redeploy.
  - Wait 1 more hour (signatures live at most 8 minutes; directory caches 60s), then run:
    OLD=<old number> bash scripts/agent-key/rotate.sh retire --apply
OUT
    ;;
  retire)
    : "${OLD:?Set OLD to the version number being retired}"
    echo "First remove version ${OLD} from AGENT_SIGNING_KMS_PUBLISHED_VERSIONS in Vercel and redeploy."
    run gcloud kms keys versions disable "$OLD" --key "$KMS_KEY" --keyring "$KMS_KEYRING" \
      --location "$KMS_LOCATION" --project "$GCP_PROJECT_ID"
    echo "Disabled. After 30 quiet days: gcloud kms keys versions destroy ${OLD} ... (final)."
    ;;
  *)
    echo "usage: rotate.sh new|retire [--apply]"; exit 2;;
esac
