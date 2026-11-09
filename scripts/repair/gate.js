#!/usr/bin/env node
'use strict';

// Decides whether a broken store may get an AI repair right now.
// Spending limits from the plan: 3 AI repairs a day across all stores, 1 open
// repair per store, and a store repaired 3 times in a week is paused for
// hannah. Counts come from PRs labelled `extractor-repair` (no extra table).
//
// Pure decision in decide(); main() reads PR data from the GitHub API with
// the read-only job token and writes the verdict to $GITHUB_OUTPUT.

const fs = require('fs');

const STORE_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LIMITS = { perDay: 3, openPerStore: 1, perStorePerWeek: 3 };
// Stores that block cloud servers. Repair can't reach them from GitHub.
const CLOUD_BLOCKED = new Set(['tjmaxx']);
const DAY = 24 * 3600 * 1000;

function storeOfBranch(ref) {
  const m = /^repair\/([a-z0-9-]+)-run-/.exec(ref || '');
  return m ? m[1] : null;
}

// prs: [{ created_at, state: 'open'|'closed', merged_at, head: { ref } }]
function decide({ storeKey, error, prs, now = Date.now(), hasToken = true }) {
  if (!STORE_KEY.test(storeKey || '')) return { action: 'reject', reason: 'invalid store key' };
  if (CLOUD_BLOCKED.has(storeKey)) {
    return { action: 'issue', reason: `${storeKey} blocks cloud servers, so it can only be fixed from the Mac` };
  }
  if (/\b(bot check|captcha|access denied|forbidden|403|429|rate.?limit)\b/i.test(error || '')) {
    return { action: 'issue', reason: 'the store returned a block page, not a layout change; AI would not help' };
  }

  const repairs = (prs || []).filter((p) => storeOfBranch(p.head && p.head.ref));
  const mine = repairs.filter((p) => storeOfBranch(p.head.ref) === storeKey);

  if (mine.some((p) => p.state === 'open')) {
    return { action: 'skip', reason: 'a repair PR for this store is already open' };
  }
  const weekCount = mine.filter((p) => now - Date.parse(p.created_at) < 7 * DAY).length;
  if (weekCount >= LIMITS.perStorePerWeek) {
    return { action: 'issue', reason: `repaired ${weekCount} times this week; paused for hannah to look at` };
  }
  const dayCount = repairs.filter((p) => now - Date.parse(p.created_at) < DAY).length;
  if (dayCount >= LIMITS.perDay) {
    return { action: 'skip', reason: `daily cap reached (${dayCount}/${LIMITS.perDay}); the next broken run retries` };
  }
  if (!hasToken) {
    return { action: 'issue', reason: 'CLAUDE_CODE_OAUTH_TOKEN is not set, so AI repair cannot run' };
  }
  return { action: 'repair', reason: 'within limits' };
}

async function main() {
  const { GITHUB_REPOSITORY, GH_TOKEN, STORE_KEY: storeKey, REPAIR_ERROR, HAS_CLAUDE_TOKEN } = process.env;
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls?state=all&per_page=100&sort=created&direction=desc`,
    { headers: { authorization: `Bearer ${GH_TOKEN}`, accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const prs = await res.json();
  const verdict = decide({ storeKey, error: REPAIR_ERROR, prs, hasToken: HAS_CLAUDE_TOKEN === 'true' });
  console.log(JSON.stringify(verdict));
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `action=${verdict.action}\nreason=${verdict.reason}\n`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { decide, storeOfBranch, LIMITS };
