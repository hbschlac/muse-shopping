const {
  shouldSkipVercelBuild,
  classifyRepair,
  parseNameStatus,
} = require('../../scripts/repair/pathRules');

const sources = [
  { key: 'allbirds', script: 'allbirds' },
  { key: 'agolde', script: 'shopify-catalog' },
  { key: 'rothys', script: 'shopify-catalog' },
];

describe('shouldSkipVercelBuild', () => {
  test('skips when only store scripts and fixtures change', () => {
    expect(shouldSkipVercelBuild(['extractors/scripts/allbirds.js', 'extractors/fixtures/allbirds.html'])).toBe(true);
  });
  test('builds when anything else changes', () => {
    expect(shouldSkipVercelBuild(['extractors/scripts/allbirds.js', 'src/app.js'])).toBe(false);
    expect(shouldSkipVercelBuild(['extractors/tools.js'])).toBe(false);
    expect(shouldSkipVercelBuild(['vercel.json'])).toBe(false);
  });
  test('builds when the change list is empty or unknown', () => {
    expect(shouldSkipVercelBuild([])).toBe(false);
    expect(shouldSkipVercelBuild(undefined)).toBe(false);
  });
  test('builds on path tricks', () => {
    expect(shouldSkipVercelBuild(['extractors/scripts/../../src/app.js'])).toBe(false);
  });
});

describe('classifyRepair', () => {
  const M = (path) => ({ status: 'M', path });

  test('one single-store script plus its fixture auto-merges', () => {
    const v = classifyRepair([M('extractors/scripts/allbirds.js'), M('extractors/fixtures/allbirds.html')], sources);
    expect(v).toMatchObject({ autoMerge: true, store: 'allbirds', script: 'allbirds' });
  });

  test('a new fixture file for the same store is fine', () => {
    const v = classifyRepair([M('extractors/scripts/allbirds.js'), { status: 'A', path: 'extractors/fixtures/allbirds.json' }], sources);
    expect(v.autoMerge).toBe(true);
  });

  test('a script shared by several stores waits for hannah', () => {
    const v = classifyRepair([M('extractors/scripts/shopify-catalog.js')], sources);
    expect(v.autoMerge).toBe(false);
    expect(v.reasons.join()).toMatch(/used by 2 stores/);
  });

  test('the shared fallback never auto-merges', () => {
    const v = classifyRepair([M('extractors/scripts/embedded-product-data.js')], [{ key: 'x', script: 'embedded-product-data' }]);
    expect(v.autoMerge).toBe(false);
  });

  test('any file outside store scripts blocks auto-merge', () => {
    for (const p of ['extractors/tools.js', 'extractors/sources.json', 'src/services/listingWatch/health.js', '.github/workflows/repair-extractor.yml', 'package.json']) {
      const v = classifyRepair([M('extractors/scripts/allbirds.js'), M(p)], sources);
      expect(v.autoMerge).toBe(false);
    }
  });

  test('another store\'s fixture blocks auto-merge', () => {
    const v = classifyRepair([M('extractors/scripts/allbirds.js'), M('extractors/fixtures/agolde.html')], sources);
    expect(v.autoMerge).toBe(false);
  });

  test('two scripts, a new script, a deleted script or nested paths block auto-merge', () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js'), M('extractors/scripts/x.js')], sources).autoMerge).toBe(false);
    expect(classifyRepair([{ status: 'A', path: 'extractors/scripts/allbirds.js' }], sources).autoMerge).toBe(false);
    expect(classifyRepair([{ status: 'D', path: 'extractors/scripts/allbirds.js' }], sources).autoMerge).toBe(false);
    expect(classifyRepair([M('extractors/scripts/lib/allbirds.js')], sources).autoMerge).toBe(false);
  });

  test('a deleted fixture blocks auto-merge', () => {
    const v = classifyRepair([M('extractors/scripts/allbirds.js'), { status: 'D', path: 'extractors/fixtures/allbirds.html' }], sources);
    expect(v.autoMerge).toBe(false);
  });

  test('no store list means nothing qualifies', () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js')], []).autoMerge).toBe(false);
    expect(classifyRepair([M('extractors/scripts/allbirds.js')], null).autoMerge).toBe(false);
  });

  test('accepts { stores: [...] } and store_key', () => {
    const v = classifyRepair([M('extractors/scripts/allbirds.js')], { stores: [{ store_key: 'allbirds', script: 'allbirds.js' }] });
    expect(v).toMatchObject({ autoMerge: true, store: 'allbirds' });
  });

  test('empty change list does not merge', () => {
    expect(classifyRepair([], sources).autoMerge).toBe(false);
  });
});

describe('parseNameStatus', () => {
  test('reads git name-status lines including renames', () => {
    expect(parseNameStatus('M\textractors/scripts/a.js\nR100\told.js\textractors/scripts/b.js\n')).toEqual([
      { status: 'M', path: 'extractors/scripts/a.js' },
      { status: 'R100', path: 'extractors/scripts/b.js' },
    ]);
  });
  test('a rename into a store script is not a modification', () => {
    const changes = parseNameStatus('R100\tsrc/evil.js\textractors/scripts/allbirds.js');
    expect(classifyRepair(changes, sources).autoMerge).toBe(false);
  });
});
