#!/usr/bin/env node
'use strict';

// Reads one store's row from GET /api/v1/listings/status and writes it to
// $GITHUB_OUTPUT (error, script_name, override_script). Missing secret or a
// failed call is not fatal: the repair runs with what it has.
//
//   node scripts/repair/status.js <storeKey>

const fs = require('fs');

const API = (process.env.MUSE_API_BASE || 'https://www.muse.shopping/api/v1').replace(/\/$/, '');

function oneLine(v) {
  return String(v || '').replace(/[\r\n]+/g, ' ').slice(0, 300);
}

async function main() {
  const storeKey = process.argv[2];
  const out = { error: '', script_name: '', override_script: '' };
  const secret = process.env.NEW_ARRIVALS_POLL_SECRET;
  if (secret) {
    try {
      const res = await fetch(`${API}/listings/status`, { headers: { authorization: `Bearer ${secret}` } });
      const body = await res.json();
      const row = (body.stores || []).find((s) => s.store_key === storeKey || s.storeKey === storeKey);
      if (row) {
        out.error = oneLine(row.last_reason);
        out.script_name = oneLine(row.script_name);
        out.override_script = oneLine(row.override_script);
      }
    } catch (err) {
      console.log(`status unavailable: ${err.message}`);
    }
  }
  console.log(JSON.stringify(out));
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}\n`).join(''));
  }
}

main();
