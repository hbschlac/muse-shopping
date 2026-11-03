#!/usr/bin/env bash
# One-time setup: Muse's agent signing key in Google Cloud KMS, signable only by
# Vercel PRODUCTION deployments of muse-shopping, with audit logs and alerts.
#
#   GCP_PROJECT_ID=my-project ALERT_EMAIL=you@example.com bash scripts/agent-key/setup-gcp.sh          # dry run
#   GCP_PROJECT_ID=my-project ALERT_EMAIL=you@example.com bash scripts/agent-key/setup-gcp.sh --apply
#
# Needs: gcloud signed in as a project Owner (Cloud Shell works and needs no install).
# Creates no secret anywhere. The private key is generated inside KMS and can
# never be exported.
set -euo pipefail
cd "$(dirname "$0")"
source ./config.sh "$@"
: "${ALERT_EMAIL:?Set ALERT_EMAIL to where key alerts should go}"

PROJECT_NUMBER="${GCP_PROJECT_NUMBER:-$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || true)}"
if [ -z "$PROJECT_NUMBER" ]; then
  [ "$APPLY" = 1 ] && { echo "Could not read the project number. Run: gcloud auth login"; exit 1; }
  PROJECT_NUMBER="PROJECT_NUMBER"
fi
PRINCIPAL="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/subject/${PROD_SUBJECT}"
KEY_NAME="projects/${GCP_PROJECT_ID}/locations/${KMS_LOCATION}/keyRings/${KMS_KEYRING}/cryptoKeys/${KMS_KEY}"

echo "== 1. APIs"
run gcloud services enable cloudkms.googleapis.com iam.googleapis.com sts.googleapis.com \
  iamcredentials.googleapis.com logging.googleapis.com monitoring.googleapis.com --project "$GCP_PROJECT_ID"

echo "== 2. Key ring and Ed25519 signing key (non-exportable; 30-day window before a destroy is final)"
run gcloud kms keyrings create "$KMS_KEYRING" --location "$KMS_LOCATION" --project "$GCP_PROJECT_ID"
run gcloud kms keys create "$KMS_KEY" --keyring "$KMS_KEYRING" --location "$KMS_LOCATION" \
  --project "$GCP_PROJECT_ID" --purpose asymmetric-signing --default-algorithm ec-sign-ed25519 \
  --protection-level software --destroy-scheduled-duration 30d

echo "== 3. Workload Identity Federation: trust Vercel's OIDC issuer, PRODUCTION ONLY"
run gcloud iam workload-identity-pools create "$WIF_POOL" --location global \
  --project "$GCP_PROJECT_ID" --display-name "Vercel"
run gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
  --location global --workload-identity-pool "$WIF_POOL" --project "$GCP_PROJECT_ID" \
  --issuer-uri "https://oidc.vercel.com/${VERCEL_TEAM_SLUG}" \
  --allowed-audiences "https://vercel.com/${VERCEL_TEAM_SLUG}" \
  --attribute-mapping "google.subject=assertion.sub,attribute.environment=assertion.environment" \
  --attribute-condition "assertion.sub == '${PROD_SUBJECT}'"

echo "== 4. Allow exactly that production identity to sign with exactly this key"
run gcloud kms keys add-iam-policy-binding "$KMS_KEY" --keyring "$KMS_KEYRING" \
  --location "$KMS_LOCATION" --project "$GCP_PROJECT_ID" \
  --member "$PRINCIPAL" --role roles/cloudkms.signerVerifier

echo "== 5. Audit every use of the key (Data Access logs for Cloud KMS)"
POLICY_FILE=$(mktemp)
run sh -c "gcloud projects get-iam-policy '$GCP_PROJECT_ID' --format=json > '$POLICY_FILE'"
run python3 -c "
import json,sys
p=json.load(open('$POLICY_FILE'))
cfgs=[c for c in p.get('auditConfigs',[]) if c.get('service')!='cloudkms.googleapis.com']
cfgs.append({'service':'cloudkms.googleapis.com','auditLogConfigs':[{'logType':'ADMIN_READ'},{'logType':'DATA_READ'},{'logType':'DATA_WRITE'}]})
p['auditConfigs']=cfgs
json.dump(p,open('$POLICY_FILE','w'))
"
run gcloud projects set-iam-policy "$GCP_PROJECT_ID" "$POLICY_FILE"

echo "== 6. Alerts: a signature from anyone but Muse production, and unusual volume"
CHANNEL_FILE=$(mktemp)
cat > "$CHANNEL_FILE" <<JSON
{"type":"email","displayName":"Muse agent key alerts","labels":{"email_address":"${ALERT_EMAIL}"}}
JSON
printf '\n$ gcloud beta monitoring channels create --channel-content-from-file %s --format=value(name)\n' "$CHANNEL_FILE"
CHANNEL="${ALERT_CHANNEL:-projects/${GCP_PROJECT_ID}/notificationChannels/NEW}"
if [ "$APPLY" = 1 ] && [ -z "${ALERT_CHANNEL:-}" ]; then
  CHANNEL=$(gcloud beta monitoring channels create --channel-content-from-file "$CHANNEL_FILE" \
    --project "$GCP_PROJECT_ID" --format='value(name)')
  echo "Alert channel: $CHANNEL (confirm the verification email if Google sends one)"
fi

UNEXPECTED_FILTER="resource.type=\"cloudkms_cryptokeyversion\" AND protoPayload.methodName=\"AsymmetricSign\" AND protoPayload.resourceName:\"cryptoKeys/${KMS_KEY}/\" AND NOT protoPayload.authenticationInfo.principalSubject:\"${PROD_SUBJECT}\""
ALERT1=$(mktemp)
cat > "$ALERT1" <<JSON
{
  "displayName": "Muse agent key: signature from an unexpected caller",
  "documentation": {"content": "Someone other than Vercel production of muse-shopping signed with Muse's agent key. Follow docs/security/AGENT_SIGNING_KEY.md, section 'If the key is compromised'."},
  "combiner": "OR",
  "conditions": [{"displayName": "AsymmetricSign by non-production principal",
    "conditionMatchedLog": {"filter": $(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$UNEXPECTED_FILTER")}}],
  "alertStrategy": {"notificationRateLimit": {"period": "300s"}},
  "notificationChannels": ["${CHANNEL}"]
}
JSON
run gcloud alpha monitoring policies create --policy-from-file "$ALERT1" --project "$GCP_PROJECT_ID"

run gcloud logging metrics create agent_key_sign_count --project "$GCP_PROJECT_ID" \
  --description "Muse agent key signatures" \
  --log-filter "resource.type=\"cloudkms_cryptokeyversion\" AND protoPayload.methodName=\"AsymmetricSign\" AND protoPayload.resourceName:\"cryptoKeys/${KMS_KEY}/\""
ALERT2=$(mktemp)
cat > "$ALERT2" <<JSON
{
  "displayName": "Muse agent key: unusual signing volume",
  "documentation": {"content": "More than ${SIGN_ALERT_PER_HOUR:-3000} agent signatures in an hour. Check Vercel logs for agent_signature lines; a gap between those and the KMS count means someone else is signing."},
  "combiner": "OR",
  "conditions": [{"displayName": "Signatures per hour",
    "conditionThreshold": {
      "filter": "metric.type=\"logging.googleapis.com/user/agent_key_sign_count\"",
      "aggregations": [{"alignmentPeriod": "3600s", "perSeriesAligner": "ALIGN_SUM", "crossSeriesReducer": "REDUCE_SUM"}],
      "comparison": "COMPARISON_GT", "thresholdValue": ${SIGN_ALERT_PER_HOUR:-3000}, "duration": "0s"}}],
  "notificationChannels": ["${CHANNEL}"]
}
JSON
run gcloud alpha monitoring policies create --policy-from-file "$ALERT2" --project "$GCP_PROJECT_ID"

cat <<OUT

== 7. Put these in Vercel (Production only). They are identifiers, not secrets.
AGENT_SIGNING_BACKEND=gcp-kms
AGENT_SIGNING_KMS_KEY_VERSION=${KEY_NAME}/cryptoKeyVersions/1
GCP_WIF_AUDIENCE=//iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}

Then redeploy and open https://www.muse.shopping/.well-known/http-message-signatures-directory
The public key there is the one to register with Visa and Cloudflare.
OUT
