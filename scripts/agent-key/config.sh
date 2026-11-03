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
  [ "$APPLY" = 1 ] || return 0
  local err
  err=$(mktemp)
  if "$@" 2> >(tee "$err" >&2); then rm -f "$err"; return 0; fi
  sleep 1
  # Re-running is safe: anything that already exists is skipped.
  if grep -qiE 'already exists|ALREADY_EXISTS' "$err"; then
    echo "(already exists, skipping)"; rm -f "$err"; return 0
  fi
  rm -f "$err"; return 1
}

if [ "$APPLY" != 1 ]; then
  echo "DRY RUN: printing commands only. Re-run with --apply to execute."
fi
