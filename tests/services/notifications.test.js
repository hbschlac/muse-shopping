/**
 * Push alerts: settings rules (R8), dispatcher and digest (R9), signed taps (R7).
 */

jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));
jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));
// The watches module (src/services/watches) comes from the Notify me work; stand in for it.
const mockWatches = { rows: [], deactivated: [] };
jest.mock('../../src/services/watches', () => ({
  findWatchesForChange: async c => mockWatches.rows
    .filter(w => w.store_key === c.store_key && w.item_id === c.item_id
      && w.kind === (c.change_type === 'price_change' ? 'price' : 'size')
      && (!w.size || !c.size || w.size === c.size))
    .map(w => ({ id: w.id, kind: w.kind, userId: w.user_id })),
  deactivateWatch: async id => { mockWatches.deactivated.push(id); },
}), { virtual: true });
// Followed stores come from the listing refresh work.
jest.mock('../../src/services/listingWatch/followedStores', () => ({
  followersByStoreKey: async () => new Map([['allbirds', [{ userId: 9, notificationEnabled: true }, { userId: 10, notificationEnabled: false }]]]),
}), { virtual: true });

const pool = require('../../src/db/pool');
const webpush = require('web-push');
const policy = require('../../src/services/notifications/policy');
const { compose, signAlertIds, verifyAlertIds } = require('../../src/services/notifications/compose');
const dispatcher = require('../../src/services/notifications/dispatcher');

// 2026-11-09 12:00 PST = 20:00 UTC
const NOON_PT = new Date('2026-11-09T20:00:00Z');
const ELEVEN_PM_PT = new Date('2026-11-10T07:00:00Z');
const SEVEN_THIRTY_PM_PT = new Date('2026-11-10T03:30:00Z');

const prefs = (over = {}) => policy.normalizePrefs(over);
const drop = (oldC, newC) => ({ change_type: 'price_change', store_key: 'allbirds', item_id: 'p1', old_price_cents: oldC, new_price_cents: newC });

describe('settings rules', () => {
  it('starts with the defaults from the front-end flow doc', () => {
    const p = prefs();
    expect(p.types).toEqual({ back_in_stock: 'push', price_drop: 'digest', new_item: 'off', sale: 'off', cashback: 'off' });
    expect(p).toMatchObject({ quiet_start: '22:00', quiet_end: '08:00', digest_time: '19:00', daily_cap: 5, price_drop_pct: 15, timezone: 'America/Los_Angeles' });
  });

  it('type off logs only; digest saves; push sends', () => {
    const c = { change_type: 'new_item', store_key: 'allbirds' };
    expect(policy.decide('new_item', c, prefs(), { sentToday: 0 }, NOON_PT).status).toBe('off');
    expect(policy.decide('new_item', c, prefs({ types: { new_item: 'digest' } }), {}, NOON_PT).status).toBe('digest');
    expect(policy.decide('new_item', c, prefs({ types: { new_item: 'push' } }), {}, NOON_PT).status).toBe('push');
  });

  it('price drop threshold: 20% alerts, 5% does not, rises never do', () => {
    const p = prefs({ types: { price_drop: 'push' } });
    expect(policy.decide('price_drop', drop(10000, 8000), p, {}, NOON_PT).status).toBe('push');
    expect(policy.decide('price_drop', drop(10000, 9500), p, {}, NOON_PT)).toMatchObject({ status: 'off', reason: 'below_threshold' });
    expect(policy.decide('price_drop', drop(10000, 8500), p, {}, NOON_PT).status).toBe('push'); // exactly 15%
    expect(policy.alertTypeFor(drop(8000, 10000))).toBeNull();
    const p30 = prefs({ types: { price_drop: 'push' }, price_drop_pct: 30 });
    expect(policy.decide('price_drop', drop(10000, 8000), p30, {}, NOON_PT).status).toBe('off');
  });

  it('daily cap sends extras to the digest', () => {
    const c = { change_type: 'back_in_stock', store_key: 'allbirds', item_id: 'p1' };
    expect(policy.decide('back_in_stock', c, prefs(), { sentToday: 4 }, NOON_PT).status).toBe('push');
    expect(policy.decide('back_in_stock', c, prefs(), { sentToday: 5 }, NOON_PT)).toMatchObject({ status: 'digest', reason: 'over_cap' });
    expect(policy.decide('back_in_stock', c, prefs({ daily_cap: 1 }), { sentToday: 1 }, NOON_PT).status).toBe('digest');
  });

  it('quiet hours (Pacific) hold the push until 8am', () => {
    const c = { change_type: 'back_in_stock', store_key: 'allbirds', item_id: 'p1' };
    const d = policy.decide('back_in_stock', c, prefs(), {}, ELEVEN_PM_PT);
    expect(d.status).toBe('held');
    expect(d.send_after.toISOString()).toBe('2026-11-10T16:00:00.000Z'); // 8:00am PST
    // Custom quiet hours that don't cross midnight
    const p = prefs({ quiet_start: '12:00', quiet_end: '13:00' });
    expect(policy.inQuietHours(NOON_PT, p)).toBe(true);
    expect(policy.inQuietHours(SEVEN_THIRTY_PM_PT, p)).toBe(false);
  });

  it('quiet hours can be turned off', () => {
    const c = { change_type: 'back_in_stock', store_key: 'allbirds', item_id: 'p1' };
    const off = prefs({ quiet_enabled: false });
    expect(policy.inQuietHours(ELEVEN_PM_PT, off)).toBe(false);
    expect(policy.decide('back_in_stock', c, off, {}, ELEVEN_PM_PT).status).toBe('push');
    expect(policy.normalizePrefs({}).quiet_enabled).toBe(true);
    expect(policy.validatePrefsPatch({ quiet_enabled: false }).patch).toEqual({ quiet_enabled: false });
    expect(policy.validatePrefsPatch({ quiet_enabled: 'no' }).error).toMatch(/true or false/);
  });

  it('muting a store or one item stops its alerts', () => {
    const c = { change_type: 'back_in_stock', store_key: 'allbirds', item_id: 'p1' };
    expect(policy.decide('back_in_stock', c, prefs({ muted: [{ store_key: 'allbirds' }] }), {}, NOON_PT).reason).toBe('muted');
    expect(policy.decide('back_in_stock', c, prefs({ muted: [{ store_key: 'allbirds', item_id: 'p2' }] }), {}, NOON_PT).status).toBe('push');
    expect(policy.decide('back_in_stock', c, prefs({ muted: [{ store_key: 'allbirds', type: 'new_item' }] }), {}, NOON_PT).status).toBe('push');
  });

  it('digest is due once a day after digest time', () => {
    expect(policy.digestDue(NOON_PT, prefs())).toBe(false);
    expect(policy.digestDue(SEVEN_THIRTY_PM_PT, prefs())).toBe(true);
    expect(policy.digestDue(SEVEN_THIRTY_PM_PT, prefs({ last_digest_at: '2026-11-10T03:05:00Z' }))).toBe(false);
    expect(policy.digestDue(SEVEN_THIRTY_PM_PT, prefs({ last_digest_at: '2026-11-09T03:05:00Z' }))).toBe(true);
  });

  it('"fewer like this" steps push to digest to off, and mutes a store\'s new drops', () => {
    const p = prefs();
    const a = policy.fewerLikeThis(p, { alert_type: 'back_in_stock' });
    expect(a.prefsPatch.types.back_in_stock).toBe('digest');
    const b = policy.fewerLikeThis(prefs({ types: { back_in_stock: 'digest' } }), { alert_type: 'back_in_stock' });
    expect(b.prefsPatch.types.back_in_stock).toBe('off');
    const c = policy.fewerLikeThis(p, { alert_type: 'new_item', store_key: 'allbirds' });
    expect(c.prefsPatch.muted).toEqual([{ store_key: 'allbirds', type: 'new_item' }]);
  });

  it('rejects bad settings', () => {
    expect(policy.validatePrefsPatch({ types: { back_in_stock: 'loud' } }).error).toMatch(/push, digest or off/);
    expect(policy.validatePrefsPatch({ quiet_start: '25:00' }).error).toMatch(/HH:MM/);
    expect(policy.validatePrefsPatch({ daily_cap: -1 }).error).toBeTruthy();
    expect(policy.validatePrefsPatch({ timezone: 'Mars/Base' }).error).toBeTruthy();
    expect(policy.validatePrefsPatch({ daily_cap: 3, price_drop_pct: 20 }).patch).toEqual({ daily_cap: 3, price_drop_pct: 20 });
  });
});

describe('alert text and links', () => {
  it('size back in stock opens the item in Muse', () => {
    const m = compose('back_in_stock', {
      store_key: 'allbirds', item_id: 'gid://shopify/Product/1', size: 'M', name: 'Linen Midi Dress', new_price_cents: 8900,
    });
    expect(m.title).toBe('Your size M is back');
    expect(m.body).toBe('Linen Midi Dress, $89 at Allbirds');
    expect(m.url).toBe('/store-product?store=allbirds&id=gid%3A%2F%2Fshopify%2FProduct%2F1');
  });

  it('price drop names the percent and the old price', () => {
    const m = compose('price_drop', { store_key: 'allbirds', item_id: 'x', name: 'Wool Runner', old_price_cents: 10000, new_price_cents: 8000 });
    expect(m.title).toBe('20% off: Wool Runner');
    expect(m.body).toBe('Now $80, was $100 at Allbirds');
  });

  it('non-partner stores open the store page', () => {
    expect(compose('new_item', { store_key: 'tjmaxx', item_id: '9', name: 'Dress', url: 'https://tjmaxx.tjx.com/p/9' }).url)
      .toBe('https://tjmaxx.tjx.com/p/9');
  });

  it('signs alert ids so the service worker can report taps', () => {
    process.env.JWT_SECRET = 'test-secret';
    const t = signAlertIds([1, 2]);
    expect(verifyAlertIds([1, 2], t)).toBe(true);
    expect(verifyAlertIds([1, 3], t)).toBe(false);
    expect(verifyAlertIds([1, 2], 'nope')).toBe(false);
  });
});

/**
 * A tiny in-memory stand-in for the tables the dispatcher touches.
 */
function fakeDb({ changes = [], watches = [], prefsRows = [], subs = [], sentToday = 0 }) {
  const db = { changes, alerts: [], subs, nextId: 1, prefsRows: new Map(prefsRows.map(p => [p.user_id, p])) };
  mockWatches.rows = watches.map((w, i) => ({ id: i + 1, ...w }));
  mockWatches.deactivated = [];
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('CREATE TABLE')) return { rows: [] };
    if (sql.includes('UPDATE listing_changes')) {
      const rows = db.changes.filter(c => !c.dispatched_at);
      rows.forEach(c => { c.dispatched_at = new Date(); });
      return { rows };
    }
    if (sql.includes('FROM notification_prefs')) return { rows: db.prefsRows.has(params[0]) ? [db.prefsRows.get(params[0])] : [] };
    if (sql.includes('COUNT(*)::int AS n FROM alert_log')) return { rows: [{ n: sentToday }] };
    if (sql.includes('INSERT INTO alert_log')) {
      const [user_id, change_id, alert_type, store_key, item_id, title, body, url, image_url, status, reason, send_after] = params;
      if (db.alerts.some(a => a.user_id === user_id && a.change_id === change_id)) return { rows: [] };
      const row = { id: db.nextId++, user_id, change_id, alert_type, store_key, item_id, title, body, url, image_url, status, reason, send_after };
      db.alerts.push(row);
      return { rows: [row] };
    }
    if (sql.includes("SET status = 'digest', reason = 'over_cap'")) {
      db.alerts.filter(a => params[0].includes(a.id)).forEach(a => { a.status = 'digest'; a.reason = 'over_cap'; });
      return { rows: [] };
    }
    if (sql.includes('UPDATE alert_log SET status = $2')) {
      db.alerts.filter(a => params[0].includes(a.id)).forEach(a => { a.status = params[1]; });
      return { rows: [] };
    }
    if (sql.includes('FROM push_subscriptions')) return { rows: db.subs };
    if (sql.includes('push_subscriptions')) return { rows: [] };
    if (sql.includes("WHERE status = 'held'")) return { rows: db.alerts.filter(a => a.status === 'held' && a.send_after <= params[0]) };
    if (sql.includes("SELECT DISTINCT user_id FROM alert_log WHERE status = 'digest'")) {
      return { rows: [...new Set(db.alerts.filter(a => a.status === 'digest' && !a.digested_at).map(a => a.user_id))].map(user_id => ({ user_id })) };
    }
    if (sql.includes("status = 'digest' AND digested_at IS NULL")) {
      return { rows: db.alerts.filter(a => a.user_id === params[0] && a.status === 'digest' && !a.digested_at) };
    }
    if (sql.includes('SET digested_at')) {
      db.alerts.filter(a => params[0].includes(a.id)).forEach(a => { a.digested_at = new Date(); });
      return { rows: [] };
    }
    if (sql.includes('last_digest_at')) return { rows: [] };
    throw new Error(`unexpected SQL: ${sql.slice(0, 80)}`);
  });
  return db;
}

const change = (id, extra) => ({ id, store_key: 'allbirds', item_id: `p${id}`, name: `Item ${id}`, new_price_cents: 5000, ...extra });

describe('dispatcher', () => {
  beforeEach(() => {
    pool.query.mockReset();
    webpush.sendNotification.mockReset().mockResolvedValue({});
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'pub';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'priv';
    process.env.JWT_SECRET = 'test-secret';
  });

  it('pushes a size-back alert to the shopper watching that size, and logs it', async () => {
    const db = fakeDb({
      changes: [change(1, { change_type: 'back_in_stock', size: 'M' })],
      watches: [{ user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p1', size: 'M' }, { user_id: 8, kind: 'size', store_key: 'allbirds', item_id: 'p1', size: 'S' }],
      subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }],
    });
    const summary = await dispatcher.dispatchPending({ now: NOON_PT });
    expect(summary).toMatchObject({ changes: 1, alerts: 1, pushed: 1 });
    expect(db.alerts).toHaveLength(1);
    expect(db.alerts[0]).toMatchObject({ user_id: 7, status: 'sent', alert_type: 'back_in_stock' });
    const payload = JSON.parse(webpush.sendNotification.mock.calls[0][1]);
    expect(payload).toMatchObject({ title: 'Your size M is back', ids: [db.alerts[0].id] });
    expect(verifyAlertIds(payload.ids, payload.t)).toBe(true);
    expect(mockWatches.deactivated).toEqual([1]); // size watch is one-shot
  });

  it('logs but does not push price drops under the threshold, and digests ones that meet it', async () => {
    const db = fakeDb({
      changes: [
        change(1, { change_type: 'price_change', old_price_cents: 10000, new_price_cents: 9500 }),
        change(2, { change_type: 'price_change', old_price_cents: 10000, new_price_cents: 8000 }),
      ],
      watches: [{ user_id: 7, kind: 'price', store_key: 'allbirds', item_id: 'p1' }, { user_id: 7, kind: 'price', store_key: 'allbirds', item_id: 'p2' }],
      subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }],
    });
    await dispatcher.dispatchPending({ now: NOON_PT });
    expect(db.alerts.map(a => [a.change_id, a.status, a.reason])).toEqual([[1, 'off', 'below_threshold'], [2, 'digest', 'digest_pref']]);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('over the daily cap, alerts land in the digest instead of pushing', async () => {
    const db = fakeDb({
      changes: [change(1, { change_type: 'back_in_stock' }), change(2, { change_type: 'back_in_stock' })],
      watches: [{ user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p1' }, { user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p2' }],
      subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }],
      sentToday: 4,
    });
    await dispatcher.dispatchPending({ now: NOON_PT });
    expect(db.alerts.map(a => a.status)).toEqual(['sent', 'digest']);
    expect(db.alerts[1].reason).toBe('over_cap');
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('holds alerts in quiet hours and sends them after 8am', async () => {
    const db = fakeDb({
      changes: [change(1, { change_type: 'back_in_stock' })],
      watches: [{ user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p1' }],
      subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }],
    });
    await dispatcher.dispatchPending({ now: ELEVEN_PM_PT });
    expect(db.alerts[0].status).toBe('held');
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    await dispatcher.sendHeld({ now: new Date('2026-11-10T16:05:00Z') });
    expect(db.alerts[0].status).toBe('sent');
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('never alerts the same shopper twice for one change', async () => {
    const db = fakeDb({
      changes: [change(1, { change_type: 'back_in_stock' })],
      watches: [{ user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p1' }, { user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p1' }],
      subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }],
    });
    await dispatcher.dispatchPending({ now: NOON_PT });
    db.changes[0].dispatched_at = null; // claimed again by a second run
    await dispatcher.dispatchPending({ now: NOON_PT });
    expect(db.alerts).toHaveLength(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('with no device, the alert still shows in history', async () => {
    const db = fakeDb({
      changes: [change(1, { change_type: 'back_in_stock' })],
      watches: [{ user_id: 7, kind: 'size', store_key: 'allbirds', item_id: 'p1' }],
      subs: [],
    });
    await dispatcher.dispatchPending({ now: NOON_PT });
    expect(db.alerts[0].status).toBe('no_device');
  });

  it('sends one digest push at digest time with everything saved for it', async () => {
    const db = fakeDb({ subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }] });
    db.alerts.push(
      { id: 1, user_id: 7, status: 'digest', title: '20% off: Wool Runner', body: 'Now $80' },
      { id: 2, user_id: 7, status: 'digest', title: 'Your size M is back', body: 'Dress' },
    );
    expect(await dispatcher.runDigests({ now: NOON_PT })).toBe(0); // before 7pm
    expect(await dispatcher.runDigests({ now: SEVEN_THIRTY_PM_PT })).toBe(1);
    const payload = JSON.parse(webpush.sendNotification.mock.calls[0][1]);
    expect(payload.title).toBe('Your Muse digest: 2 updates');
    expect(payload.url).toBe('/profile/notifications/history');
    expect(db.alerts.every(a => a.digested_at)).toBe(true);
  });

  it('bundles several new drops from one store into one push, for followers who want them', async () => {
    const db = fakeDb({
      changes: [1, 2, 3].map(i => change(i, { change_type: 'new_item' })),
      prefsRows: [{ user_id: 9, types: { new_item: 'push' } }, { user_id: 10, types: { new_item: 'push' } }],
      subs: [{ id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }],
    });
    await dispatcher.dispatchPending({ now: NOON_PT });
    expect(db.alerts).toHaveLength(3); // user 10 turned off alerts for this brand
    expect(db.alerts.every(a => a.user_id === 9 && a.status === 'sent')).toBe(true);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(webpush.sendNotification.mock.calls[0][1]);
    expect(payload).toMatchObject({ title: '3 new at Allbirds', ids: [1, 2, 3] });
  });

  it('does nothing (and does not throw) before listing_changes exists', async () => {
    pool.query.mockImplementation(async sql => {
      if (sql.includes('CREATE TABLE')) return { rows: [] };
      throw new Error('relation "listing_changes" does not exist');
    });
    await expect(dispatcher.dispatchPending({ now: NOON_PT })).resolves.toMatchObject({ changes: 0 });
  });
});
