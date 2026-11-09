# Store script self-repair

How a broken store script gets fixed without anyone touching it, and what
needs a person. Design and decisions: https://claude.ai/artifact/KZCuvzhasvwGdFnuGFLb2B

## The ladder

1. **Wait.** One broken run is usually a slow store. Nothing happens until a
   store's script is broken 2 runs in a row.
2. **No-AI fallback.** The refresh server switches the store to
   `extractors/scripts/embedded-product-data.js`, which reads the product data
   stores embed for Google. If that passes the health test, no AI runs. Once a
   day the original script gets a trial run; a healthy trial switches back.
3. **AI repair.** When the fallback is broken too, or the trial still fails,
   `refresh-listings.yml` dispatches `repair-extractor.yml`:
   - **gate**: block pages, TJ Maxx, a missing token, and a store repaired 3
     times this week go to an issue, not AI. Caps: 3 AI attempts a day across
     all stores, one open repair per store.
   - **capture**: saves the store's pages and the current error (no secrets).
   - **attempt** (up to 2): Claude Code, on hannah's Claude plan, writes
     `extractors/scripts/<storeKey>.js` and its saved test page. It can read and
     edit files only: no shell, no network, read-only token. A separate job with
     no secrets cuts the patch to those two files and runs the focused tests
     and a live dry run against the real store.
   - **publish**: opens a PR labelled `extractor-repair`. Arms auto-merge only
     when the token is set up.
   - **report**: anything that didn't pass ends as an issue, never a bad merge.
4. **Undo.** If a repaired script breaks within 24 hours of landing, the next
   repair dispatch puts the previous version back instead of calling AI.

## What may merge itself (hannah's decision, 2026-11-09)

Only a PR that changes one per-store script (named after a store key in
`partners.json`) plus that store's saved test page, with every required check
green. Shared scripts (`shopify-catalog`, `embedded-product-data`) and
everything else wait for hannah. `repair-path-check` enforces this on every
commit and switches auto-merge off if a repair PR grows past it.

These commits never redeploy www.muse.shopping: `vercel.json`'s
`ignoreCommand` skips the build when a commit only touches
`extractors/scripts/` or `extractors/fixtures/`.

## One-time setup (hannah)

Nothing auto-merges until all three are done. Until then repairs still open
PRs that wait for you.

1. **Claude plan token** (about 2 min, on the Mac): run `claude setup-token`,
   then in GitHub go to muse-shopping → Settings → Secrets and variables →
   Actions → New repository secret, name `CLAUDE_CODE_OAUTH_TOKEN`. The token
   lasts about a year. When it expires, repairs open an issue saying so.
2. **Repair token** (about 3 min): github.com → Settings → Developer settings →
   Fine-grained tokens → Generate. Repository access: only
   `hbschlac/muse-shopping`. Permissions: Contents, Pull requests and Issues set to
   Read and write. Save it as the repository secret `REPAIR_GITHUB_TOKEN`.
   GitHub doesn't start checks on PRs opened with the built-in token. This one
   makes them run.
3. **Branch protection on main** plus **Allow auto-merge** (Settings →
   General). Required checks: `scan` (secret scan), `repair-path-check`,
   `repair-tests`. All three run on every PR, so ordinary PRs aren't blocked.
   Admins can bypass.

Never paste either token into chat, code or an issue.
