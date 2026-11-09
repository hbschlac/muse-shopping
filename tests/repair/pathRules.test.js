const {
  shouldSkipVercelBuild,
  classifyRepair,
  parseNameStatus,
} = require('../../scripts/repair/pathRules');

const partners = { partners: [{ key: 'allbirds' }, { key: 'agolde' }, { key: 'rothys' }] };
const M = (path) => ({ status: 'M', path });
const A = (path) => ({ status: 'A', path });

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
  test('a new per-store script plus its fixture auto-merges', () => {
    const v = classifyRepair([A('extractors/scripts/allbirds.js'), A('extractors/fixtures/allbirds.html')], partners);
    expect(v).toMatchObject({ autoMerge: true, store: 'allbirds', script: 'allbirds' });
  });

  test('editing an existing per-store script auto-merges', () => {
    expect(classifyRepair([M('extractors/scripts/agolde.js'), M('extractors/fixtures/agolde.json')], partners).autoMerge).toBe(true);
  });

  test('shared scripts always wait for hannah', () => {
    for (const name of ['shopify-catalog', 'embedded-product-data']) {
      const v = classifyRepair([M(`extractors/scripts/${name}.js`)], { partners: [{ key: name }] });
      expect(v.autoMerge).toBe(false);
      expect(v.reasons.join()).toMatch(/shared/);
    }
  });

  test('a script not named after a known store waits', () => {
    expect(classifyRepair([A('extractors/scripts/helper.js')], partners).autoMerge).toBe(false);
  });

  test('any file outside store scripts blocks auto-merge', () => {
    for (const p of ['extractors/tools.js', 'extractors/run-one.js', 'src/services/agentBridges/partners.json',
      'src/services/listingWatch/contract.js', '.github/workflows/repair-extractor.yml', 'package.json']) {
      expect(classifyRepair([M('extractors/scripts/allbirds.js'), M(p)], partners).autoMerge).toBe(false);
    }
  });

  test("another store's fixture blocks auto-merge", () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js'), M('extractors/fixtures/agolde.html')], partners).autoMerge).toBe(false);
  });

  test('two scripts, a deleted script or nested paths block auto-merge', () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js'), M('extractors/scripts/agolde.js')], partners).autoMerge).toBe(false);
    expect(classifyRepair([{ status: 'D', path: 'extractors/scripts/allbirds.js' }], partners).autoMerge).toBe(false);
    expect(classifyRepair([M('extractors/scripts/lib/allbirds.js')], partners).autoMerge).toBe(false);
  });

  test('a deleted fixture blocks auto-merge', () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js'), { status: 'D', path: 'extractors/fixtures/allbirds.html' }], partners).autoMerge).toBe(false);
  });

  test('no store list means nothing qualifies', () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js')], []).autoMerge).toBe(false);
    expect(classifyRepair([M('extractors/scripts/allbirds.js')], null).autoMerge).toBe(false);
  });

  test('accepts a bare array of partners', () => {
    expect(classifyRepair([M('extractors/scripts/allbirds.js')], [{ key: 'allbirds' }]).autoMerge).toBe(true);
  });

  test('empty change list does not merge', () => {
    expect(classifyRepair([], partners).autoMerge).toBe(false);
  });
});

describe('parseNameStatus', () => {
  test('reads git name-status lines including renames', () => {
    expect(parseNameStatus('M\textractors/scripts/a.js\nR100\told.js\textractors/scripts/b.js\n')).toEqual([
      { status: 'M', path: 'extractors/scripts/a.js' },
      { status: 'R100', path: 'extractors/scripts/b.js' },
    ]);
  });
  test('a rename into a store script does not auto-merge', () => {
    const changes = parseNameStatus('R100\tsrc/evil.js\textractors/scripts/allbirds.js');
    expect(classifyRepair(changes, partners).autoMerge).toBe(false);
  });
});
