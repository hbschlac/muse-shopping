'use strict';

// Which changed files a self-repair may touch, and when a commit can skip the
// Vercel build. Pure functions, no I/O, so the rules are easy to test and the
// GitHub workflows, the Vercel ignore step and the tests all share one copy.
//
// Workstream D of code mode (see docs: backend plan "Deploy gate and safety").

const SCRIPT_DIR = 'extractors/scripts/';
const FIXTURE_DIR = 'extractors/fixtures/';

// Shared scripts serve many stores, so a change to one is never "one store's
// script" and always waits for hannah. A repair instead writes a per-store
// script named after the store key (extractors/scripts/<storeKey>.js), which
// run-one.js prefers over the shared default.
const SHARED_SCRIPTS = new Set(['embedded-product-data', 'shopify-catalog']);

function normalize(p) {
  return String(p || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

// Paths that never reach www.muse.shopping. A commit made only of these does
// not need a Vercel build.
function isSiteIrrelevant(file) {
  const f = normalize(file);
  return (f.startsWith(SCRIPT_DIR) || f.startsWith(FIXTURE_DIR)) && !f.includes('..');
}

// Returns true when Vercel can skip the build. An empty list means we could
// not tell what changed, so we build.
function shouldSkipVercelBuild(files) {
  const list = (files || []).map(normalize).filter(Boolean);
  return list.length > 0 && list.every(isSiteIrrelevant);
}

// Known store keys, from src/services/agentBridges/partners.json (read from
// the base commit by the caller, so a PR can't add itself a store).
function storeKeys(partners) {
  const list = Array.isArray(partners) ? partners : (partners && partners.partners) || [];
  return new Set(list.map((p) => p && p.key).filter(Boolean));
}

// changes: [{ status: 'M'|'A'|'D'|'R...', path }] as from `git diff --name-status`.
// Returns { autoMerge, store, script, reasons }. autoMerge is true only when the
// change is one per-store script (named after a known store key, added or
// modified) plus that store's saved test pages.
function classifyRepair(changes, partners) {
  const reasons = [];
  const list = (changes || []).map((c) => ({
    status: String(c.status || '').charAt(0).toUpperCase(),
    path: normalize(c.path),
  }));

  if (list.length === 0) reasons.push('no files changed');

  const scripts = list.filter((c) => c.path.startsWith(SCRIPT_DIR));
  const fixtures = list.filter((c) => c.path.startsWith(FIXTURE_DIR));
  const other = list.filter((c) => !c.path.startsWith(SCRIPT_DIR) && !c.path.startsWith(FIXTURE_DIR));

  for (const c of list) {
    if (c.path.includes('..')) reasons.push(`path escapes its folder: ${c.path}`);
  }
  for (const c of other) reasons.push(`outside store scripts: ${c.path}`);

  let script = null;
  let store = null;

  if (scripts.length !== 1) {
    reasons.push(`must change exactly one store script, changed ${scripts.length}`);
  } else {
    const s = scripts[0];
    const rest = s.path.slice(SCRIPT_DIR.length);
    if (rest.includes('/') || !rest.endsWith('.js')) {
      reasons.push(`not a top-level store script: ${s.path}`);
    } else {
      script = rest.slice(0, -3);
    }
    if (s.status !== 'M' && s.status !== 'A') {
      reasons.push(`script must be added or modified, not deleted or renamed (${s.status})`);
    }
  }

  if (script) {
    if (SHARED_SCRIPTS.has(script)) {
      reasons.push(`${script} is shared by many stores`);
    } else if (!storeKeys(partners).has(script)) {
      reasons.push(`${script} is not a known store key, so it is not a per-store script`);
    } else {
      store = script;
    }
  }

  for (const f of fixtures) {
    const rest = f.path.slice(FIXTURE_DIR.length);
    const base = rest.split('.')[0];
    if (rest.includes('/') || !store || base !== store) {
      reasons.push(`fixture is not the repaired store's: ${f.path}`);
    }
    if (f.status === 'D') reasons.push(`fixture deleted: ${f.path}`);
  }

  return { autoMerge: reasons.length === 0, store, script, reasons };
}

// Parse `git diff --name-status` output.
function parseNameStatus(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split('\t');
      // Renames list old then new path; judge the new path but keep the R.
      return { status: parts[0], path: parts[parts.length - 1] };
    });
}

module.exports = {
  SCRIPT_DIR,
  FIXTURE_DIR,
  SHARED_SCRIPTS,
  isSiteIrrelevant,
  shouldSkipVercelBuild,
  storeKeys,
  classifyRepair,
  parseNameStatus,
};
