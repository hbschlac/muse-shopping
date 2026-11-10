#!/usr/bin/env node
/**
 * The scheduled listing refresh, in three steps that run in three GitHub jobs
 * (.github/workflows/refresh-listings.yml):
 *
 *   node scripts/refresh-listings.js plan     GET /listings/plan     -> plan.json      (has the secret)
 *   node scripts/refresh-listings.js extract  run each store script  -> results.json   (NO secrets)
 *   node scripts/refresh-listings.js post     POST /listings/ingest  -> repairs.json   (has the secret)
 *
 * Store scripts are code a repair may have rewritten, so they only ever run in
 * the extract step, in a child process with an empty environment.
 *
 * Env: MUSE_API_BASE (default https://www.muse.shopping/api/v1),
 *      NEW_ARRIVALS_POLL_SECRET (plan and post only), RUN_ID (post).
 * Never imports the agent signer; tests/services enforce it for all of scripts/.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const API = (process.env.MUSE_API_BASE || 'https://www.muse.shopping/api/v1').replace(/\/$/, '');
const RUN_ONE = path.join(__dirname, '..', 'extractors', 'run-one.js');
const TASK_TIMEOUT_MS = 90_000;
const PARALLEL = 4;
const REPAIR_AFTER_BROKEN_RUNS = 2;
// Same value as src/services/listingWatch/scripts.js.
const FALLBACK_SCRIPT = 'embedded-product-data';

function authHeaders() {
  const secret = process.env.NEW_ARRIVALS_POLL_SECRET;
  if (!secret) throw new Error('NEW_ARRIVALS_POLL_SECRET is not set');
  return { Authorization: `Bearer ${secret}` };
}

async function api(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status}: ${(json && json.error) || text.slice(0, 200)}`);
  return json && json.data;
}

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1));

/** Run one task in a child process with no environment at all. */
function runInChild(task) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [RUN_ONE], {
      env: { PATH: process.env.PATH, NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS || '' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), TASK_TIMEOUT_MS);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => {
      clearTimeout(timer);
      if (err.trim()) process.stderr.write(err.split('\n').map(l => (l ? `[${task.storeKey}] ${l}` : l)).join('\n'));
      try {
        resolve(JSON.parse(out.trim().split('\n').pop()));
      } catch {
        resolve({
          storeKey: task.storeKey,
          scriptName: task.script,
          ok: false,
          error: code === null ? `timed out after ${TASK_TIMEOUT_MS / 1000}s` : `runner exited ${code}: ${err.trim().split('\n').pop() || 'no output'}`,
        });
      }
    });
    child.stdin.end(JSON.stringify(task));
  });
}

async function plan(outFile) {
  const data = await api('GET', '/listings/plan');
  writeJson(outFile, data.tasks);
  console.log(`plan: ${data.tasks.length} stores`);
}

async function extract(planFile, outFile) {
  const tasks = readJson(planFile);
  const results = [];
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const task = tasks[next++];
      const r = await runInChild(task);
      r.watchedItemIds = task.watchedItemIds || [];
      results.push(r);
      const n = r.output ? r.output.listings.length : 0;
      console.log(`${task.storeKey}: ${r.ok ? `ok, ${n} listings` : `failed: ${r.error}`} (${r.ms ?? '?'}ms, ${r.requestsUsed ?? '?'} requests)`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, tasks.length) }, worker));
  writeJson(outFile, results);
}

async function post(resultsFile, repairsFile) {
  const runId = process.env.RUN_ID || `manual-${Date.now()}`;
  // A store's trial goes first: a healthy one is saved under this run id, and
  // the fallback's result for the same store then comes back as a duplicate.
  const results = readJson(resultsFile).sort((a, b) => Number(!!b.trial) - Number(!!a.trial));
  const summary = {};
  const repairs = [];
  for (const r of results) {
    try {
      const data = await api('POST', '/listings/ingest', {
        storeKey: r.storeKey,
        runId,
        scriptName: r.scriptName,
        scriptVersion: r.scriptVersion,
        ok: !!r.ok,
        error: r.error,
        output: r.output,
        watchedItemIds: r.watchedItemIds,
        trial: !!r.trial,
      });
      summary[data.status] = (summary[data.status] || 0) + 1;
      const label = r.trial ? `${r.storeKey} (trial of ${r.scriptName})` : r.storeKey;
      console.log(`${label}: ${data.status}${data.reason ? ` (${data.reason})` : ''}${data.events ? `, ${data.events} changes` : ''}${data.fallback ? `, switched to ${FALLBACK_SCRIPT}` : ''}${data.fallbackCleared ? ', back off the fallback' : ''}`);
      // The store's own script still fails while the fallback carries it: repair that script.
      if (data.status === 'trial_broken') {
        repairs.push({ storeKey: r.storeKey, script: r.scriptName, reason: 'on fallback', error: data.reason || r.error || null });
      }
    } catch (err) {
      summary.post_failed = (summary.post_failed || 0) + 1;
      console.log(`${r.storeKey}: post failed: ${err.message}`);
    }
  }
  console.log(`summary: ${JSON.stringify(summary)}`);

  // The fallback itself broken two runs in a row: nothing left to fall back to.
  // (A store's own script broken twice is switched to the fallback by ingest,
  // and gets its repair through the daily trial above.)
  const status = await api('GET', '/listings/status');
  for (const s of status.stores || []) {
    if (s.last_status === 'broken' && s.script_name === FALLBACK_SCRIPT
      && Number(s.consecutive_broken) >= REPAIR_AFTER_BROKEN_RUNS) {
      repairs.push({ storeKey: s.store_key, script: s.script_name, reason: 'fallback broken', error: s.last_reason });
    }
  }
  writeJson(repairsFile, repairs);
  if (repairs.length) console.log(`needs repair: ${repairs.map(r => r.storeKey).join(', ')}`);
  if (summary.post_failed === results.length && results.length) process.exitCode = 1;
}

async function main() {
  const [mode, a, b] = process.argv.slice(2);
  if (mode === 'plan') return plan(a || 'plan.json');
  if (mode === 'extract') return extract(a || 'plan.json', b || 'results.json');
  if (mode === 'post') return post(a || 'results.json', b || 'repairs.json');
  throw new Error('usage: refresh-listings.js plan|extract|post');
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runInChild };
