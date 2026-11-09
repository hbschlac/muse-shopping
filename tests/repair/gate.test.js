const { decide, storeOfTitle } = require('../../scripts/repair/gate');

const now = Date.parse('2026-11-09T22:00:00Z');
const ago = (h) => new Date(now - h * 3600 * 1000).toISOString();
const item = (store, hoursAgo, state = 'closed') => ({ title: `Repair ${store}: rewrite`, created_at: ago(hoursAgo), state });

test('repairs when within limits', () => {
  expect(decide({ storeKey: 'allbirds', items: [], now }).action).toBe('repair');
});

test('rejects store keys that could reach a shell', () => {
  expect(decide({ storeKey: 'a; rm -rf /', items: [], now }).action).toBe('reject');
  expect(decide({ storeKey: '', items: [], now }).action).toBe('reject');
});

test('block pages and TJ Maxx go to hannah, not AI', () => {
  expect(decide({ storeKey: 'allbirds', error: 'GET https://x/ returned 403', items: [], now }).action).toBe('issue');
  expect(decide({ storeKey: 'allbirds', error: 'bot check: https://x returned a bot check page', items: [], now }).action).toBe('issue');
  expect(decide({ storeKey: 'tjmaxx', items: [], now }).action).toBe('issue');
});

test('an off-store request by a buggy script is a script bug, so AI may repair it', () => {
  expect(decide({ storeKey: 'allbirds', error: 'blocked: evil.com is not this store', items: [], now }).action).toBe('repair');
});

test('one open repair PR or issue per store', () => {
  expect(decide({ storeKey: 'allbirds', items: [item('allbirds', 1, 'open')], now }).action).toBe('skip');
  expect(decide({ storeKey: 'agolde', items: [item('allbirds', 1, 'open')], now }).action).toBe('repair');
});

test('3 attempts a day across all stores, failed ones included', () => {
  expect(decide({ storeKey: 'allbirds', items: [item('a', 1), item('b', 5), item('c', 23)], now }).action).toBe('skip');
  expect(decide({ storeKey: 'allbirds', items: [item('a', 1), item('b', 5), item('c', 25)], now }).action).toBe('repair');
});

test('a store repaired 3 times in a week is paused', () => {
  const items = [item('allbirds', 30), item('allbirds', 80), item('allbirds', 150)];
  expect(decide({ storeKey: 'allbirds', items, now }).action).toBe('issue');
});

test('a repair that broke right after landing is undone, not repaired again', () => {
  expect(decide({ storeKey: 'allbirds', items: [item('allbirds', 3)], recentRepair: true, now }).action).toBe('revert');
});

test('missing plan token opens an issue instead of failing quietly', () => {
  expect(decide({ storeKey: 'allbirds', items: [], now, hasToken: false }).action).toBe('issue');
});

test('ignores labelled items that are not repair titles', () => {
  const items = [1, 2, 3, 4].map((h) => ({ title: `Something else ${h}`, created_at: ago(h), state: 'open' }));
  expect(decide({ storeKey: 'allbirds', items, now }).action).toBe('repair');
  expect(storeOfTitle('Repair allbirds: new store script')).toBe('allbirds');
  expect(storeOfTitle('Fix things')).toBeNull();
});
