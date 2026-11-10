#!/usr/bin/env node
/**
 * Run one store script for one task.
 *
 *   echo '<task json>' | node extractors/run-one.js
 *
 * Reads the task from stdin, loads extractors/scripts/<task.script>.js, gives
 * it the tools from extractors/tools.js, checks the output against the
 * contract, and prints one JSON result on stdout:
 *
 *   { storeKey, scriptName, scriptVersion, ok, error?, output?, contractErrors?, trial?, requestsUsed, ms }
 *
 * scriptName is the script that actually ran: a store's own script when one
 * exists, so status and repairs name the file to fix.
 *
 * scriptVersion is a hash of the script file, so the server can tell when a
 * repair replaced the script and start a fresh baseline instead of alerting.
 *
 * Runs in the GitHub job that has no secrets. Must not import from src/
 * except the contract (a test enforces it).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createTools } = require('./tools');
const { validateOutput } = require('../src/services/listingWatch/contract');

const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const SCRIPT_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
// Same value as src/services/listingWatch/scripts.js (store scripts may not import it).
const DEFAULT_SCRIPT = 'shopify-catalog';

function scriptPath(name) {
  if (!SCRIPT_NAME_RE.test(String(name || ''))) throw new Error(`bad script name: ${name}`);
  return path.join(SCRIPTS_DIR, `${name}.js`);
}

/**
 * Which script to run. A store's own script (extractors/scripts/<storeKey>.js,
 * written by a repair) replaces the default; an override (the fallback) wins
 * over both because the plan already put it in task.script.
 */
function resolveScript(task) {
  if (task.script === DEFAULT_SCRIPT && SCRIPT_NAME_RE.test(String(task.storeKey || ''))
    && fs.existsSync(path.join(SCRIPTS_DIR, `${task.storeKey}.js`))) {
    return task.storeKey;
  }
  return task.script;
}

function scriptVersion(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
}

async function runTask(task, { toolsOptions } = {}) {
  const started = Date.now();
  const name = resolveScript(task);
  const result = { storeKey: task.storeKey, scriptName: name, scriptVersion: null, ok: false };
  if (task.trial) result.trial = true;
  let tools;
  try {
    const file = scriptPath(name);
    result.scriptVersion = scriptVersion(file);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const script = require(file);
    tools = createTools(task, toolsOptions);
    const output = await script.run({ task, tools });
    const checked = validateOutput(output);
    if (!checked.ok) {
      result.error = checked.errors[0];
    } else {
      result.ok = true;
      result.output = { listings: checked.listings };
      if (checked.errors.length) result.contractErrors = checked.errors;
    }
  } catch (err) {
    result.error = String(err && err.message ? err.message : err).slice(0, 500);
  }
  result.requestsUsed = tools ? tools.requestsUsed : 0;
  result.ms = Date.now() - started;
  return result;
}

async function main() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const task = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const result = await runTask(task);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err}\n`);
    process.exit(1);
  });
}

module.exports = { runTask, resolveScript, scriptPath, scriptVersion, SCRIPTS_DIR };
