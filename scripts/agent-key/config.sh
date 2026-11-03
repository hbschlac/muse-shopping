# Shared settings for the agent key scripts. Identifiers only; no secrets.
# Override any of these in your shell before running a script.
: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID to the Google Cloud project that will hold the key}"
: "${KMS_LOCATION:=us}"
: "${KMS_KEYRING:=muse-agent}"
: "${KMS_KEY:=muse-agent-ed25519}"
: "${VERCEL_TEAM_SLUG:=hannah-schlacters-projects}"
: "${VERCEL_PROJECT_NAME:=muse-shopping}"
: "${WIF_POOL:=vercel}"
: "${WIF_PROVIDER:=vercel-production}"

PROD_SUBJECT="owner:${VERCEL_TEAM_SLUG}:project:${VERCEL_PROJECT_NAME}:environment:production"

APPLY=0
for a in "$@"; do [ "$a" = "--apply" ] && APPLY=1; done

# Every command is printed. Nothing runs unless --apply is passed.
run() {
  printf '\n$ %s\n' "$*"
  if [ "$APPLY" = 1 ]; then "$@"; fi
}

if [ "$APPLY" != 1 ]; then
  echo "DRY RUN: printing commands only. Re-run with --apply to execute."
fi
