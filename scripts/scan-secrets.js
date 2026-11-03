#!/usr/bin/env node
/**
 * Secret scanner for muse-shopping. No dependencies, so it runs in the
 * pre-commit hook, in CI, and in a Claude session alike.
 *
 *   node scripts/scan-secrets.js --staged   # what is about to be committed (pre-commit)
 *   node scripts/scan-secrets.js --all      # every tracked file (CI)
 *   node scripts/scan-secrets.js <files...>
 *
 * Exits 1 and prints file:line plus the rule (never the matched value) when it
 * finds private keys, service-account keys, OIDC/Google tokens, or files that
 * should never be committed. Gitleaks in CI covers git history and the long
 * tail of other providers; this covers what matters for Muse's agent identity
 * with zero setup.
 *
 * False positive? Add `secret-scan: allow` on that line, with a reason.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOW_MARK = 'secret-scan: allow';

const FILE_RULES = [
  [/(^|\/)\.env(\.[^/]*)?$/, 'env file', (f) => !/\.(example|sample|template)$/.test(f)],
  // .pem is left to the PEM line rule: public CA bundles are .pem too.
  [/\.(key|p8|p12|pfx|jks|keystore)$/i, 'private key or key store file'],
  [/(^|\/)id_(rsa|ed25519|ecdsa|dsa)$/, 'SSH private key file'],
  [/private[^/]*\.jwk(\.json)?$/i, 'private JWK file'],
  [/(^|\/)(service[-_]?account|gcp[-_]?key|credentials)[^/]*\.json$/i, 'cloud credentials file'],
];

function decodeJwtPayload(jwt) {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

const LINE_RULES = [
  { name: 'PEM private key', re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/ },
  { name: 'PGP private key', re: /-----BEGIN PGP PRIVATE KEY BLOCK-----/ }, // secret-scan: allow rule definition
  { name: 'Google OAuth access token', re: /\bya29\.[0-9A-Za-z_-]{30,}/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'GitHub token', re: /\b(gh[pousr]_[0-9A-Za-z]{36,}|github_pat_[0-9A-Za-z_]{60,})\b/ },
  { name: 'Stripe live secret key', re: /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/ },
  { name: 'OpenAI API key', re: /\bsk-(proj-)?[0-9A-Za-z_-]{32,}\b/ },
  { name: 'AWS access key id', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'Vercel token', re: /\bvercel_[0-9A-Za-z]{24,}\b/i, weak: true },
  {
    name: 'Agent private key in env assignment',
    re: /\b[A-Z0-9_]*(AGENT|TAP|WEB_?BOT|UCP|SIGNING)[A-Z0-9_]*(PRIVATE|SECRET|SEED)[A-Z0-9_]*\s*[=:]\s*['"]?[A-Za-z0-9+/_=-]{24,}/,
  },
  {
    name: 'Cloud identity JWT (Vercel OIDC / Google)',
    re: /\beyJ[0-9A-Za-z_-]{10,}\.eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{20,}/,
    check(match) {
      const p = decodeJwtPayload(match[0]);
      return Boolean(p && typeof p.iss === 'string' && /oidc\.vercel\.com|accounts\.google\.com|sts\.googleapis\.com/.test(p.iss));
    },
  },
];

// Whole-file rules for things that span lines.
const CONTENT_RULES = [
  {
    name: 'Private JWK (has "d")',
    test: (text) => /"kty"\s*:/.test(text) && /"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/.test(text),
    line: (lines) => lines.findIndex((l) => /"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/.test(l)),
  },
  {
    name: 'GCP service account key',
    test: (text) => /"type"\s*:\s*"service_account"/.test(text) && /"private_key"\s*:/.test(text),
    line: (lines) => lines.findIndex((l) => /"private_key"\s*:/.test(l)),
  },
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function listFiles(mode, args) {
  if (mode === 'staged') {
    return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
  }
  if (mode === 'all') return git(['ls-files', '-z']).split('\0').filter(Boolean);
  return args;
}

function readContent(file, mode) {
  try {
    if (mode === 'staged') {
      return execFileSync('git', ['show', `:${file}`], { maxBuffer: MAX_BYTES * 2 });
    }
    const st = fs.statSync(file);
    if (!st.isFile() || st.size > MAX_BYTES) return null;
    return fs.readFileSync(file);
  } catch (e) {
    return null;
  }
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

function scanText(file, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(ALLOW_MARK)) return;
    for (const rule of LINE_RULES) {
      const m = line.match(rule.re);
      if (m && (!rule.check || rule.check(m))) findings.push({ file, line: i + 1, rule: rule.name });
    }
  });
  for (const rule of CONTENT_RULES) {
    if (rule.test(text)) {
      const idx = rule.line(lines);
      if (idx >= 0 && lines[idx].includes(ALLOW_MARK)) continue;
      findings.push({ file, line: idx + 1, rule: rule.name });
    }
  }
  return findings;
}

function scanFiles(files, mode) {
  const findings = [];
  for (const file of files) {
    const norm = file.split(path.sep).join('/');
    if (/(^|\/)node_modules\//.test(norm)) continue;
    for (const [re, name, when] of FILE_RULES) {
      if (re.test(norm) && (!when || when(norm))) findings.push({ file: norm, line: 0, rule: `${name} committed` });
    }
    const buf = readContent(file, mode);
    if (!buf || isBinary(buf)) continue;
    findings.push(...scanText(norm, buf.toString('utf8')));
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const mode = argv.includes('--staged') ? 'staged' : argv.includes('--all') ? 'all' : 'files';
  const files = listFiles(mode, argv.filter((a) => !a.startsWith('--')));
  const findings = scanFiles(files, mode);
  if (!findings.length) {
    console.log(`secret-scan: ${files.length} file(s) clean`);
    return 0;
  }
  console.error(`secret-scan: ${findings.length} finding(s). Values are not printed.`);
  for (const f of findings) console.error(`  ${f.file}${f.line ? `:${f.line}` : ''}  ${f.rule}`);
  console.error('\nRemove the secret, rotate it if it was ever pushed, and use Cloud KMS / Vercel env instead.');
  console.error(`If this is a false positive, add "${ALLOW_MARK} <reason>" on that line.`);
  return 1;
}

if (require.main === module) process.exit(main());

module.exports = { scanText, scanFiles, LINE_RULES, FILE_RULES };
