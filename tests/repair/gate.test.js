const { decide, storeOfBranch } = require('../../scripts/repair/gate');

const now = Date.parse('2026-11-09T22:00:00Z');
const ago = (h) => new Date(now - h * 3600 * 1000).toISOString();
const pr = (store, hoursAgo, state = 'closed') => ({ head: { ref: `repair/${store}-run-${hoursAgo}` }, created_at: ago(hoursAgo), state });

test('repairs when within limits', () => {
  expect(decide({ storeKey: 'allbirds', prs: [], now }).action).toBe('repair');
});

test('rejects store keys that could reach a shell', () => {
  expect(decide({ storeKey: 'a; rm -rf /', prs: [], now }).action).toBe('reject');
  expect(decide({ storeKey: '', prs: [], now }).action).toBe('reject');
});

test('block pages and TJ Maxx go to hannah, not AI', () => {
  expect(decide({ storeKey: 'allbirds', error: 'HTTP 403 Forbidden', prs: [], now }).action).toBe('issue');
  expect(decide({ storeKey: 'allbirds', error: 'captcha page', prs: [], now }).action).toBe('issue');
  expect(decide({ storeKey: 'tjmaxx', prs: [], now }).action).toBe('issue');
});

test('one open repair per store', () => {
  expect(decide({ storeKey: 'allbirds', prs: [pr('allbirds', 1, 'open')], now }).action).toBe('skip');
  expect(decide({ storeKey: 'agolde', prs: [pr('allbirds', 1, 'open')], now }).action).toBe('repair');
});

test('3 repairs a day across all stores', () => {
  const prs = [pr('a', 1), pr('b', 5), pr('c', 23)];
  expect(decide({ storeKey: 'allbirds', prs, now }).action).toBe('skip');
  expect(decide({ storeKey: 'allbirds', prs: [pr('a', 1), pr('b', 5), pr('c', 25)], now }).action).toBe('repair');
});

test('a store repaired 3 times in a week is paused', () => {
  const prs = [pr('allbirds', 30), pr('allbirds', 80), pr('allbirds', 150)];
  expect(decide({ storeKey: 'allbirds', prs, now })).toMatchObject({ action: 'issue' });
});

test('missing plan token opens an issue instead of failing quietly', () => {
  expect(decide({ storeKey: 'allbirds', prs: [], now, hasToken: false }).action).toBe('issue');
});

test('ignores PRs that are not repairs', () => {
  const prs = [1, 2, 3, 4].map((h) => ({ head: { ref: `claude/x-${h}` }, created_at: ago(h), state: 'open' }));
  expect(decide({ storeKey: 'allbirds', prs, now }).action).toBe('repair');
  expect(storeOfBranch('repair/allbirds-run-123')).toBe('allbirds');
  expect(storeOfBranch('main')).toBeNull();
});
