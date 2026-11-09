/**
 * Store scripts run with no secrets and may be rewritten by an AI repair.
 * Keep them unable to reach anything else in the app: extractors/ may require
 * only node built-ins, other extractors/ files, and the listing contract.
 */
const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const ROOT = path.join(__dirname, '../..');
const EXTRACTORS = path.join(ROOT, 'extractors');
const CONTRACT = path.join(ROOT, 'src/services/listingWatch/contract.js');
const FORBIDDEN = /agentSigning|process\.env|child_process|\bdotenv\b|\bpg\b|config\/database/;

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return jsFiles(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

const files = [...jsFiles(EXTRACTORS), CONTRACT];

describe('store script isolation', () => {
  test.each(files.map(f => [path.relative(ROOT, f), f]))('%s requires only what it may', (rel, file) => {
    const src = fs.readFileSync(file, 'utf8');
    for (const [, spec] of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      if (builtinModules.includes(spec.replace(/^node:/, ''))) {
        expect(['child_process', 'cluster', 'worker_threads', 'vm']).not.toContain(spec.replace(/^node:/, ''));
        continue;
      }
      expect(spec.startsWith('.')).toBe(true);
      const target = require.resolve(path.resolve(path.dirname(file), spec));
      expect(target === CONTRACT || target.startsWith(EXTRACTORS + path.sep)).toBe(true);
    }
    expect(src).not.toMatch(FORBIDDEN);
  });

  test('scripts/refresh-listings.js gives store scripts an empty environment', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/refresh-listings.js'), 'utf8');
    expect(src).toMatch(/env: \{ PATH: process\.env\.PATH, NODE_EXTRA_CA_CERTS/);
    expect(src).not.toMatch(/agentSigning/);
  });

  test('the extract job in the workflow has no secrets and no token permissions', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/refresh-listings.yml'), 'utf8');
    const extract = wf.split(/\n  extract:\n/)[1].split(/\n  post:\n/)[0];
    expect(extract).toMatch(/permissions: \{\}/);
    expect(extract).not.toMatch(/secrets\./);
    expect(extract).toMatch(/persist-credentials: false/);
  });
});
