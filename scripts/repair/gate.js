#!/usr/bin/env node
'use strict';

// Decides what a broken store gets right now: an AI repair, an undo of a
// recent repair, an issue for hannah, or nothing (already handled / cap hit).
//
// Spending limits from the plan: 3 AI repairs a day across all stores, 1 open
// repair per store, and a store repaired 3 times in a week is paused for
// hannah. Every AI attempt leaves a PR or an issue labelled `extractor-repair`
// titled "Repair <store>: ...", so counting those counts attempts, including
// failed ones (no extra table, nothing to keep in sync).

const fs = require('fs');

const LABEL = 'extractor-repair';
const STORE_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LIMITS = { perDay: 3, perStorePerWeek: 3 };
// Stores that block cloud servers. Repair can't reach them from GitHub.
const CLOUD_BLOCKED = new Set(['tjmaxx']);
const BLOCK_RE = /\b(bot check|captcha|access denied|forbidden|403|429|rate.?limit)\b/i;
const DAY = 24 * 3600 * 1000;

function storeOfTitle(title) {
  const m = /^Repair ([a-z0-9][a-z0-9-]*):/.exec(title || '');
  return m ? m[1] : null;
}

/**
 * @param {Object} p
 * @param {string} p.storeKey
 * @param {string} [p.error]          last broken run's reason, from /listings/status
 * @param {Array}  p.items            issues and PRs labelled extractor-repair: { title, state, created_at }
 * @param {boolean} [p.recentRepair]  the store's own script was last changed by a repair in the last 24h
 * @param {boolean} [p.hasToken]      CLAUDE_CODE_OAUTH_TOKEN is set
 */
function decide({ storeKey, error, items, now = Date.now(), recentRepair = false, hasToken = true }) {
  if (!STORE_KEY.test(storeKey || '')) return { action: 'reject', reason: 'invalid store key' };

  const mine = (items || []).filter((i) => storeOfTitle(i.title) === storeKey);
  if (mine.some((i) => i.state === 'open')) {
    return { action: 'skip', reason: 'this store already has an open repair PR or issue' };
  }
  if (recentRepair) {
    return { action: 'revert', reason: 'the last repair broke on its first real runs; putting back the previous script' };
  }
  if (CLOUD_BLOCKED.has(storeKey)) {
    return { action: 'issue', reason: `${storeKey} blocks cloud servers, so it can only be fixed from the Mac` };
  }
  if (BLOCK_RE.test(error || '')) {
    return { action: 'issue', reason: 'the store returned a block page, not a layout change, so AI would not help' };
  }
  const weekCount = mine.filter((i) => now - Date.parse(i.created_at) < 7 * DAY).length;
  if (weekCount >= LIMITS.perStorePerWeek) {
    return { action: 'issue', reason: `repaired ${weekCount} times this week, so it is paused for hannah to look at` };
  }
  const dayCount = (items || []).filter((i) => storeOfTitle(i.title) && now - Date.parse(i.created_at) < DAY).length;
  if (dayCount >= LIMITS.perDay) {
    return { action: 'skip', reason: `daily cap reached (${dayCount}/${LIMITS.perDay}); the next broken run tries again` };
  }
  if (!hasToken) {
    return { action: 'issue', reason: 'CLAUDE_CODE_OAUTH_TOKEN is not set in GitHub, so AI repair cannot run' };
  }
  return { action: 'repair', reason: 'within limits' };
}

async function main() {
  const env = process.env;
  const since = new Date(Date.now() - 8 * DAY).toISOString();
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/issues?labels=${LABEL}&state=all&per_page=100&since=${since}`,
    { headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const items = await res.json();
  const verdict = decide({
    storeKey: env.STORE_KEY,
    error: env.REPAIR_ERROR,
    items,
    recentRepair: env.RECENT_REPAIR === 'true',
    hasToken: env.HAS_CLAUDE_TOKEN === 'true',
  });
  console.log(JSON.stringify(verdict));
  if (env.GITHUB_OUTPUT) {
    fs.appendFileSync(env.GITHUB_OUTPUT, `action=${verdict.action}\nreason=${verdict.reason}\n`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { decide, storeOfTitle, LIMITS, LABEL };
