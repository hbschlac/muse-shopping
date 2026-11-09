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
  const results = readJson(resultsFile);
  const summary = {};
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
      });
      summary[data.status] = (summary[data.status] || 0) + 1;
      console.log(`${r.storeKey}: ${data.status}${data.reason ? ` (${data.reason})` : ''}${data.events ? `, ${data.events} changes` : ''}`);
    } catch (err) {
      summary.post_failed = (summary.post_failed || 0) + 1;
      console.log(`${r.storeKey}: post failed: ${err.message}`);
    }
  }
  console.log(`summary: ${JSON.stringify(summary)}`);

  // Stores broken two runs in a row get a repair attempt.
  const status = await api('GET', '/listings/status');
  const repairs = (status.stores || [])
    .filter(s => s.last_status === 'broken' && Number(s.consecutive_broken) >= REPAIR_AFTER_BROKEN_RUNS)
    .map(s => ({ storeKey: s.store_key, script: s.script_name, error: s.last_reason, runId: s.last_run_id }));
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
