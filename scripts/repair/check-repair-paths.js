#!/usr/bin/env node
'use strict';

// Path check for self-repair PRs. Usage:
//   node scripts/repair/check-repair-paths.js <base-sha> <head-sha>
// Reads the store list (agent bridges partners.json) from the BASE commit, so a
// PR can't widen its own permissions by editing it. Prints a JSON verdict and writes
// `auto_merge`, `store` and `script` to $GITHUB_OUTPUT when set.
// Exit 0 = eligible for auto-merge, 2 = not eligible (needs hannah), 1 = error.

const fs = require('fs');
const { execFileSync } = require('child_process');
const { classifyRepair, parseNameStatus } = require('./pathRules');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function main() {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) throw new Error('usage: check-repair-paths.js <base> <head>');

  const changes = parseNameStatus(git(['diff', '--name-status', '-M', `${base}...${head}`]));

  let partners = [];
  try {
    partners = JSON.parse(git(['show', `${base}:src/services/agentBridges/partners.json`]));
  } catch {
    // No store list: nothing can qualify, which classifyRepair reports.
  }

  const verdict = classifyRepair(changes, partners);
  console.log(JSON.stringify({ ...verdict, files: changes }, null, 2));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `auto_merge=${verdict.autoMerge}\nstore=${verdict.store || ''}\nscript=${verdict.script || ''}\n`
    );
  }
  process.exit(verdict.autoMerge ? 0 : 2);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
