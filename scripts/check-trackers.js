#!/usr/bin/env node
/**
 * Blocks third-party trackers from shipping in Muse.
 *
 * Muse loads no ad, analytics or social tracking scripts, and no third-party
 * fonts, so visitors' browsers only ever talk to Muse. This check fails CI if
 * a change adds one: a tracker script or domain in site code, or a tracker
 * SDK in package.json.
 *
 * If Muse ever adds a tracker on purpose, it must load only after the visitor
 * says yes in the privacy banner. Put that code behind the consent check and
 * mark the line with the comment `tracker-check: consent-gated`; that line is
 * then allowed. Anything else fails.
 *
 * Usage: node scripts/check-trackers.js   (exit 1 when something is found)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Domains and snippets that mean "a browser will contact a tracker or a third party".
const PATTERNS = [
  ['Google Tag Manager / Analytics', /googletagmanager\.com|google-analytics\.com|gtag\/js/i],
  ['Google ads', /doubleclick\.net|googleadservices\.com|googlesyndication\.com/i],
  ['Meta Pixel', /connect\.facebook\.net|facebook\.com\/tr\b|fbevents\.js|\bfbq\s*\(/i],
  ['TikTok Pixel', /analytics\.tiktok\.com|\bttq\.load\b/i],
  ['Pinterest tag', /s\.pinimg\.com\/ct|\bpintrk\s*\(/i],
  ['Snap Pixel', /sc-static\.net\/scevent/i],
  ['LinkedIn Insight', /snap\.licdn\.com|px\.ads\.linkedin\.com/i],
  ['Microsoft ads / Clarity', /bat\.bing\.com|clarity\.ms/i],
  ['Hotjar', /static\.hotjar\.com/i],
  ['Segment', /cdn\.segment\.com/i],
  ['Mixpanel', /cdn\.mxpnl\.com/i],
  ['Amplitude', /cdn\.amplitude\.com/i],
  ['PostHog', /posthog\.com\/static|i\.posthog\.com/i],
  ['Google Fonts (third-party request)', /fonts\.googleapis\.com|fonts\.gstatic\.com/i],
  ['Adobe Fonts (third-party request)', /use\.typekit\.net/i],
];

// npm packages that are tracker SDKs.
const TRACKER_PACKAGES = [
  'react-ga', 'react-ga4', 'react-gtm-module', '@next/third-parties',
  'react-facebook-pixel', 'facebook-pixel',
  '@vercel/analytics', '@vercel/speed-insights',
  'posthog-js', 'mixpanel-browser', '@segment/analytics-next', 'analytics',
  'amplitude-js', '@amplitude/analytics-browser', '@hotjar/browser', 'react-hotjar',
  '@microsoft/clarity', 'tiktok-pixel',
];

// What ships to visitors or runs the server.
const SCAN_DIRS = ['frontend/app', 'frontend/components', 'frontend/lib', 'frontend/public', 'src', 'api'];
// Pages in public/ that the server actually serves (the rest are old demos nobody can reach).
const SERVED_PUBLIC = ['public/index.html', 'public/privacy-policy.html', 'public/terms-of-service.html', 'public/pdp.html'];
const TEXT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.css', '.json']);
const ALLOW_MARK = 'tracker-check: consent-gated';

function trackedFiles() {
  const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  return out.filter(f => (SCAN_DIRS.some(d => f.startsWith(`${d}/`)) || SERVED_PUBLIC.includes(f))
    && TEXT_EXT.has(path.extname(f).toLowerCase())
    && !/\.(backup|bak\d*)$/.test(f)
    && !f.includes('/__tests__/'));
}

function scanFile(rel) {
  const hits = [];
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return hits;
  }
  if (text.length > 2_000_000) return hits; // embedded images, not code
  text.split('\n').forEach((line, i) => {
    if (line.includes(ALLOW_MARK)) return;
    for (const [name, re] of PATTERNS) {
      if (re.test(line)) hits.push(`${rel}:${i + 1}  ${name}`);
    }
  });
  return hits;
}

function scanPackages() {
  const hits = [];
  for (const rel of ['package.json', 'frontend/package.json']) {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    } catch {
      continue;
    }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of TRACKER_PACKAGES) {
      if (deps[name]) hits.push(`${rel}  tracker package "${name}"`);
    }
  }
  return hits;
}

function main() {
  const hits = [...trackedFiles().flatMap(scanFile), ...scanPackages()];
  if (hits.length) {
    console.error('tracker-check: found third-party trackers or requests:\n');
    hits.forEach(h => console.error(`  ${h}`));
    console.error(`\nMuse must not load trackers or third-party resources without consent.`);
    console.error(`Remove them, self-host the file, or load it only after consent and mark the line "${ALLOW_MARK}".`);
    process.exit(1);
  }
  console.log('tracker-check: no third-party trackers found');
}

if (require.main === module) main();

module.exports = { PATTERNS, scanFile, scanPackages };
