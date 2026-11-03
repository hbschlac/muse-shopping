#!/usr/bin/env node
/**
 * Outside-in check of Muse's published agent key directory.
 *
 *   node scripts/check-agent-directory.js [https://www.muse.shopping]
 *
 * Fails (exit 1) if the directory publishes private key members, a key that
 * did not sign it, an expired or long-lived directory signature, or more keys
 * than a rotation needs. Runs weekly in .github/workflows/agent-key-watch.yml.
 *
 * Until Cloud KMS is set up the directory answers 503; that passes with a
 * notice unless REQUIRE_AGENT_DIRECTORY=true.
 */

const { checkDirectory } = require('../src/services/agentSigning/verify');

async function main() {
  const origin = (process.argv[2] || 'https://www.muse.shopping').replace(/\/$/, '');
  const url = `${origin}/.well-known/http-message-signatures-directory`;
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  const body = await res.text();

  if (res.status === 503 || res.status === 404) {
    const msg = `Directory not live yet (${res.status}). Expected until Cloud KMS is configured.`;
    if (process.env.REQUIRE_AGENT_DIRECTORY === 'true') { console.error(msg); return 1; }
    console.log(`::notice::${msg}`);
    return 0;
  }
  if (!res.ok) { console.error(`Directory returned ${res.status}`); return 1; }

  const headers = Object.fromEntries(res.headers.entries());
  const problems = checkDirectory({ authority: new URL(origin).host, body, headers });
  if (problems.length) {
    console.error('Agent key directory problems:');
    problems.forEach((p) => console.error(`  - ${p}`));
    return 1;
  }
  const n = JSON.parse(body).keys.length;
  console.log(`Agent key directory healthy: ${n} public key(s), each verified.`);
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(`Directory check failed: ${err.message}`);
  process.exit(1);
});
