/**
 * Push alerts, notification settings and alert history (R7, R8, R9).
 *
 *   dispatchPending()  send alerts for new listing_changes (called after ingest)
 *   runAll()           dispatch + quiet-hours releases + daily digests (cron)
 */

const pool = require('../../db/pool');
const logger = require('../../utils/logger');
const { ensureSchema } = require('./schema');
const policy = require('./policy');
const push = require('./push');
const { signAlertIds, verifyAlertIds, itemUrl } = require('./compose');
const dispatcher = require('./dispatcher');

async function getPrefs(userId) {
  await ensureSchema();
  return dispatcher.loadPrefs(userId);
}

async function updatePrefs(userId, body) {
  const { patch, error } = policy.validatePrefsPatch(body);
  if (error) throw Object.assign(new Error(error), { statusCode: 400 });
  await ensureSchema();
  const current = await dispatcher.loadPrefs(userId);
  const next = {
    ...current,
    ...patch,
    types: { ...current.types, ...(patch.types || {}) },
  };
  await pool.query(
    `INSERT INTO notification_prefs
       (user_id, types, muted, quiet_start, quiet_end, digest_time, timezone, daily_cap, price_drop_pct, quiet_enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (user_id) DO UPDATE SET
       types = EXCLUDED.types, muted = EXCLUDED.muted, quiet_start = EXCLUDED.quiet_start,
       quiet_end = EXCLUDED.quiet_end, digest_time = EXCLUDED.digest_time, timezone = EXCLUDED.timezone,
       daily_cap = EXCLUDED.daily_cap, price_drop_pct = EXCLUDED.price_drop_pct,
       quiet_enabled = EXCLUDED.quiet_enabled, updated_at = now()`,
    [userId, JSON.stringify(next.types), JSON.stringify(next.muted), next.quiet_start, next.quiet_end,
      next.digest_time, next.timezone, next.daily_cap, next.price_drop_pct, next.quiet_enabled !== false],
  );
  return policy.normalizePrefs(next);
}

async function listAlerts(userId, { limit = 50, before = null } = {}) {
  await ensureSchema();
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const beforeId = parseInt(before, 10) || null;
  const { rows } = await pool.query(
    `SELECT id, alert_type, store_key, item_id, title, body, url, image_url, status, reason,
            created_at, sent_at, digested_at, opened_at, dismissed_at, fewer_at
     FROM alert_log
     WHERE user_id = $1 AND ($2::int IS NULL OR id < $2)
     ORDER BY id DESC LIMIT $3`,
    [userId, beforeId, lim],
  );
  return { alerts: rows, next: rows.length === lim ? rows[rows.length - 1].id : null };
}

/** "Fewer like this" on one alert. */
async function fewerLikeThis(userId, alertId) {
  await ensureSchema();
  const { rows } = await pool.query('SELECT * FROM alert_log WHERE id = $1 AND user_id = $2', [alertId, userId]);
  if (!rows[0]) throw Object.assign(new Error('alert not found'), { statusCode: 404 });
  const prefs = await dispatcher.loadPrefs(userId);
  const { prefsPatch, message } = policy.fewerLikeThis(prefs, rows[0]);
  const updated = Object.keys(prefsPatch).length ? await updatePrefs(userId, prefsPatch) : prefs;
  await pool.query('UPDATE alert_log SET fewer_at = now() WHERE id = $1', [alertId]);
  return { prefs: updated, message };
}

const EVENT_COLUMNS = { opened: 'opened_at', dismissed: 'dismissed_at' };

/** Taps reported by the service worker, which has no login, so the ids are signed. */
async function recordEvent({ ids, t, event }) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every(Number.isInteger)) {
    throw Object.assign(new Error('bad ids'), { statusCode: 400 });
  }
  if (!verifyAlertIds(ids, t)) throw Object.assign(new Error('bad token'), { statusCode: 403 });
  await ensureSchema();
  if (event === 'fewer') {
    if (ids.length !== 1) return { ok: true };
    const { rows } = await pool.query('SELECT user_id FROM alert_log WHERE id = $1', [ids[0]]);
    if (!rows[0]) return { ok: true };
    const res = await fewerLikeThis(rows[0].user_id, ids[0]);
    return { ok: true, message: res.message };
  }
  const col = EVENT_COLUMNS[event];
  if (!col) throw Object.assign(new Error('bad event'), { statusCode: 400 });
  await pool.query(`UPDATE alert_log SET ${col} = COALESCE(${col}, now()) WHERE id = ANY($1::int[])`, [ids]);
  return { ok: true };
}

/** Where a test push should open: the shopper's latest watched item, else Home. */
async function testTarget(userId) {
  try {
    // eslint-disable-next-line global-require
    const [w] = await require('../watches').listWatches(userId);
    if (w) return itemUrl({ store_key: w.storeKey, item_id: w.itemId });
  } catch (err) {
    // watches not available yet
  }
  return '/home';
}

async function sendTest(userId, { url } = {}) {
  await ensureSchema();
  if (!push.isConfigured()) return { configured: false, devices: 0, delivered: 0 };
  const target = typeof url === 'string' && /^\/[^/\\]/.test(url) ? url : await testTarget(userId);
  const { rows } = await pool.query(
    `INSERT INTO alert_log (user_id, alert_type, title, body, url, status, reason)
     VALUES ($1, 'test', 'Muse alerts are on', 'Tap to open Muse', $2, 'pending', 'test') RETURNING id`,
    [userId, target],
  );
  const id = rows[0].id;
  const res = await push.sendToUser(userId, {
    title: 'Muse alerts are on',
    body: 'This is a test. Tap to open Muse.',
    url: target,
    tag: `alert-${id}`,
    ids: [id],
    t: signAlertIds([id]),
  });
  await pool.query(
    `UPDATE alert_log SET status = $2, sent_at = CASE WHEN $2 = 'sent' THEN now() END WHERE id = $1`,
    [id, res.delivered > 0 ? 'sent' : 'no_device'],
  );
  return { ...res, url: target };
}

async function status(userId) {
  await ensureSchema();
  return {
    configured: push.isConfigured(),
    publicKey: push.publicKey(),
    devices: await push.countDevices(userId),
  };
}

async function subscribe(userId, sub, userAgent) {
  await ensureSchema();
  await push.saveSubscription(userId, sub, userAgent);
  logger.info(`Push: device saved for user ${userId}`);
  return status(userId);
}

async function unsubscribe(userId, endpoint) {
  await ensureSchema();
  await push.removeSubscription(userId, endpoint);
  return status(userId);
}

module.exports = {
  getPrefs,
  updatePrefs,
  listAlerts,
  fewerLikeThis,
  recordEvent,
  sendTest,
  status,
  subscribe,
  unsubscribe,
  dispatchPending: dispatcher.dispatchPending,
  runAll: dispatcher.runAll,
  publicKey: push.publicKey,
  isConfigured: push.isConfigured,
};
